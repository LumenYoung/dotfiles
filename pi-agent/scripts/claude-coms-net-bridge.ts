#!/usr/bin/env bun
/**
 * claude-coms-net-bridge — expose Claude Code as a coms-net peer.
 *
 * Run on a machine where `claude` is installed and logged in:
 *   cd ~/.pi/agent/scripts && bun install
 *   PI_COMS_NET_PROJECT=dotfiles bun claude-coms-net-bridge.ts --name claude
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const COMS_NET_DIR = path.join(os.homedir(), ".pi", "coms-net");
const DEFAULT_PROJECT = process.env.PI_COMS_NET_PROJECT ?? "default";
const DEFAULT_STATE_PATH = path.join(COMS_NET_DIR, "claude-bridge-state.json");
const HTTP_TIMEOUT_MS = Number(process.env.CLAUDE_COMS_HTTP_TIMEOUT_MS ?? 10_000);
const HEARTBEAT_FALLBACK_MS = Number(process.env.PI_COMS_NET_HEARTBEAT_MS ?? 10_000);
const RECONNECT_BASE_MS = 500;
const RECONNECT_MAX_MS = 10_000;

type AgentStatus = "online" | "stale" | "offline";

type RegisterResponse = {
	ok: true;
	agent: AgentCard;
	heartbeat_interval_ms: number;
	sse_url: string;
};

type AgentCard = {
	session_id: string;
	name: string;
	purpose: string;
	model: string;
	provider?: string;
	color: string;
	cwd: string;
	project: string;
	explicit: boolean;
	started_at: string;
	context_used_pct: number;
	queue_depth: number;
	status: AgentStatus;
};

type BridgeState = {
	session_id: string;
	conversations: Record<string, string>;
};

type InboundPrompt = {
	msg_id: string;
	project: string;
	sender?: { session_id?: string; name?: string; cwd?: string };
	prompt: string;
	conversation_id?: string | null;
	response_schema?: object | null;
	hops?: number;
};

type CliOptions = {
	name: string;
	project: string;
	purpose: string;
	model: string;
	cwd: string;
	color: string;
	explicit: boolean;
	serverUrl?: string;
	authToken?: string;
	statePath: string;
	permissionMode: "default" | "acceptEdits" | "bypassPermissions" | "plan" | "dontAsk" | "auto";
	maxTurns?: number;
	resume: boolean;
	debug: boolean;
};

function usage(): never {
	console.log(`Usage: bun claude-coms-net-bridge.ts [options]

Expose Claude Code as a coms-net peer. Requires Claude Code to be installed and logged in.

Options:
  --name <name>              Peer name (default: env CLAUDE_COMS_NAME or claude)
  --project <project>        coms-net project (default: env PI_COMS_NET_PROJECT or default)
  --purpose <text>           Peer purpose shown to Pi agents
  --model <model>            Claude model/alias (default: env CLAUDE_COMS_MODEL or sonnet)
  --cwd <path>               Working directory for Claude turns (default: cwd)
  --color <hex>              Widget color (default: #C792EA)
  --server-url <url>         coms-net hub URL (or PI_COMS_NET_SERVER_URL / local server.json)
  --auth-token <token>       coms-net bearer token (or PI_COMS_NET_AUTH_TOKEN / server.secret.json)
  --state-path <path>        Persisted bridge state/session map
  --permission-mode <mode>   Claude permission mode (default: CLAUDE_COMS_PERMISSION_MODE or default)
  --max-turns <n>            Max Claude turns per inbound prompt
  --no-resume                Do not resume Claude sessions per sender/conversation
  --explicit                 Mark peer as explicit (hidden unless include_explicit=true)
  --debug                    Verbose logs
  -h, --help                 Show this help

Examples:
  bun claude-coms-net-bridge.ts --name claude --project dotfiles
  PI_COMS_NET_SERVER_URL=http://host:52965 PI_COMS_NET_AUTH_TOKEN=... bun claude-coms-net-bridge.ts
`);
	process.exit(0);
}

function parseArgs(argv: string[]): CliOptions {
	const out: CliOptions = {
		name: process.env.CLAUDE_COMS_NAME ?? "claude",
		project: DEFAULT_PROJECT,
		purpose: process.env.CLAUDE_COMS_PURPOSE ?? "Claude Code bridge peer",
		model: process.env.CLAUDE_COMS_MODEL ?? "sonnet",
		cwd: process.env.CLAUDE_COMS_CWD ?? process.cwd(),
		color: process.env.CLAUDE_COMS_COLOR ?? "#C792EA",
		explicit: process.env.CLAUDE_COMS_EXPLICIT === "1",
		serverUrl: process.env.PI_COMS_NET_SERVER_URL,
		authToken: process.env.PI_COMS_NET_AUTH_TOKEN,
		statePath: process.env.CLAUDE_COMS_STATE_PATH ?? DEFAULT_STATE_PATH,
		permissionMode: (process.env.CLAUDE_COMS_PERMISSION_MODE as CliOptions["permissionMode"]) ?? "default",
		maxTurns: process.env.CLAUDE_COMS_MAX_TURNS ? Number(process.env.CLAUDE_COMS_MAX_TURNS) : undefined,
		resume: process.env.CLAUDE_COMS_RESUME !== "0",
		debug: process.env.CLAUDE_COMS_DEBUG === "1",
	};
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		const next = () => {
			const v = argv[++i];
			if (!v) throw new Error(`missing value for ${a}`);
			return v;
		};
		switch (a) {
			case "--name": out.name = next(); break;
			case "--project": out.project = next(); break;
			case "--purpose": out.purpose = next(); break;
			case "--model": out.model = next(); break;
			case "--cwd": out.cwd = path.resolve(next()); break;
			case "--color": out.color = next(); break;
			case "--server-url": out.serverUrl = next(); break;
			case "--auth-token": out.authToken = next(); break;
			case "--state-path": out.statePath = path.resolve(next()); break;
			case "--permission-mode": out.permissionMode = next() as CliOptions["permissionMode"]; break;
			case "--max-turns": out.maxTurns = Number(next()); break;
			case "--no-resume": out.resume = false; break;
			case "--explicit": out.explicit = true; break;
			case "--debug": out.debug = true; break;
			case "-h":
			case "--help": usage();
			default: throw new Error(`unknown option: ${a}`);
		}
	}
	return out;
}

function readJson<T>(file: string): T | null {
	try { return JSON.parse(fs.readFileSync(file, "utf8")) as T; } catch { return null; }
}

function writeJsonAtomic(file: string, data: unknown, mode?: number): void {
	fs.mkdirSync(path.dirname(file), { recursive: true });
	const tmp = `${file}.tmp-${process.pid}`;
	fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
	if (mode !== undefined) fs.chmodSync(tmp, mode);
	fs.renameSync(tmp, file);
}

function loadState(file: string): BridgeState {
	const state = readJson<BridgeState>(file);
	if (state?.session_id && state.conversations && typeof state.conversations === "object") return state;
	return { session_id: crypto.randomUUID(), conversations: {} };
}

function discoverServer(project: string): { serverUrl?: string; authToken?: string } {
	const projectDir = path.join(COMS_NET_DIR, "projects", project);
	const server = readJson<{ url?: string; server_url?: string }>(path.join(projectDir, "server.json"));
	const secret = readJson<{ token?: string; auth_token?: string }>(path.join(projectDir, "server.secret.json"));
	return {
		serverUrl: server?.url ?? server?.server_url,
		authToken: secret?.token ?? secret?.auth_token,
	};
}

function sleep(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)); }
function nowIso(): string { return new Date().toISOString(); }
function log(msg: string): void { console.log(`${nowIso()} ${msg}`); }

class HttpError extends Error {
	constructor(public status: number, public body: any, message: string) { super(message); }
}

function makeHttp(serverUrl: string, authToken: string) {
	return async function http(method: string, pathOrUrl: string, body?: any, opts?: { signal?: AbortSignal; timeoutMs?: number }): Promise<any> {
		const ac = opts?.signal ? null : new AbortController();
		const timer = ac ? setTimeout(() => ac.abort(), opts?.timeoutMs ?? HTTP_TIMEOUT_MS) : null;
		const url = pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://") ? pathOrUrl : serverUrl + pathOrUrl;
		try {
			const resp = await fetch(url, {
				method,
				signal: opts?.signal ?? ac!.signal,
				headers: {
					"authorization": `Bearer ${authToken}`,
					"content-type": "application/json",
				},
				body: body === undefined ? undefined : JSON.stringify(body),
			});
			const text = await resp.text();
			let parsed: any = text;
			try { parsed = text ? JSON.parse(text) : null; } catch { /* keep text */ }
			if (!resp.ok) throw new HttpError(resp.status, parsed, `HTTP ${resp.status} ${method} ${pathOrUrl}`);
			return parsed;
		} finally {
			if (timer) clearTimeout(timer);
		}
	};
}

