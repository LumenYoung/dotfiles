import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, symlinkSync, realpathSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";

// Offline acceptance; no model or MCP requests. PI_CONFIG_ROOT can select a
// not-yet-activated candidate tree during rollout. PI_SDK_ROOT is required.
assert.ok(process.env.PI_SDK_ROOT, "Set PI_SDK_ROOT to the real Pi SDK package directory");
const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const configRoot = resolve(process.env.PI_CONFIG_ROOT ?? repo);
const settings = JSON.parse(readFileSync(join(configRoot, "pi-agent/settings.json")));
const acpConfig = JSON.parse(readFileSync(join(configRoot, "pi-acp.json")));
const subagentsSource = settings.packages.find(p => typeof p === "string" &&
  (p.endsWith("/Documents/git/pi-subagents") || p.startsWith("git:github.com/LumenYoung/pi-subagents@")));
assert.ok(subagentsSource, "The patched subagents fork must be selected");
const upstream = realpathSync(subagentsSource.startsWith("git:")
  ? join(repo, "pi-agent/git/github.com/LumenYoung/pi-subagents") : subagentsSource);
const acpTools = ["compress", "decompress", "search_context", "acp_status"];
const acpSources = settings.packages.filter(p => typeof p === "string" &&
  (p === "npm:billion-context-pi@0.1.65" ||
    p.startsWith("git:github.com/LumenYoung/billion-context-pi@") ||
    p.endsWith("/Documents/git/billion-context-pi")));
assert.equal(acpSources.length, 1, "Select exactly one ACP package source");
const acpSource = acpSources[0];
const acpRoot = acpSource.startsWith("npm:")
  ? join(repo, "pi-agent/npm/node_modules/billion-context-pi")
  : acpSource.startsWith("git:")
    ? join(repo, "pi-agent/git/github.com/LumenYoung/billion-context-pi")
    : acpSource;
const acpPath = realpathSync(join(acpRoot, "dist/index.js"));
const advisorPackage = settings.packages.find(p => typeof p === "string" &&
  (p.endsWith("/Documents/git/pi-advisor") || p.startsWith("git:github.com/LumenYoung/pi-advisor@")));
const advisorSource = advisorPackage?.startsWith("git:")
  ? realpathSync(join(repo, "pi-agent/git/github.com/LumenYoung/pi-advisor")) : advisorPackage;
const modelPath = join(repo, "pi-agent/extensions/lumeny-openai.ts");
const builtinTools = ["read", "grep", "find", "ls", "bash", "edit", "write"];
const home = mkdtempSync(join(tmpdir(), "pi-acp-integration-"));
const agentDir = join(home, ".pi/agent");
mkdirSync(agentDir, { recursive: true });
Object.assign(process.env, {
  HOME: home, PI_CODING_AGENT_DIR: agentDir, PI_OFFLINE: "1", ACP_LOG_FILE: join(home, "acp.log"),
  LUMENY_OPENAI_BASE_URL: "https://invalid.example/v1", LUMENY_OPENAI_API_KEY: "offline-test-only",
  LUMENY_OPENAI_MODEL_IDS: "gpt-5.6-sol,gpt-5.6-terra,gpt-5.6-luna,gpt-6-astra", PI_MCP_CONFIG_MODE: "exclusive",
});
for (const name of ["ACP_AUTO_UPDATE", "ACP_MODEL_CONTEXT_LIMIT", "BILLION_CONTEXT_PROXY", "MCP_DIRECT_TOOLS"]) delete process.env[name];
writeFileSync(join(home, ".pi/acp.json"), JSON.stringify(acpConfig));
mkdirSync(join(agentDir, "intercom"));
writeFileSync(join(agentDir, "intercom/config.json"), JSON.stringify({ enabled: false }));
symlinkSync(join(repo, "pi-agent/npm"), join(agentDir, "npm"));
symlinkSync(join(repo, "pi-agent/git"), join(agentDir, "git"));
let networkAttempts = 0;
globalThis.fetch = async () => { networkAttempts++; throw new Error("Network forbidden in ACP acceptance"); };
const sdkEntry = join(process.env.PI_SDK_ROOT, "dist/index.js");
const sdk = await import(pathToFileURL(sdkEntry).href);
const { createJiti } = createRequire(sdkEntry)("jiti");
const jiti = createJiti(import.meta.url, { alias: { "@earendil-works/pi-coding-agent": sdkEntry } });
const { buildInProcessChildLaunch } = await jiti.import(join(upstream, "src/runs/shared/child-launch.ts"));
const { resolveHostPeerAliases } = await jiti.import(join(upstream, "src/runs/background/runner-aliases.ts"));
const { parseFrontmatter, parseFrontmatterList } = await jiti.import(join(upstream, "src/agents/frontmatter.ts"));
const { computeServerHash } = await jiti.import(join(repo, "pi-agent/npm/node_modules/pi-mcp-adapter/metadata-cache.ts"));
const iweNames = ["iwe_retrieve", "iwe_tree", "iwe_find", "iwe_update", "iwe_stats"];
// Match the maintained IWE direct-tool naming policy, but use a lazy fixture
// server/cache so registration is real and no remote knowledge base is touched.
const maintainedMcp = JSON.parse(readFileSync(join(repo, "pi-agent/mcp.json")));
assert.equal(maintainedMcp.mcpServers.iwe.directTools, true);
assert.equal(maintainedMcp.settings.toolPrefix, "none");
const server = { command: "/offline-never-execute-mcp", lifecycle: "lazy", directTools: true };
writeFileSync(join(agentDir, "mcp.json"), JSON.stringify({ mcpServers: { iwe: server }, settings: { toolPrefix: "none" } }));
writeFileSync(join(agentDir, "mcp-cache.json"), JSON.stringify({ version: 1, servers: { iwe: {
  configHash: computeServerHash(server), cachedAt: Date.now(), resources: [], prompts: [],
  tools: iweNames.map(name => ({ name, description: `Offline ${name}`, inputSchema: { type: "object", properties: {} } })),
} } }));
const runtime = await sdk.ModelRuntime.create({ authPath: join(home, "auth.json"), modelsPath: join(home, "models.json"), modelsStorePath: join(home, "models-store.json") });
const model = { id: "gpt-6-astra", name: "Offline Astra", provider: "lumeny-openai", api: "openai-responses", baseUrl: "https://invalid.example/v1", reasoning: true, input: ["text"], contextWindow: 260000, maxTokens: 32768, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } };
after(() => { try { assert.equal(networkAttempts, 0); } finally { rmSync(home, { recursive: true, force: true }); } });

