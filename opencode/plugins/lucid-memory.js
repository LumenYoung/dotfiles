import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const AGENT_NAME = "opencode";
const DEFAULT_MCP_URL = "https://lucid.lumeny.io/mcp";
const DEFAULT_GROUP = "work";
const MAX_CAPTURE_CHARS = 1600;
const MAX_PROMPT_CHARS = 1200;
const MAX_FINDINGS = 8;
const MAX_FILES = 8;
const MAX_CONTEXT_ITEMS = 4;
const COOLDOWN_MS = 30_000;

const MODIFY_TOOL_PATTERNS = [
  /^(write|edit|multi_?edit|create|patch|insert|delete|move|rename|mkdir|touch|apply_?patch)$/i,
];
const READ_TOOL_PATTERNS = [
  /^(read|read_?file|view|cat|list_?dir|ls)$/i,
];
const SEARCH_TOOL_PATTERNS = [
  /^(search|grep|ripgrep|rg|glob|find|find_?by_?name)$/i,
];
const COMMAND_TOOL_PATTERNS = [
  /^(bash|shell|terminal|command|run)$/i,
];
const MEMORY_TOOL_PATTERNS = [
  /^(memorix|cortex[-_]?memory|graphiti|lucid|mcp_lucid|mcp_graphiti)/i,
];
const ERROR_PATTERNS = [
  /\berror\b/i,
  /\bfailed\b/i,
  /\bpanic\b/i,
  /\bexception\b/i,
  /\btraceback\b/i,
  /\btimed out\b/i,
  /\bunauthorized\b/i,
  /\bpermission denied\b/i,
];
const DECISION_PATTERNS = [
  /\bconfirmed\b/i,
  /\broot cause\b/i,
  /\bfix(?:ed)?\b/i,
  /\bmissing\b/i,
  /\bnot found\b/i,
  /\bdoes not exist\b/i,
  /\bunsupported\b/i,
  /\bdeprecated\b/i,
  /\binvalid\b/i,
  /\bmismatch\b/i,
  /\bregression\b/i,
  /\bconfigured\b/i,
  /\bpoints? to\b/i,
  /\bresolved\b/i,
  /\bblocked\b/i,
  /\brequires\b/i,
];
const GENERIC_SUCCESS_PATTERNS = [
  /^done$/i,
  /^ok$/i,
  /^success$/i,
  /^completed successfully$/i,
  /^file (written|updated|saved|created) successfully$/i,
];
const TRIVIAL_COMMAND_PATTERNS = [
  /^(ls|dir|pwd|cd|echo|cat|head|tail|wc|which|where|whoami)(\s|$)/i,
  /^(git\s+(status|log|diff|show|branch|remote|stash\s+list))(\s|$)/i,
  /^(npm\s+(list|ls|view|info|outdated))(\s|$)/i,
  /^(pnpm\s+(list|ls|why))(\s|$)/i,
  /^(python\s+--?version|node\s+--?version|pip\s+(list|show|freeze))(\s|$)/i,
  /^(env|printenv|set|export)(\s|$)/i,
];
const STATEFUL_COMMAND_PATTERNS = [
  /^git\s+(commit|merge|rebase|cherry-pick|apply|am)(\s|$)/i,
  /^(npm|pnpm|yarn)\s+(install|add|remove|rm|update|upgrade|run\s+(build|test|lint|typecheck)|test|build|lint)(\s|$)/i,
  /^cargo\s+(build|test|fmt|clippy|add|rm|update)(\s|$)/i,
  /^(pytest|go\s+test|go\s+build|make(\s|$)|uv\s+run|uv\s+pip\s+install|pip\s+install)(\s|$)/i,
  /^docker\s+compose\s+(up|restart|down|build|pull)(\s|$)/i,
  /^(systemctl|service)\s+.+\s+(start|stop|restart)(\s|$)/i,
];
const STORAGE_POLICY = {
  modify: { store: "always", minLength: 50 },
  command: { store: "always", minLength: 50 },
  read: { store: "never", minLength: 0 },
  search: { store: "if_structured", minLength: 80 },
  memory: { store: "never", minLength: 0 },
  unknown: { store: "if_structured", minLength: 100 },
};
const MEMORY_POLICY_LINES = [
  "OpenCode already automates startup retrieval, prompt retrieval, filtered command and tool capture, pre-compact checkpoints, and session-end handoff writes, so you do not need to trigger those manually unless extra retrieval or a deliberate write is needed.",
  "Unless you intentionally need a different hard partition, rely on the service default write group and do not invent repo-specific or session-specific group ids.",
];