async function* parseSse(resp: Response): AsyncGenerator<{ event: string; data: any; id?: string }> {
	if (!resp.body) return;
	const reader = resp.body.getReader();
	const dec = new TextDecoder();
	let buf = "";
	while (true) {
		const { value, done } = await reader.read();
		if (done) break;
		buf += dec.decode(value, { stream: true });
		let idx: number;
		while ((idx = buf.indexOf("\n\n")) >= 0) {
			const raw = buf.slice(0, idx);
			buf = buf.slice(idx + 2);
			let event = "message";
			let id: string | undefined;
			const dataLines: string[] = [];
			for (const line of raw.split(/\r?\n/)) {
				if (line.startsWith("event:")) event = line.slice(6).trim();
				else if (line.startsWith("id:")) id = line.slice(3).trim();
				else if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
			}
			if (dataLines.length === 0) continue;
			const dataText = dataLines.join("\n");
			let data: any = dataText;
			try { data = JSON.parse(dataText); } catch { /* keep text */ }
			yield { event, data, id };
		}
	}
}

function conversationKey(inbound: InboundPrompt): string {
	return inbound.conversation_id || inbound.sender?.session_id || inbound.sender?.name || "default";
}

function textFromContent(content: any): string {
	if (typeof content === "string") return content;
	if (Array.isArray(content)) {
		return content.map((c) => {
			if (typeof c === "string") return c;
			if (c?.type === "text" && typeof c.text === "string") return c.text;
			return "";
		}).filter(Boolean).join("\n");
	}
	return "";
}