const roles = new Map();
for (const [name, config] of Object.entries(settings.subagents.agentOverrides)) {
  if (!config.disabled) roles.set(name, config);
}
for (const file of readdirSync(join(configRoot, "pi-agent/agents"))) {
  if (!file.endsWith(".md")) continue;
  const { frontmatter } = parseFrontmatter(readFileSync(join(configRoot, "pi-agent/agents", file), "utf8"));
  roles.set(frontmatter.name, {
    tools: parseFrontmatterList(frontmatter.tools), subagentOnlyExtensions: parseFrontmatterList(frontmatter.subagentOnlyExtensions),
  });
}
function launch(name, host = "parent", restriction = {}) {
  const role = roles.get(name);
  return buildInProcessChildLaunch({
    host, cwd: home, childAgentName: name, childIndex: 0, sessionEnabled: false,
    inheritProjectContext: false, inheritGlobalContext: false, inheritSkills: false, waitToolEnabled: false,
    tools: role.tools.filter(t => !t.startsWith("mcp:")), mcpDirectTools: role.tools.filter(t => t.startsWith("mcp:")).map(t => t.slice(4)),
    subagentOnlyExtensions: role.subagentOnlyExtensions, hostAvailableBuiltins: builtinTools, ...restriction,
  });
}
async function open({ built, sessionManager, main = false } = {}) {
  const errors = [];
  let api;
  const opts = built?.session;
  if (opts?.processEnv?.MCP_DIRECT_TOOLS !== undefined) process.env.MCP_DIRECT_TOOLS = opts.processEnv.MCP_DIRECT_TOOLS;
  else delete process.env.MCP_DIRECT_TOOLS;
  const settingsManager = sdk.SettingsManager.inMemory({ compaction: settings.compaction });
  const loader = new sdk.DefaultResourceLoader({
    cwd: home, agentDir, settingsManager, noExtensions: true,
    noSkills: true, noContextFiles: true, noPromptTemplates: true, noThemes: true,
    additionalExtensionPaths: main ? [modelPath, acpPath] : opts.extensionPaths,
    extensionFactories: [...(opts?.hooks ?? []), pi => { api = pi; }],
  });
  await loader.reload();
  assert.deepEqual(loader.getExtensions().errors, []);
  const sm = sessionManager ?? sdk.SessionManager.inMemory(home);
  const { session } = await sdk.createAgentSession({ cwd: home, agentDir, settingsManager, resourceLoader: loader,
    sessionManager: sm, modelRuntime: runtime, model, tools: main ? [...builtinTools, ...acpTools] : opts.tools, excludeTools: opts?.excludeTools });
  await session.bindExtensions({ mode: "print", onError: error => errors.push(error) });
  return { session, sm, api, loader, errors,
    async call(name, args = {}) { return session.agent.state.tools.find(t => t.name === name).execute("offline-tool", args, new AbortController().signal); },
    async context() { return session.extensionRunner.emitContext(sm.buildSessionContext().messages); },
    async close() { await session.extensionRunner.emit({ type: "session_shutdown", reason: "quit" }); session.dispose(); delete process.env.MCP_DIRECT_TOOLS; },
  };
}
const textOf = result => result.content.filter(c => c.type === "text").map(c => c.text).join("\n");

