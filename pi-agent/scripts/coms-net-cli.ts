#!/usr/bin/env bun
/** Minimal coms-net CLI for agents/skills. */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const COMS_NET_DIR = path.join(os.homedir(), ".pi", "coms-net");
const DEFAULT_PROJECT = process.env.PI_COMS_NET_PROJECT ?? "default";
const DEFAULT_STATE_PATH = path.join(COMS_NET_DIR, "claude-bridge-state.json");
const HTTP_TIMEOUT_MS = Number(process.env.COMS_NET_CLI_HTTP_TIMEOUT_MS ?? 10_000);
const DEFAULT_AWAIT_TIMEOUT_MS = Number(process.env.COMS_NET_CLI_AWAIT_TIMEOUT_MS ?? 1_800_000);

type Args = { _: string[]; [key: string]: string | boolean | string[] };

function usage(): never {
	console.log(`Usage: bun coms-net-cli.ts <command> [options]

Commands:
  list                         List peers
  send --target NAME --prompt TEXT [--await]
  await --msg-id ID            Await a response
  get --msg-id ID              Poll a response

Common options:
  --project NAME               coms-net project (default: env PI_COMS_NET_PROJECT or default)
  --server-url URL             hub URL (or PI_COMS_NET_SERVER_URL / local server.json)
  --auth-token TOKEN           bearer token (or PI_COMS_NET_AUTH_TOKEN / server.secret.json)
  --state-path PATH            sender state path (default: CLAUDE_COMS_STATE_PATH or bridge default)
  --sender-session ID          override sender session id
  --json                       raw JSON output

Examples:
  bun coms-net-cli.ts list
  bun coms-net-cli.ts send --target claude-b --prompt "Review this plan" --await
`);
	process.exit(0);
}

function parse(argv: string[]): Args {
	const out: Args = { _: [] };
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (!a.startsWith("--")) { out._.push(a); continue; }
		const k = a.slice(2);
		if (["await", "json"].includes(k)) out[k] = true;
		else {
			const v = argv[++i];
			if (!v) throw new Error(`missing value for ${a}`);
			out[k] = v;
		}
	}
	return out;
}

function readJson<T>(file: string): T | null {
	try { return JSON.parse(fs.readFileSync(file, "utf8")) as T; } catch { return null; }
}

function discover(project: string): { serverUrl?: string; authToken?: string } {
	const projectDir = path.join(COMS_NET_DIR, "projects", project);
	const server = readJson<{ url?: string; server_url?: string }>(path.join(projectDir, "server.json"));
	const secret = readJson<{ token?: string; auth_token?: string }>(path.join(projectDir, "server.secret.json"));
	return { serverUrl: server?.url ?? server?.server_url, authToken: secret?.token ?? secret?.auth_token };
}

function makeHttp(serverUrl: string, authToken: string) {
	return async function http(method: string, urlPath: string, body?: unknown, timeoutMs = HTTP_TIMEOUT_MS): Promise<any> {
		const ac = new AbortController();
		const timer = setTimeout(() => ac.abort(), timeoutMs);
		try {
			const resp = await fetch(serverUrl + urlPath, {
				method,
				signal: ac.signal,
				headers: { authorization: `Bearer ${authToken}`, "content-type": "application/json" },
				body: body === undefined ? undefined : JSON.stringify(body),
			});
			const text = await resp.text();
			let parsed: any = text;
			try { parsed = text ? JSON.parse(text) : null; } catch {}
			if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${typeof parsed === "string" ? parsed : JSON.stringify(parsed)}`);
			return parsed;
		} finally { clearTimeout(timer); }
	};
}

function textOrJson(data: any, rawJson: boolean): void {
	if (rawJson) console.log(JSON.stringify(data, null, 2));
	else if (typeof data === "string") console.log(data);
	else console.log(JSON.stringify(data, null, 2));
}

async function main() {
	const args = parse(process.argv.slice(2));
	if (args._.length === 0 || args.help) usage();
	const cmd = args._[0];
	const project = String(args.project ?? DEFAULT_PROJECT);
	const statePath = String(args["state-path"] ?? process.env.CLAUDE_COMS_STATE_PATH ?? DEFAULT_STATE_PATH);
	const discovered = discover(project);
	const serverUrl = String(args["server-url"] ?? process.env.PI_COMS_NET_SERVER_URL ?? discovered.serverUrl ?? "").replace(/\/$/, "");
	const authToken = String(args["auth-token"] ?? process.env.PI_COMS_NET_AUTH_TOKEN ?? discovered.authToken ?? "");
	if (!serverUrl) throw new Error("missing coms-net server URL");
	if (!authToken) throw new Error("missing coms-net auth token");
	const http = makeHttp(serverUrl, authToken);
	const rawJson = args.json === true;

	if (cmd === "list") {
		const resp = await http("GET", `/v1/agents?project=${encodeURIComponent(project)}`);
		if (rawJson) return textOrJson(resp, true);
		const agents = (resp.agents ?? []).filter((a: any) => a.status !== "offline");
		for (const a of agents) console.log(`${a.name}\t${a.model}\t${a.status}\t${a.cwd}`);
		return;
	}

	if (cmd === "send") {
		const target = String(args.target ?? "");
		const prompt = String(args.prompt ?? "");
		if (!target) throw new Error("send requires --target");
		if (!prompt) throw new Error("send requires --prompt");
		const state = readJson<{ session_id?: string }>(statePath);
		const sender = String(args["sender-session"] ?? state?.session_id ?? "");
		if (!sender) throw new Error(`missing sender session id; pass --sender-session or state file ${statePath}`);
		const resp = await http("POST", "/v1/messages", {
			project,
			sender_session: sender,
			target,
			target_session: null,
			prompt,
			conversation_id: args["conversation-id"] ?? null,
			response_schema: null,
			hops: Number(args.hops ?? 0),
		});
		if (args.await === true) {
			const awaited = await http("GET", `/v1/messages/${encodeURIComponent(resp.msg_id)}/await?timeout_ms=${Number(args.timeout ?? DEFAULT_AWAIT_TIMEOUT_MS)}`, undefined, Number(args.timeout ?? DEFAULT_AWAIT_TIMEOUT_MS) + 5_000);
			return textOrJson(awaited.response ?? awaited, rawJson);
		}
		return textOrJson(resp, true);
	}

	if (cmd === "await" || cmd === "get") {
		const msgId = String(args["msg-id"] ?? args.msg_id ?? "");
		if (!msgId) throw new Error(`${cmd} requires --msg-id`);
		const suffix = cmd === "await" ? `/await?timeout_ms=${Number(args.timeout ?? DEFAULT_AWAIT_TIMEOUT_MS)}` : "";
		const resp = await http("GET", `/v1/messages/${encodeURIComponent(msgId)}${suffix}`, undefined, cmd === "await" ? Number(args.timeout ?? DEFAULT_AWAIT_TIMEOUT_MS) + 5_000 : HTTP_TIMEOUT_MS);
		return textOrJson(resp.response ?? resp, rawJson);
	}

	throw new Error(`unknown command: ${cmd}`);
}

main().catch((e) => { console.error(`coms-net-cli: ${e?.message ?? e}`); process.exit(1); });
