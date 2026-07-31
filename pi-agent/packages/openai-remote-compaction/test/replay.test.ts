import assert from "node:assert/strict";
import { existsSync, realpathSync } from "node:fs";
import { registerHooks } from "node:module";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

type ReplayModule = {
  rewriteResponsesPayloadWithNativeReplay(args: Record<string, unknown>): {
    ok: boolean;
    reason?: string;
    rewrittenPayload?: { input: unknown[] };
  };
};

function findPiPackageAliases(): Map<string, string> {
  for (const directory of (process.env.PATH ?? "").split(":")) {
    const executable = join(directory, "pi");
    if (!existsSync(executable)) continue;
    const piNodeModules = dirname(dirname(realpathSync(executable)));
    const codingAgentRoot = realpathSync(join(piNodeModules, "@earendil-works/pi-coding-agent"));
    const piPackagesRoot = dirname(codingAgentRoot);
    return new Map([
      ["@earendil-works/pi-coding-agent", pathToFileURL(join(codingAgentRoot, "dist/index.js")).href],
      ["@earendil-works/pi-agent-core", pathToFileURL(join(piPackagesRoot, "pi-agent-core/dist/index.js")).href],
      ["@earendil-works/pi-ai", pathToFileURL(join(piPackagesRoot, "pi-ai/dist/index.js")).href],
    ]);
  }
  throw new Error("Could not locate the Pi runtime on PATH");
}

const piPackageAliases = findPiPackageAliases();
registerHooks({
  resolve(specifier, context, nextResolve) {
    const alias = piPackageAliases.get(specifier);
    return alias ? { url: alias, shortCircuit: true } : nextResolve(specifier, context);
  },
});
const replayModulePath = join(
  homedir(),
  ".pi/agent/npm/node_modules/@howaboua/pi-codex-conversion/dist/adapter/replay/native-replay-segments.js",
);
const replay = await import(pathToFileURL(replayModulePath).href) as ReplayModule;

for (const strategy of ["openai-native-compact-v1", "openai-responses-compaction-v2"]) {
  test(`replays the opaque ${strategy} window before the live conversation tail`, () => {
    const compactedWindow = [{
      type: "compaction_summary",
      id: "cmp_test",
      encrypted_content: "opaque-native-window",
    }];
    const liveTail = {
      role: "user",
      content: [{ type: "input_text", text: "question after compaction" }],
    };
    const details = {
      strategy,
      provider: "lumeny-openai",
      api: "openai-responses",
      model: "gpt-5.6-sol",
      baseUrl: "https://api.openai.com/v1",
      compactedWindow,
      createdAt: "2026-07-13T00:01:00.000Z",
    };
    const compactionEntry = {
      type: "compaction",
      id: "compact-entry",
      parentId: "kept-entry",
      timestamp: "2026-07-13T00:01:00.000Z",
      summary: "[OpenAI native compaction checkpoint]",
      tokensBefore: 100000,
      firstKeptEntryId: "kept-entry",
      details,
    };
    const result = replay.rewriteResponsesPayloadWithNativeReplay({
      model: {
        id: "gpt-5.6-sol",
        provider: "lumeny-openai",
        api: "openai-responses",
        input: ["text"],
        reasoning: true,
      },
      payload: {
        model: "gpt-5.6-sol",
        instructions: "system prompt",
        input: [liveTail],
      },
      branchEntries: [
        {
          type: "message",
          id: "kept-entry",
          parentId: null,
          timestamp: "2026-07-13T00:00:00.000Z",
          message: { role: "user", content: "old context", timestamp: 1 },
        },
        compactionEntry,
        {
          type: "message",
          id: "tail-entry",
          parentId: "compact-entry",
          timestamp: "2026-07-13T00:02:00.000Z",
          message: { role: "user", content: "question after compaction", timestamp: 2 },
        },
      ],
      compactionEntry,
    });

    assert.equal(result.ok, true, result.reason);
    assert.deepEqual(result.rewrittenPayload?.input, [...compactedWindow, liveTail]);
  });
}