test("candidate selects one ACP manager and the committed remote forks", () => {
  for (const [source, directory] of [[subagentsSource, upstream], [advisorPackage, advisorSource], [acpSource, acpRoot]]) {
    if (!source?.startsWith("git:")) continue;
    const revision = source.slice(source.lastIndexOf("@") + 1);
    const target = /^[0-9a-f]{40}$/.test(revision) ? revision : `refs/remotes/origin/${revision}`;
    const expected = execFileSync("git", ["-C", directory, "rev-parse", "--verify", `${target}^{commit}`], { encoding: "utf8" }).trim();
    assert.equal(execFileSync("git", ["-C", directory, "rev-parse", "HEAD"], { encoding: "utf8" }).trim(), expected,
      "Installed fork must match the configured commit or fetched feature-branch tip");
  }
  assert.equal(acpSources.length, 1);
  assert.ok(acpSource.startsWith("git:github.com/LumenYoung/billion-context-pi@"));
  assert.ok(!settings.packages.some(p => typeof p === "string" && p.includes("/Documents/git/")));
  assert.ok(!settings.packages.includes("npm:pi-subagents"));
  assert.ok(!settings.packages.includes("./packages/openai-remote-compaction"));
  assert.equal(settings.compaction.enabled, false);
  const old = JSON.parse(readFileSync(join(configRoot, "pi-agent/openai-remote-compaction.json")));
  assert.equal(old.enabled, false); assert.equal(old.fallbackToPi, false);
  assert.equal(acpConfig.enabled, true); assert.equal(acpConfig.autoUpdate, false);
  assert.equal(acpConfig.delegate.enabled, false); assert.equal(acpConfig.throttleRetry, false);
  assert.equal(acpConfig.compress.maxContextLimit, "75%"); assert.equal(acpConfig.compress.emergencyThresholdPercent, "95%");
  for (const p of ["openai", "openai-codex", "lumeny-openai"]) assert.equal(acpConfig.compress.providers[p].reasoning.drop, false);
  execFileSync("git", ["-C", upstream, "merge-base", "--is-ancestor", "47273ce95eb6a0b8781bc5eaa0893e2a73b4c616", "HEAD"]);
  const peers = resolveHostPeerAliases(realpathSync(process.env.PI_SDK_ROOT));
  assert.deepEqual(peers.missing, []);
  assert.ok(!Object.values(peers.aliases).some(p => p.includes("pi-coding-agent-shim")));
  assert.ok(existsSync(join(upstream, "src/runs/background/subagent-runner.ts")));
  assert.ok(existsSync(join(upstream, "runner-peer-preload.mjs")));
  const runnerSource = readFileSync(join(upstream, "src/runs/background/async-execution.ts"), "utf8");
  assert.match(runnerSource, /path\.join\(path\.dirname\(fileURLToPath\(import\.meta\.url\)\), "subagent-runner.ts"\)/);
  assert.match(readFileSync(join(configRoot, "destination.yaml"), "utf8"), /pi-acp.json: ~\/\.pi\/acp.json/);
});