function extractAssistantText(msg: any): string {
	if (msg?.type !== "assistant") return "";
	return textFromContent(msg.message?.content ?? msg.content);
}

async function askClaude(inbound: InboundPrompt, opts: CliOptions, state: BridgeState, serverUrl: string, authToken: string): Promise<{ response: any; error: string | null }> {
	const key = conversationKey(inbound);
	const resumeId = opts.resume ? state.conversations[key] : undefined;
	let lastText = "";
	let seenSessionId: string | undefined;

	const schemaInstruction = inbound.response_schema && typeof inbound.response_schema === "object"
		? `\n\nThe caller requested structured output. Reply with ONLY valid JSON matching this JSON Schema:\n${JSON.stringify(inbound.response_schema)}`
		: "";
	const prompt = `[from Pi coms-net peer ${inbound.sender?.name ?? inbound.sender?.session_id ?? "unknown"}]
${inbound.prompt}${schemaInstruction}`;

	const q = query({
		prompt,
		options: {
			cwd: opts.cwd,
			stderr: (data: string) => {
				if (opts.debug) process.stderr.write(data);
			},
			env: {
				...process.env,
				CLAUDE_COMS_STATE_PATH: opts.statePath,
				PI_COMS_NET_PROJECT: opts.project,
				PI_COMS_NET_SERVER_URL: serverUrl,
				PI_COMS_NET_AUTH_TOKEN: authToken,
			},
			model: opts.model,
			permissionMode: opts.permissionMode,
			maxTurns: opts.maxTurns,
			resume: resumeId,
		},
	});

	for await (const msg of q as any) {
		if (opts.debug) console.error("claude-sdk", JSON.stringify({ type: msg?.type, subtype: msg?.subtype, session_id: msg?.session_id }).slice(0, 500));
		if (typeof msg?.session_id === "string") seenSessionId = msg.session_id;
		const text = extractAssistantText(msg);
		if (text) lastText = text;
	}

	if (seenSessionId && opts.resume) {
		state.conversations[key] = seenSessionId;
		writeJsonAtomic(opts.statePath, state, 0o600);
	}

	if (!lastText) return { response: null, error: "Claude produced no assistant text" };
	if (inbound.response_schema && typeof inbound.response_schema === "object") {
		try { return { response: JSON.parse(lastText), error: null }; }
		catch { return { response: null, error: "response not valid JSON" }; }
	}
	return { response: lastText, error: null };
}

