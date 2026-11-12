import assert from "node:assert/strict";
import { cpSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import herdrContext, { buildHerdrInstructions, detectHerdrContext } from "../extensions/herdr-context.ts";

const coreEnv = { HC_TERMINAL_ID: "t15", HC_TERMINAL_SOCKET: "/tmp/core.sock" };
const legacyEnv = { HERDR_ENV: "1", HERDR_PANE_ID: "w1:p6", HERDR_SOCKET_PATH: "/tmp/legacy.sock" };
const coreTerminal = { address: "t15", state: "live", labels: {} };
const appTerminal = { ...coreTerminal, labels: { "herdr.space": "sp1", "herdr.tab": "tb1" } };
const legacyResponse = { result: { pane: { pane_id: "w2:p9", workspace_id: "w2", tab_id: "w2:t4" } } };
const success = (value) => ({ code: 0, killed: false, stdout: JSON.stringify(value) });
const forbiddenProbe = async () => assert.fail("Unexpected subprocess probe");

function isolateEnv(t, env) {
  const keys = ["HC_TERMINAL_ID", "HC_TERMINAL_SOCKET", "HERDR_ENV", "HERDR_PANE_ID", "HERDR_SOCKET_PATH", "HERDR_APP_HOME", "HOME"];
  const previous = new Map(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) if (key !== "HOME") delete process.env[key];
  Object.assign(process.env, env);
  t.after(() => {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

function extensionHarness(exec) {
  const handlers = new Map();
  const notifications = [];
  const ctx = { hasUI: true, ui: { notify: (...args) => notifications.push(args) } };
  herdrContext({ on: (name, handler) => handlers.set(name, handler), exec });
  return { handlers, notifications, ctx };
}

test("ordinary shells do not probe running apps or assume membership", async () => {
  assert.deepEqual(await detectHerdrContext({}, forbiddenProbe), { kind: "none" });
  assert.deepEqual(await detectHerdrContext({ HERDR_ENV: "0" }, forbiddenProbe), { kind: "none" });
  assert.equal(buildHerdrInstructions({ kind: "none" }), undefined);
});

test("app detection uses a targeted, bounded hc lookup, not HERDR_ENV or app status", async () => {
  const calls = [];
  const context = await detectHerdrContext(coreEnv, async (...args) => {
    calls.push(args);
    return success(appTerminal);
  });
  assert.deepEqual(context, { kind: "herdr-app", terminalId: "t15", spaceId: "sp1", tabId: "tb1" });
  assert.deepEqual(calls, [["env", ["HC_SOCKET=/tmp/core.sock", "hc", "get", "t15", "--json"], { timeout: 1500, maxBuffer: 65536 }]]);
});

test("a verified core terminal with empty labels is not automatically a desktop terminal", async () => {
  assert.deepEqual(await detectHerdrContext(coreEnv, async () => success(coreTerminal)), { kind: "herdr-core", terminalId: "t15" });
});

test("legacy current lookup accepts the returned live identity after a pane move", async () => {
  const context = await detectHerdrContext(legacyEnv, async (command, args, options) => {
    assert.equal(command, "herdr");
    assert.deepEqual(args, ["pane", "current", "--current"]);
    assert.equal(options.timeout, 1500);
    return success(legacyResponse);
  });
  assert.deepEqual(context, { kind: "herdr-legacy", paneId: "w2:p9", workspaceId: "w2", tabId: "w2:t4" });
});

for (const env of [
  { HC_TERMINAL_ID: "t15" },
  { HC_TERMINAL_SOCKET: "/tmp/core.sock" },
  { HERDR_ENV: "1" },
  { HERDR_ENV: "1", HERDR_PANE_ID: "w1:p1" },
  { HERDR_ENV: "0", HERDR_PANE_ID: "w1:p1", HERDR_SOCKET_PATH: "/tmp/legacy.sock" },
  { ...coreEnv, ...legacyEnv },
]) {
  test(`incomplete or conflicting markers do not choose a control interface: ${JSON.stringify(env)}`, async () => {
    let calls = 0;
    const context = await detectHerdrContext(env, async () => { calls++; return forbiddenProbe(); });
    assert.equal(context.kind, "unknown");
    assert.equal(calls, 0, "incomplete/conflicting markers must not trigger a lookup");
  });
}

for (const [label, probe] of [
  ["command missing", async () => { throw new Error("ENOENT"); }],
  ["timeout", async () => ({ code: 1, killed: true, stdout: "" })],
  ["nonzero status", async () => ({ code: 1, killed: false, stdout: "{}" })],
  ["invalid JSON", async () => ({ code: 0, killed: false, stdout: "not JSON" })],
  ["null response", async () => success(null)],
  ["array response", async () => success([])],
]) {
  for (const [kind, env] of [["core", coreEnv], ["legacy", legacyEnv]]) {
    test(`${kind} ${label} gives unconfirmed context, not outside-Herdr assertion`, async () => {
      const context = await detectHerdrContext(env, probe);
      assert.equal(context.kind, "unknown");
      const instructions = buildHerdrInstructions(context);
      assert.match(instructions, /unconfirmed/);
      assert.match(instructions, /Do not claim this process is outside Herdr/);
    });
  }
}

for (const [label, terminal] of [
  ["wrong address", { ...appTerminal, address: "t99" }],
  ["finished terminal", { ...appTerminal, state: "finished" }],
  ["missing labels", { address: "t15", state: "live" }],
  ["invalid labels", { ...appTerminal, labels: [] }],
  ["partial app labels", { ...appTerminal, labels: { "herdr.space": "sp1" } }],
  ["empty app labels", { ...appTerminal, labels: { "herdr.space": "", "herdr.tab": "tb1" } }],
]) {
  test(`core rejects ${label}`, async () => {
    assert.equal((await detectHerdrContext(coreEnv, async () => success(terminal))).kind, "unknown");
  });
}

test("legacy rejects incomplete pane identity rather than assuming a focused pane", async () => {
  assert.equal((await detectHerdrContext(legacyEnv, async () => success({ result: { pane: { pane_id: "w1:p1" } } }))).kind, "unknown");
});

test("instructions route each confirmed environment and preserve control boundaries", () => {
  const contexts = [
    { kind: "herdr-app", terminalId: "t15", spaceId: "sp1", tabId: "tb1" },
    { kind: "herdr-core", terminalId: "t15" },
    { kind: "herdr-legacy", paneId: "w1:p1", workspaceId: "w1", tabId: "w1:t1" },
  ];
  for (const context of contexts) {
    const text = buildHerdrInstructions(context, "/home/test", "/custom/app home");
    assert.match(text, new RegExp(`Herdr environment: ${context.kind}`));
    assert.match(text, /nested\/headless/);
    assert.match(text, /does not authorize terminal control/);
    assert.match(text, /explicit authorization/);
    assert.match(text, /\/reload/);
    if (context.kind === "herdr-app") {
      assert.match(text, /herdr-app --skill/);
      assert.match(text, /hc --skill/);
      assert.match(text, /\/custom\/app home\/AGENTS.md/);
      assert.match(text, /not a desktop pane ID/);
    } else if (context.kind === "herdr-core") {
      assert.match(text, /only herdr-core context is confirmed/);
      assert.doesNotMatch(text, /load the herdr-app skill/);
    } else {
      assert.match(text, /herdr pane current --current/);
      assert.match(text, /herdr --skill/);
      assert.doesNotMatch(text, /load the herdr-app skill/);
    }
  }
  assert.match(buildHerdrInstructions(contexts[0], "/home/test", ""), /\/home\/test\/\.config\/herdr-app\/AGENTS.md/);
  for (const context of contexts.slice(0, 2)) {
    assert.match(buildHerdrInstructions(context), /HC_SOCKET="\$HC_TERMINAL_SOCKET" hc get/);
    assert.match(buildHerdrInstructions(context), /do not fall back to the default socket/);
  }
});

test("extension discovers only the matching adapter, keeps prompts stable, and resets on session initialization", async (t) => {
  const home = mkdtempSync(join(tmpdir(), "herdr-context-home-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  isolateEnv(t, { ...coreEnv, HOME: home });
  cpSync(new URL("../../optin-skills/herdr/", import.meta.url), join(home, ".config/optin-skills/herdr"), { recursive: true });
  let calls = 0;
  let response = appTerminal;
  const { handlers, ctx, notifications } = extensionHarness(async () => { calls++; return success(response); });
  await handlers.get("session_start")({ reason: "startup" }, ctx);
  const resources = await handlers.get("resources_discover")({}, ctx);
  assert.deepEqual(resources.skillPaths, [join(home, ".config/optin-skills/herdr/herdr-app/SKILL.md")]);
  assert.ok(existsSync(resources.skillPaths[0]));

  const event = { systemPromptOptions: { sections: { unrelated: "keep" } } };
  handlers.get("before_agent_start")(event);
  const first = event.systemPromptOptions.sections.herdr_environment;
  handlers.get("before_agent_start")(event);
  assert.equal(event.systemPromptOptions.sections.herdr_environment, first);
  assert.equal(event.systemPromptOptions.sections.unrelated, "keep");
  assert.equal(calls, 1, "no probes in model-request hooks");

  response = coreTerminal;
  await handlers.get("session_start")({ reason: "reload" }, ctx);
  assert.deepEqual(handlers.get("resources_discover")({}, ctx).skillPaths, [join(home, ".config/optin-skills/herdr/herdr-core/SKILL.md")]);
  handlers.get("before_agent_start")(event);
  assert.match(event.systemPromptOptions.sections.herdr_environment, /Herdr environment: herdr-core/);
  assert.equal(calls, 2);

  for (const key of Object.keys(coreEnv)) delete process.env[key];
  Object.assign(process.env, legacyEnv);
  response = legacyResponse;
  await handlers.get("session_start")({ reason: "resume" }, ctx);
  assert.deepEqual(handlers.get("resources_discover")({}, ctx).skillPaths, [join(home, ".config/optin-skills/herdr/herdr-legacy/SKILL.md")]);
  handlers.get("before_agent_start")(event);
  assert.match(event.systemPromptOptions.sections.herdr_environment, /Herdr environment: herdr-legacy/);

  for (const key of Object.keys(legacyEnv)) delete process.env[key];
  await handlers.get("session_start")({ reason: "new" }, ctx);
  assert.deepEqual(handlers.get("resources_discover")({}, ctx), { skillPaths: [] });
  handlers.get("before_agent_start")(event);
  assert.deepEqual(event.systemPromptOptions.sections, { unrelated: "keep" });
  assert.equal(calls, 3);
  assert.deepEqual(notifications, []);
});

for (const env of [coreEnv, { HC_TERMINAL_ID: "t15" }]) {
  test(`unverified session warns once and exposes no control skill: ${JSON.stringify(env)}`, async (t) => {
    isolateEnv(t, env);
    let calls = 0;
    const { handlers, notifications, ctx } = extensionHarness(async () => { calls++; throw new Error("ENOENT"); });
    await handlers.get("session_start")({ reason: "startup" }, ctx);
    assert.equal(calls, env.HC_TERMINAL_SOCKET ? 1 : 0, "ID-only context must not probe the default server");
    assert.deepEqual(handlers.get("resources_discover")({}, ctx), { skillPaths: [] });
    const event = { systemPromptOptions: { sections: {} } };
    handlers.get("before_agent_start")(event);
    handlers.get("before_agent_start")(event);
    assert.match(event.systemPromptOptions.sections.herdr_environment, /unconfirmed/);
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0][1], "warning");
  });
}

test("missing opt-in adapter reports propagation instructions without throwing", async (t) => {
  const home = mkdtempSync(join(tmpdir(), "herdr-missing-adapter-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  isolateEnv(t, { ...coreEnv, HOME: home });
  const { handlers, notifications, ctx } = extensionHarness(async () => success(appTerminal));
  await handlers.get("session_start")({ reason: "startup" }, ctx);
  assert.deepEqual(handlers.get("resources_discover")({}, ctx), { skillPaths: [] });
  assert.equal(notifications.length, 1);
  assert.match(notifications[0][0], /Propagate dotfiles optin-skills, then \/reload/);
});