test("actual package discovery loads the selected forks and ACP once, before prompt-template compaction observers", async () => {
  // Relative sources resolve from real settings.json's directory, not fixture HOME.
  const packages = settings.packages.map(p => typeof p === "string" && p.startsWith(".") ? resolve(repo, "pi-agent", p) : p);
  const loader = new sdk.DefaultResourceLoader({ cwd: home, agentDir,
    settingsManager: sdk.SettingsManager.inMemory({ ...settings, packages }),
    noSkills: true, noContextFiles: true, noPromptTemplates: true, noThemes: true,
  });
  await loader.reload();
  const loaded = loader.getExtensions();
  assert.deepEqual(loaded.errors, []);
  const paths = loaded.extensions.map(e => realpathSync(e.path));
  assert.equal(paths.filter(p => p === join(upstream, "index.ts")).length, 1);
  assert.equal(paths.filter(p => p === acpPath).length, 1,
    `Expected one ACP entry at ${acpPath}; discovered: ${paths.filter(p => p.includes("billion-context-pi")).join(", ")}`);
  assert.ok(!paths.some(p => p.includes("openai-remote-compaction") || p.includes("npm/node_modules/pi-subagents/")));
  if (advisorSource) {
    const metadata = JSON.parse(readFileSync(join(advisorSource, "package.json")));
    assert.deepEqual(metadata.pi.extensions, ["./dist/index.ts"]);
    const advisorEntry = realpathSync(join(advisorSource, metadata.pi.extensions[0]));
    assert.equal(paths.filter(p => p === advisorEntry).length, 1);
    assert.ok(!paths.includes(realpathSync(join(advisorSource, "extensions/index.ts"))));
  }
  const promptObserver = paths.findIndex(p => p.includes("pi-prompt-template-model"));
  assert.ok(promptObserver > paths.indexOf(acpPath));
  const acp = loaded.extensions.find(e => realpathSync(e.path) === acpPath);
  // The local fork adds lease invalidation alongside the existing native-
  // compaction cancellation hook. Extension identity is checked above.
  assert.equal(acp.handlers.get("session_before_compact").length, acpSource.startsWith("npm:") ? 1 : 2);
  assert.ok(!loaded.extensions.some(e => e.handlers.has("before_provider_request") && e.path.includes("openai-remote-compaction")));
});

test("Advisor rollout is paired and requires manual activation even with saved model choices", { skip: !advisorSource }, () => {
  assert.ok(acpSource.startsWith("git:github.com/LumenYoung/billion-context-pi@"),
    "Advisor retrieval requires the paired ACP fork");
  const advisor = JSON.parse(readFileSync(join(configRoot, "pi-agent/advisor.json")));
  assert.equal(advisor.advisorAcpContext, true);
  assert.equal(advisor.contextMaxChars, Number.MAX_SAFE_INTEGER);
  assert.equal(advisor.simpleMode, true);
  assert.equal(advisor.alwaysOn, false);
  assert.equal(advisor.advisorScoutEnabled, false);
  assert.equal(advisor.advisorHerdrIntegration, false);
  // /advisor persists a user-selected pair; saved choices do not imply always-on activation.
  const modelRefs = [advisor.executor, advisor.advisor];
  assert.ok(modelRefs.every(ref => ref === undefined) ||
    modelRefs.every(ref => typeof ref === "string" && /^[^/]+\/.+$/.test(ref)),
    "Saved model choices must be a complete provider/model pair or remain unset");
});

test("all maintained native role menus retain ACP and their explicitly loaded providers", async () => {
  for (const name of roles.keys()) for (const host of ["parent", "runner"]) {
    const built = launch(name, host);
    const f = await open({ built });
    try {
      for (const tool of built.config.requiredTools) assert.ok(f.api.getActiveTools().includes(tool), `${name}/${host} missing ${tool}`);
      for (const tool of acpTools) assert.ok(f.api.getActiveTools().includes(tool), `${name}/${host}: ${tool}`);
      assert.equal(runtime.getModel("lumeny-openai", "gpt-6-astra").contextWindow, 260000);
      assert.match(textOf(await f.call("acp_status")), /context|messages|tokens/i);
      assert.ok(!f.api.getAllTools().some(t => t.name.startsWith("acp_delegate")));
      assert.ok(!f.api.getAllTools().some(t => t.name === "ask_advisor"), `${name}/${host}: Advisor must stay main-session-only`);
      assert.equal(f.loader.getExtensions().extensions.filter(e => !e.path.startsWith("<") && realpathSync(e.path) === acpPath).length, 1);
      await f.session.extensionRunner.emit({ type: "agent_start" });
      assert.equal(built.capture.toolDiagnostic(), undefined);
      const first = await f.session.extensionRunner.emitBeforeAgentStart("Inspect", undefined, "Role instructions", { cwd: home });
      assert.match(first.systemPrompt, /compress/);
      assert.deepEqual(await f.session.extensionRunner.emit({ type: "session_before_compact" }), { cancel: true });
      assert.deepEqual(f.errors, []);
    } finally { await f.close(); }
  }
});