async function main(): Promise<void> {
	const opts = parseArgs(process.argv.slice(2));
	const discovered = discoverServer(opts.project);
	const serverUrl = (opts.serverUrl ?? discovered.serverUrl)?.replace(/\/$/, "");
	const authToken = opts.authToken ?? discovered.authToken;
	if (!serverUrl) throw new Error(`No coms-net server URL. Start server or set PI_COMS_NET_SERVER_URL (project: ${opts.project}).`);
	if (!authToken) throw new Error(`No coms-net auth token. Set PI_COMS_NET_AUTH_TOKEN or use local server.secret.json (project: ${opts.project}).`);
	const hubUrl = serverUrl;
	const hubToken = authToken;
	if (!fs.existsSync(opts.cwd)) throw new Error(`cwd does not exist: ${opts.cwd}`);

	const state = loadState(opts.statePath);
	writeJsonAtomic(opts.statePath, state, 0o600);
	const http = makeHttp(hubUrl, hubToken);
	let registeredName = opts.name;
	let sseUrl = "";
	let heartbeatMs = HEARTBEAT_FALLBACK_MS;
	let queueDepth = 0;
	let stopped = false;
	let chain = Promise.resolve();

	async function register(): Promise<void> {
		const resp = await http("POST", "/v1/agents/register", {
			project: opts.project,
			session_id: state.session_id,
			name: opts.name,
			purpose: opts.purpose,
			model: opts.model,
			provider: "claude-code",
			color: opts.color,
			cwd: opts.cwd,
			explicit: opts.explicit,
		}) as RegisterResponse;
		registeredName = resp.agent.name;
		sseUrl = resp.sse_url;
		heartbeatMs = resp.heartbeat_interval_ms || HEARTBEAT_FALLBACK_MS;
		log(`registered ${registeredName}@${opts.project} (${state.session_id}) via ${hubUrl}`);
	}

	async function heartbeatLoop(): Promise<void> {
		while (!stopped) {
			try {
				await http("POST", `/v1/agents/${encodeURIComponent(state.session_id)}/heartbeat`, {
					project: opts.project,
					context_used_pct: 0,
					queue_depth: queueDepth,
					model: opts.model,
					status: "online",
				}, { timeoutMs: 5_000 });
			} catch (e: any) {
				console.error(`${nowIso()} heartbeat failed: ${e?.message ?? e}`);
			}
			await sleep(heartbeatMs);
		}
	}

	async function respondToPrompt(inbound: InboundPrompt): Promise<void> {
		queueDepth++;
		log(`prompt ${inbound.msg_id} from ${inbound.sender?.name ?? inbound.sender?.session_id ?? "unknown"}`);
		try {
			const result = await askClaude(inbound, opts, state, hubUrl, hubToken);
			await http("POST", `/v1/messages/${encodeURIComponent(inbound.msg_id)}/response`, {
				project: opts.project,
				responder_session: state.session_id,
				response: result.response,
				error: result.error,
			});
			log(`response ${inbound.msg_id}${result.error ? ` error=${result.error}` : ""}`);
		} catch (e: any) {
			const err = e?.message ?? String(e);
			console.error(`${nowIso()} prompt ${inbound.msg_id} failed: ${err}`);
			try {
				await http("POST", `/v1/messages/${encodeURIComponent(inbound.msg_id)}/response`, {
					project: opts.project,
					responder_session: state.session_id,
					response: null,
					error: err,
				});
			} catch (submitErr: any) {
				console.error(`${nowIso()} failed to submit error response: ${submitErr?.message ?? submitErr}`);
			}
		} finally {
			queueDepth--;
		}
	}

	async function sseLoop(): Promise<void> {
		let attempts = 0;
		while (!stopped) {
			try {
				const resp = await fetch(hubUrl + sseUrl, {
					headers: { authorization: `Bearer ${hubToken}` },
				});
				if (!resp.ok) throw new Error(`SSE HTTP ${resp.status}: ${await resp.text()}`);
				attempts = 0;
				log(`sse connected as ${registeredName}`);
				for await (const evt of parseSse(resp)) {
					if (evt.event === "prompt") {
						const inbound = evt.data as InboundPrompt;
						chain = chain.then(() => respondToPrompt(inbound));
					} else if (opts.debug && evt.event !== "heartbeat") {
						console.error("sse", evt.event, JSON.stringify(evt.data).slice(0, 500));
					}
				}
				throw new Error("SSE stream ended");
			} catch (e: any) {
				if (stopped) return;
				console.error(`${nowIso()} sse disconnected: ${e?.message ?? e}`);
				const backoff = Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** attempts++);
				await sleep(backoff);
				try { await register(); } catch (regErr: any) { console.error(`${nowIso()} re-register failed: ${regErr?.message ?? regErr}`); }
			}
		}
	}

	async function shutdown(signal: string): Promise<void> {
		if (stopped) return;
		stopped = true;
		log(`${signal} received, shutting down`);
		try { await chain; } catch { /* already logged */ }
		try { await http("DELETE", `/v1/agents/${encodeURIComponent(state.session_id)}?project=${encodeURIComponent(opts.project)}`); } catch { /* best effort */ }
		process.exit(0);
	}
	process.on("SIGINT", () => void shutdown("SIGINT"));
	process.on("SIGTERM", () => void shutdown("SIGTERM"));

	await register();
	void heartbeatLoop();
	await sseLoop();
}

main().catch((e) => {
	console.error(`claude-coms-net-bridge: ${e?.stack ?? e}`);
	process.exit(1);
});
