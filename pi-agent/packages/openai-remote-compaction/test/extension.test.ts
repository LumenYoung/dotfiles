import assert from "node:assert/strict";
import { existsSync, realpathSync } from "node:fs";
import { registerHooks } from "node:module";
import { dirname, join } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

function findPiNodeModules(): string {
  for (const directory of (process.env.PATH ?? "").split(":")) {
    const executable = join(directory, "pi");
    if (!existsSync(executable)) continue;
    return dirname(dirname(realpathSync(executable)));
  }
  throw new Error("Could not locate the Pi runtime on PATH");
}

test("registers a user-only compaction entry and filters legacy display messages", async () => {
  const piNodeModules = findPiNodeModules();
  const codingAgentRoot = realpathSync(join(piNodeModules, "@earendil-works/pi-coding-agent"));
  const piPackagesRoot = dirname(codingAgentRoot);
  const aliases = new Map([
    ["@earendil-works/pi-coding-agent", pathToFileURL(join(codingAgentRoot, "dist/index.js")).href],
    ["@earendil-works/pi-agent-core", pathToFileURL(join(piPackagesRoot, "pi-agent-core/dist/index.js")).href],
    ["@earendil-works/pi-ai", pathToFileURL(join(piPackagesRoot, "pi-ai/dist/index.js")).href],
    ["@earendil-works/pi-tui", pathToFileURL(join(piPackagesRoot, "pi-tui/dist/index.js")).href],
  ]);
  registerHooks({
    resolve(specifier, context, nextResolve) {
      const alias = aliases.get(specifier);
      return alias ? { url: alias, shortCircuit: true } : nextResolve(specifier, context);
    },
  });

  const { default: registerExtension } = await import("../index.ts");
  const handlers = new Map<string, (event: any, ctx?: any) => Promise<any>>();
  const entryRenderers: string[] = [];
  const appendedEntries: Array<{ customType: string; data: unknown }> = [];
  const pi = {
    on(event: string, handler: (event: any, ctx?: any) => Promise<any>) {
      handlers.set(event, handler);
    },
    registerEntryRenderer(customType: string) {
      entryRenderers.push(customType);
    },
    appendEntry(customType: string, data: unknown) {
      appendedEntries.push({ customType, data });
    },
  };

  await registerExtension(pi as any);
  assert.deepEqual(entryRenderers, ["openai-remote-compaction-display"]);
  assert.deepEqual([...handlers.keys()].sort(), [
    "before_provider_request",
    "context",
    "session_before_compact",
    "session_compact",
    "session_start",
  ]);

  const contextResult = await handlers.get("context")!({
    messages: [
      { role: "custom", customType: "codex-native-compaction-display", content: "display only" },
      { role: "user", content: "continue" },
    ],
  });
  assert.deepEqual(contextResult.messages, [{ role: "user", content: "continue" }]);

  await handlers.get("session_compact")!({
    fromExtension: true,
    compactionEntry: {
      id: "compaction-entry",
      details: {
        strategy: "openai-native-compact-v1",
        provider: "openai",
        api: "openai-responses",
        model: "gpt-5.6-sol",
        baseUrl: "https://api.openai.com/v1",
        compactedWindow: [{ type: "compaction_summary", encrypted_content: "opaque" }],
        createdAt: "2026-07-31T00:00:00.000Z",
      },
    },
  });
  assert.equal(appendedEntries.length, 1);
  assert.equal(appendedEntries[0]?.customType, "openai-remote-compaction-display");
  assert.match((appendedEntries[0]?.data as { content: string }).content, /encrypted by OpenAI/);
});