test("live IWE menus match their explicit provider configuration", async () => {
  for (const name of ["iwe-page-editor", "iwe-searcher"]) {
    const { frontmatter } = parseFrontmatter(readFileSync(join(configRoot, "pi-agent/agents", name + ".md"), "utf8"));
    const paths = parseFrontmatterList(frontmatter.subagentOnlyExtensions);
    const hasAcp = paths.some(p => p.includes("billion-context-pi"));
    const tools = parseFrontmatterList(frontmatter.tools);
    const built = launch(name, "parent", {
      tools: tools.filter(t => !t.startsWith("mcp:")),
      mcpDirectTools: tools.filter(t => t.startsWith("mcp:")).map(t => t.slice(4)),
      subagentOnlyExtensions: paths,
    });
    const f = await open({ built });
    try {
      assert.ok(paths.some(p => p.endsWith("lumeny-openai.ts")));
      assert.ok(paths.some(p => p.endsWith("pi-mcp-adapter/index.ts")));
      for (const tool of built.config.requiredTools) assert.ok(f.api.getActiveTools().includes(tool));
      assert.equal(f.api.getActiveTools().some(t => acpTools.includes(t)), hasAcp);
      assert.deepEqual(await f.session.extensionRunner.emit({ type: "session_before_compact" }), hasAcp ? { cancel: true } : undefined);
      assert.deepEqual(f.errors, []);
    } finally { await f.close(); }
  }
});

test("exclusions and ceilings cannot be expanded by ACP; denyExtensions removes its hooks", async () => {
  for (const restriction of [
    { excludeTools: ["compress"] },
    { capabilityCeiling: { version: 1, allowedTools: ["read", "acp_status"], sources: ["test"] } },
    { inherited: { capabilityCeiling: { version: 1, denyExtensions: true, sources: ["parent"] } } },
  ]) {
    const built = launch("worker", "parent", restriction);
    const f = await open({ built });
    try {
      const before = f.api.getActiveTools().sort();
      f.api.setActiveTools([...new Set([...before, ...acpTools])]);
      assert.deepEqual(f.api.getActiveTools().sort(), before);
      if (restriction.inherited) {
        assert.ok(!f.api.getActiveTools().some(t => acpTools.includes(t)));
        assert.equal(await f.session.extensionRunner.emit({ type: "session_before_compact" }), undefined);
      }
    } finally { await f.close(); }
  }
});

test("ACP compresses a persistent session, resumes the sidecar, and decompresses original content", async () => {
  const sm = sdk.SessionManager.create(home, join(home, "sessions"));
  const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } };
  for (let i = 0; i < 20; i++) {
    sm.appendMessage({ role: "user", content: [{ type: "text", text: `Fixture request ${i}` }], timestamp: Date.now() });
    sm.appendMessage({ role: "assistant", content: [{ type: "text", text: `SENTINEL_ORIGINAL_${i} ` + (`Detailed finding ${i}. `).repeat(800) }], api: model.api, provider: model.provider, model: model.id, usage, stopReason: "stop", timestamp: Date.now() });
  }
  sm.appendMessage({ role: "user", content: [{ type: "text", text: "Current task, preserve this intent" }], timestamp: Date.now() });
  let f = await open({ main: true, sessionManager: sm });
  let blockId;
  try {
    await f.context();
    const args = { content: [{ startId: "m00002", endId: "m00002", summary: "Fixture finding zero was reviewed. Its original text contains a retrieval sentinel.", topic: "Fixture finding" }] };
    const result = await f.call("compress", args);
    assert.match(textOf(result), /[1-9]\d* blocks?/);
    // The host normally persists the model's tool call and its result; retain
    // that anchor here as well, without requesting a model completion.
    sm.appendMessage({ role: "assistant", content: [{ type: "toolCall", id: "offline-tool", name: "compress", arguments: args }], api: model.api, provider: model.provider, model: model.id, usage, stopReason: "toolUse", timestamp: Date.now() });
    sm.appendMessage({ role: "toolResult", toolCallId: "offline-tool", toolName: "compress", content: result.content, isError: false, timestamp: Date.now() });
    const state = JSON.parse(readFileSync(sm.getSessionFile() + ".acp.json"));
    assert.equal(state.blocks.length, 1); blockId = state.blocks[0].blockId;
    const compressed = JSON.stringify(await f.context());
    assert.ok(!compressed.includes("SENTINEL_ORIGINAL_0"));
    assert.ok(compressed.includes("Fixture finding zero"));
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
  assert.ok(existsSync(sm.getSessionFile()));
  f = await open({ main: true, sessionManager: sdk.SessionManager.open(sm.getSessionFile(), undefined, home) });
  try {
    await f.context();
    const restored = textOf(await f.call("decompress", { blockId, inline: true }));
    assert.ok(restored.includes("SENTINEL_ORIGINAL_0"), restored.slice(0, 1000));
    assert.ok(!JSON.stringify(await f.context()).includes("SENTINEL_ORIGINAL_0"), "decompress returns content without expanding stored block");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