let lucidClientPromise = null;
let warnedLucidConfig = false;

function collapseWhitespace(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function truncate(value, maxChars) {
  const normalized = collapseWhitespace(value);
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, maxChars - 1)}...`;
}

function basename(value) {
  const normalized = String(value ?? "").replace(/\\/g, "/").replace(/\/+$/, "");
  const parts = normalized.split("/");
  return parts[parts.length - 1] || "workspace";
}

function parseGroupList(value) {
  const items = String(value ?? "")
    .split(/[,\s]+/)
    .map((item) => collapseWhitespace(item))
    .filter(Boolean);
  return [...new Set(items)];
}

function getWriteGroupOverride() {
  const configured = collapseWhitespace(Bun.env.LUCID_MEMORY_WRITE_GROUP);
  return configured || null;
}

function getReadGroups() {
  const configured = parseGroupList(Bun.env.LUCID_MEMORY_READ_GROUPS);
  return configured.length > 0 ? configured : [DEFAULT_GROUP];
}

function extractTextParts(parts) {
  if (!Array.isArray(parts)) return "";
  return parts
    .filter((part) => part && !part.ignored)
    .map((part) => {
      if (part.type === "text") return part.text ?? "";
      if (part.type === "subtask") return part.prompt ?? part.description ?? "";
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function stringifyValue(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function newSessionState(sessionID) {
  return {
    sessionID,
    started: false,
    ended: false,
    lastPrompt: "",
    startupContext: [],
    promptContext: [],
    changedFiles: [],
    findings: [],
    cooldowns: new Map(),
  };
}

function pushUnique(items, value, maxItems) {
  if (!value) return items;
  const next = items.filter((item) => item !== value);
  next.unshift(value);
  return next.slice(0, maxItems);
}

function rememberFile(state, filePath) {
  const normalized = collapseWhitespace(filePath);
  if (!normalized) return;
  state.changedFiles = pushUnique(state.changedFiles, normalized, MAX_FILES);
}

function rememberFinding(state, finding) {
  const normalized = truncate(finding, 220);
  if (!normalized) return;
  state.findings = pushUnique(state.findings, normalized, MAX_FINDINGS);
}

function inCooldown(state, key) {
  const last = state.cooldowns.get(key);
  return Boolean(last) && Date.now() - last < COOLDOWN_MS;
}

function markCooldown(state, key) {
  state.cooldowns.set(key, Date.now());
}

function toolMatches(patterns, toolName) {
  return patterns.some((pattern) => pattern.test(toolName));
}

function extractRealCommand(command) {
  return String(command ?? "").replace(/^cd\s+\S+\s*&&\s*/i, "").trim();
}

function extractCommand(toolName, args) {
  if (typeof args?.command === "string") return extractRealCommand(args.command);
  if (typeof args?.cmd === "string") return extractRealCommand(args.cmd);
  if (typeof args?.script === "string" && COMMAND_TOOL_PATTERNS.some((pattern) => pattern.test(toolName))) {
    return extractRealCommand(args.script);
  }
  return "";
}

function extractPrimaryFile(args) {
  const candidates = [
    args?.file_path,
    args?.filePath,
    args?.path,
    args?.target,
    args?.old_path,
    args?.new_path,
  ];
  for (const candidate of candidates) {
    const normalized = collapseWhitespace(candidate);
    if (normalized) return normalized;
  }
  return "";
}

function summarizeEdit(args) {
  const oldString = truncate(args?.old_string || args?.oldString || "", 180);
  const newString = truncate(args?.new_string || args?.newString || "", 180);
  if (!oldString && !newString) return "";
  if (oldString && newString) return `Edit: ${oldString} -> ${newString}`;
  return `Edit: ${newString || oldString}`;
}

function toolCategory(toolName, args) {
  if (toolMatches(MEMORY_TOOL_PATTERNS, toolName)) return "memory";
  if (toolMatches(MODIFY_TOOL_PATTERNS, toolName)) return "modify";
  if (toolMatches(READ_TOOL_PATTERNS, toolName)) return "read";
  if (toolMatches(SEARCH_TOOL_PATTERNS, toolName)) return "search";
  if (toolMatches(COMMAND_TOOL_PATTERNS, toolName) || extractCommand(toolName, args)) return "command";
  return "unknown";
}

function isTrivialCommand(command) {
  return TRIVIAL_COMMAND_PATTERNS.some((pattern) => pattern.test(command));
}

function isStatefulCommand(command) {
  return STATEFUL_COMMAND_PATTERNS.some((pattern) => pattern.test(command));
}

function hasErrorSignal(text) {
  return ERROR_PATTERNS.some((pattern) => pattern.test(text));
}

function countMatches(patterns, text) {
  return patterns.reduce((count, pattern) => (pattern.test(text) ? count + 1 : count), 0);
}

function isGenericSuccess(text) {
  const normalized = collapseWhitespace(text);
  return GENERIC_SUCCESS_PATTERNS.some((pattern) => pattern.test(normalized));
}

function hasStructuredEvidence(capture) {
  return Boolean(
    capture.errorSignal ||
      capture.decisionHits > 0 ||
      capture.filePath ||
      capture.editSummary ||
      (capture.command && isStatefulCommand(capture.command))
  );
}

function shouldCaptureByPolicy(capture) {
  const policy = STORAGE_POLICY[capture.category] ?? STORAGE_POLICY.unknown;
  if (policy.store === "never") return false;
  if (capture.content.length < policy.minLength) return false;

  if (capture.category === "command" && capture.command && isTrivialCommand(capture.command)) {
    return false;
  }

  if (!capture.errorSignal && isGenericSuccess(capture.outputText || capture.title)) {
    return false;
  }

  if (policy.store === "always") {
    if (!capture.errorSignal && !capture.filePath && !capture.editSummary && capture.outputText.length < 40) {
      return false;
    }
    return true;
  }

  return hasStructuredEvidence(capture);
}

function maybeHighValueToolCapture(input, output) {
  const toolName = String(input?.tool ?? "");
  const args = input?.args ?? {};
  const category = toolCategory(toolName, args);
  if (category === "memory") return null;

  const command = extractCommand(toolName, args);
  const filePath = extractPrimaryFile(args);
  const editSummary = summarizeEdit(args);
  const outputText = truncate(output?.output ?? stringifyValue(output?.metadata), MAX_CAPTURE_CHARS);
  const title = truncate(output?.title ?? "", 160);
  const combined = collapseWhitespace([title, outputText, stringifyValue(args)].filter(Boolean).join("\n"));
  const errorSignal = hasErrorSignal(combined);
  const decisionHits = countMatches(DECISION_PATTERNS, combined);
  const lines = [`Tool: ${toolName}`];
  if (command) lines.push(`Command: ${command}`);
  if (filePath) lines.push(`File: ${filePath}`);
  if (editSummary) lines.push(editSummary);
  if (title) lines.push(`Title: ${title}`);
  if (outputText) lines.push(`Result: ${outputText}`);

  const content = truncate(lines.join("\n"), MAX_CAPTURE_CHARS);
  const capture = {
    category,
    command,
    filePath,
    editSummary,
    outputText,
    title,
    combined,
    errorSignal,
    decisionHits,
    content,
  };
  if (!content || !shouldCaptureByPolicy(capture)) return null;

  const cooldownKey = `${toolName}:${filePath || command || title || "general"}`;
  return {
    category,
    content,
    cooldownKey,
    summary: filePath
      ? `${toolName} affected ${filePath}`
      : command
        ? `${toolName} ran ${command}`
        : `${toolName} produced a high-value result`,
    filePath,
    command,
  };
}

function buildCompactCheckpoint(state) {
  const lines = [];
  if (state.lastPrompt) lines.push(`Current task: ${truncate(state.lastPrompt, 280)}`);
  if (state.findings.length > 0) lines.push(`Key findings: ${state.findings.slice(0, 4).join("; ")}`);
  if (state.changedFiles.length > 0) lines.push(`Active files: ${state.changedFiles.slice(0, 6).join(", ")}`);
  if (state.findings.length > 0) lines.push("Next step: continue from the latest findings and complete the active changes.");
  return collapseWhitespace(lines.join(" "));
}

function buildSessionSummary(state) {
  const lines = [];
  if (state.lastPrompt) lines.push(`Goal: ${truncate(state.lastPrompt, 260)}`);
  if (state.findings.length > 0) lines.push(`Important findings: ${state.findings.slice(0, 5).join("; ")}`);
  if (state.changedFiles.length > 0) lines.push(`Files touched: ${state.changedFiles.slice(0, 6).join(", ")}`);
  if (state.promptContext.length > 0) lines.push(`Relevant prior context: ${state.promptContext.slice(0, 2).join("; ")}`);
  if (state.findings.length > 0 || state.changedFiles.length > 0) {
    lines.push("Next step: continue from the latest findings and validate the remaining changes.");
  }
  return collapseWhitespace(lines.join(" "));
}

function parseRepoSlug(url) {
  const normalized = collapseWhitespace(url)
    .replace(/\.git$/i, "")
    .replace(/^git@[^:]+:/i, "")
    .replace(/^https?:\/\/[^/]+\//i, "")
    .replace(/^ssh:\/\/[^/]+\//i, "");
  return normalized.includes("/") ? normalized : "";
}

function readRepoSlug(directory) {
  const result = Bun.spawnSync(["git", "-C", directory, "config", "--get", "remote.origin.url"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  if (result.exitCode !== 0) return "";
  return parseRepoSlug(new TextDecoder().decode(result.stdout));
}

function warnLucid(message) {
  if (warnedLucidConfig) return;
  warnedLucidConfig = true;
  console.warn(`[lucid-memory] ${message}`);
}

async function getLucidClient() {
  if (lucidClientPromise) return lucidClientPromise;

  const url = collapseWhitespace(Bun.env.LUCID_MCP_URL) || DEFAULT_MCP_URL;
  const token = collapseWhitespace(Bun.env.LUCID_API_TOKEN);
  if (!url || !token) {
    warnLucid("missing LUCID_MCP_URL or LUCID_API_TOKEN; Lucid hooks are disabled");
    return null;
  }

  lucidClientPromise = (async () => {
    const client = new Client({ name: "opencode-lucid-memory", version: "1.0.0" });
    client.onerror = (error) => warnLucid(`client error: ${collapseWhitespace(error?.message || error)}`);

    const transport = new StreamableHTTPClientTransport(new URL(url), {
      requestInit: {
        headers: {
          "X-Lucid-Token": token,
        },
      },
    });
    transport.onerror = (error) => {
      lucidClientPromise = null;
      warnLucid(`transport error: ${collapseWhitespace(error?.message || error)}`);
    };

    await client.connect(transport);
    return client;
  })().catch((error) => {
    lucidClientPromise = null;
    warnLucid(`failed to connect: ${collapseWhitespace(error?.message || error)}`);
    return null;
  });

  return lucidClientPromise;
}

function parseToolPayload(result) {
  const textItems = Array.isArray(result?.content)
    ? result.content
        .filter((item) => item?.type === "text" && typeof item.text === "string")
        .map((item) => item.text.trim())
        .filter(Boolean)
    : [];
  if (textItems.length === 0) return null;
  if (textItems.length === 1) {
    try {
      return JSON.parse(textItems[0]);
    } catch {
      return textItems[0];
    }
  }
  return textItems
    .map((item) => {
      try {
        return JSON.parse(item);
      } catch {
        return item;
      }
    })
    .filter(Boolean);
}

async function callLucidTool(name, args) {
  const client = await getLucidClient();
  if (!client) return null;

  try {
    const result = await client.callTool({
      name,
      arguments: args,
    });
    return parseToolPayload(result);
  } catch (error) {
    warnLucid(`tool ${name} failed: ${collapseWhitespace(error?.message || error)}`);
    return null;
  }
}

function summarizeContextItem(item) {
  if (!item || typeof item !== "object") {
    return truncate(stringifyValue(item), 220);
  }

  if (typeof item.fact === "string") return truncate(item.fact, 220);
  if (typeof item.summary === "string" && item.summary) {
    if (typeof item.name === "string" && item.name && item.summary !== item.name) {
      return truncate(`${item.name}: ${item.summary}`, 220);
    }
    return truncate(item.summary, 220);
  }
  if (typeof item.name === "string") return truncate(item.name, 220);
  if (typeof item.content === "string") return truncate(item.content, 220);
  return truncate(stringifyValue(item), 220);
}

function contextFromLucidResponse(response) {
  if (!response) return [];
  if (Array.isArray(response)) {
    return response.map((item) => summarizeContextItem(item)).filter(Boolean).slice(0, MAX_CONTEXT_ITEMS);
  }
  if (typeof response === "string") {
    return [truncate(response, 220)];
  }

  const items = [];
  if (Array.isArray(response.nodes)) items.push(...response.nodes);
  if (Array.isArray(response.facts)) items.push(...response.facts);
  if (Array.isArray(response.episodes)) items.push(...response.episodes);

  return items.map((item) => summarizeContextItem(item)).filter(Boolean).slice(0, MAX_CONTEXT_ITEMS);
}

function buildEpisodeTitle(event, payload) {
  const repository = collapseWhitespace(payload.repository) || "workspace";
  const toolName = collapseWhitespace(payload.tool_name);
  if (event === "session_end") return truncate(`${repository} session handoff`, 96);
  if (event === "pre_compact") return truncate(`${repository} compact checkpoint`, 96);
  if (event === "post_command" && payload.command) return truncate(`${repository} command update`, 96);
  if (event === "post_tool" && toolName) return truncate(`${repository} tool result ${toolName}`, 96);
  return truncate(`${repository} memory update`, 96);
}

function buildEpisodeEnvelope(event, payload) {
  return {
    event,
    agent: AGENT_NAME,
    repository: collapseWhitespace(payload.repository),
    repo_slug: collapseWhitespace(payload.repo_slug),
    directory: collapseWhitespace(payload.directory),
    session_id: collapseWhitespace(payload.session_id),
    prompt: collapseWhitespace(payload.prompt),
    summary: collapseWhitespace(payload.summary),
    content: collapseWhitespace(payload.content),
    files: Array.isArray(payload.files) ? payload.files.map((item) => collapseWhitespace(item)).filter(Boolean) : [],
    findings: Array.isArray(payload.findings)
      ? payload.findings.map((item) => collapseWhitespace(item)).filter(Boolean)
      : [],
    tool_name: collapseWhitespace(payload.tool_name),
    command: collapseWhitespace(payload.command),
    timestamp: new Date().toISOString(),
  };
}

async function writeLucidEpisode(event, payload) {
  const body = buildEpisodeEnvelope(event, payload);
  if (!body.summary && !body.content && body.files.length === 0 && body.findings.length === 0) return;

  const args = {
    name: buildEpisodeTitle(event, payload),
    source: "json",
    source_description: `${AGENT_NAME} ${event} in ${body.repository || "workspace"}`,
    episode_body: JSON.stringify(body),
  };
  const writeGroup = getWriteGroupOverride();
  if (writeGroup) args.group_id = writeGroup;

  await callLucidTool("add_memory", args);
}

async function retrieveStartupContext(payload) {
  const query = collapseWhitespace(payload.repo_slug) || collapseWhitespace(payload.repository);
  if (!query) return [];
  const response = await callLucidTool("search_nodes", {
    query,
    group_ids: getReadGroups(),
    max_nodes: 3,
  });
  return contextFromLucidResponse(response);
}

async function retrievePromptContext(prompt) {
  const query = truncate(prompt, 280);
  if (!query) return [];

  const factResponse = await callLucidTool("search_memory_facts", {
    query,
    group_ids: getReadGroups(),
    max_facts: 3,
  });
  const facts = contextFromLucidResponse(factResponse);
  if (facts.length > 0) return facts;

  const nodeResponse = await callLucidTool("search_nodes", {
    query,
    group_ids: getReadGroups(),
    max_nodes: 3,
  });
  return contextFromLucidResponse(nodeResponse);
}

export const LucidMemoryPlugin = async ({ directory }) => {
  const projectName = basename(directory);
  const repoSlug = readRepoSlug(directory);
  const sessionStates = new Map();

  function stateFor(sessionID) {
    if (!sessionStates.has(sessionID)) {
      sessionStates.set(sessionID, newSessionState(sessionID));
    }
    return sessionStates.get(sessionID);
  }

  function basePayload(sessionID) {
    return {
      agent: AGENT_NAME,
      session_id: sessionID,
      repository: projectName,
      repo_slug: repoSlug,
      directory,
    };
  }

  return {
    event: async ({ event }) => {
      if (event.type === "session.created") {
        const sessionID = event.properties?.sessionID;
        if (!sessionID) return;
        const state = stateFor(sessionID);
        if (state.started) return;
        state.started = true;
        state.startupContext = await retrieveStartupContext(basePayload(sessionID));
        return;
      }

      if (event.type === "session.idle") {
        const sessionID = event.properties?.sessionID;
        if (!sessionID) return;
        const state = stateFor(sessionID);
        if (state.ended) return;
        state.ended = true;
        const summary = buildSessionSummary(state);
        await writeLucidEpisode("session_end", {
          ...basePayload(sessionID),
          summary,
          content: summary,
          files: state.changedFiles,
          findings: state.findings,
          prompt: state.lastPrompt,
        });
        return;
      }

      if (event.type === "file.edited") {
        const filePath = event.properties?.file;
        if (!filePath) return;
        for (const state of sessionStates.values()) {
          rememberFile(state, filePath);
        }
        return;
      }

      if (event.type === "command.executed") {
        const sessionID = event.properties?.sessionID;
        const command = extractRealCommand(event.properties?.name ?? "");
        if (!sessionID || !command || isTrivialCommand(command) || !isStatefulCommand(command)) return;
        const state = stateFor(sessionID);
        const cooldownKey = `command:${command}`;
        if (inCooldown(state, cooldownKey)) return;
        markCooldown(state, cooldownKey);
        rememberFinding(state, `command executed: ${command}`);
        await writeLucidEpisode("post_command", {
          ...basePayload(sessionID),
          command,
          summary: `Command executed: ${command}`,
          content: `Command: ${command}`,
          files: state.changedFiles,
          findings: state.findings,
        });
      }
    },

    "chat.message": async (input, output) => {
      if (output.message?.role !== "user") return;
      const prompt = truncate(extractTextParts(output.parts), MAX_PROMPT_CHARS);
      if (!prompt) return;

      const state = stateFor(input.sessionID);
      state.lastPrompt = prompt;
      state.promptContext = await retrievePromptContext(prompt);
    },

    "tool.execute.after": async (input, output) => {
      const state = stateFor(input.sessionID);
      const capture = maybeHighValueToolCapture(input, output);
      if (!capture) return;
      if (inCooldown(state, capture.cooldownKey)) return;
      markCooldown(state, capture.cooldownKey);
      if (capture.filePath) rememberFile(state, capture.filePath);
      rememberFinding(state, capture.summary);

      await writeLucidEpisode("post_tool", {
        ...basePayload(input.sessionID),
        tool_name: input.tool,
        summary: capture.summary,
        content: capture.content,
        command: capture.command,
        files: capture.filePath ? [capture.filePath] : state.changedFiles,
        findings: state.findings,
      });
    },

    "experimental.session.compacting": async (input, output) => {
      const state = stateFor(input.sessionID);
      const checkpoint = buildCompactCheckpoint(state);
      if (checkpoint) {
        await writeLucidEpisode("pre_compact", {
          ...basePayload(input.sessionID),
          summary: checkpoint,
          content: checkpoint,
          files: state.changedFiles,
          findings: state.findings,
          prompt: state.lastPrompt,
        });
      }

      output.context.push(
        "Keep the compaction summary focused on the current task, key findings, active files, blockers, and next step."
      );
    },

    "experimental.chat.system.transform": async (input, output) => {
      output.system.push(...MEMORY_POLICY_LINES);
      const state = input?.sessionID ? stateFor(input.sessionID) : null;
      if (state && (state.startupContext.length > 0 || state.promptContext.length > 0)) {
        const sections = [];
        if (state.startupContext.length > 0) {
          sections.push(`Startup context: ${state.startupContext.join(" | ")}`);
        }
        if (state.promptContext.length > 0) {
          sections.push(`Related context: ${state.promptContext.join(" | ")}`);
        }
        output.system.push(`Relevant Lucid context for this session: ${sections.join(" ")}`);
      }
    },
  };
};
