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

function findPiRuntimeEntry(): string {
  for (const directory of (process.env.PATH ?? "").split(":")) {
    const executable = join(directory, "pi");
    if (!existsSync(executable)) continue;
    const cliEntry = realpathSync(executable);
    return join(dirname(dirname(cliEntry)), "dist/index.js");
  }
  throw new Error("Could not locate the Pi runtime on PATH");
}

test("replays the opaque native compaction window before the live conversation tail", async () => {
  const piRuntimeUrl = pathToFileURL(findPiRuntimeEntry()).href;
  registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === "@earendil-works/pi-coding-agent") {
        return { url: piRuntimeUrl, shortCircuit: true };
      }
      return nextResolve(specifier, context);
    },
  });
  const replayModulePath = join(
    homedir(),
    ".pi/agent/npm/node_modules/@howaboua/pi-codex-conversion/dist/adapter/replay/native-replay-segments.js",
  );
  const replay = await import(pathToFileURL(replayModulePath).href) as ReplayModule;
  const compactedWindow = [{
    type: "compaction_summary",
    id: "cmp_test",
    encrypted_content: "opaque-native-window",
  }];
  const liveTail = {
    role: "user",
    content: [{ type: "input_text", text: "question after compaction" }],
  };
  const result = replay.rewriteResponsesPayloadWithNativeReplay({
    model: {
      id: "gpt-5.4-mini",
      provider: "lumeny-openai",
      api: "openai-responses",
      input: ["text"],
      reasoning: true,
    },
    payload: {
      model: "gpt-5.4-mini",
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
      {
        type: "compaction",
        id: "compact-entry",
        parentId: "kept-entry",
        timestamp: "2026-07-13T00:01:00.000Z",
        summary: "[OpenAI native compaction checkpoint]",
        tokensBefore: 100000,
        firstKeptEntryId: "kept-entry",
        details: {
          strategy: "openai-native-compact-v1",
          compactedWindow,
        },
      },
      {
        type: "message",
        id: "tail-entry",
        parentId: "compact-entry",
        timestamp: "2026-07-13T00:02:00.000Z",
        message: { role: "user", content: "question after compaction", timestamp: 2 },
      },
    ],
    compactionEntry: {
      type: "compaction",
      id: "compact-entry",
      parentId: "kept-entry",
      timestamp: "2026-07-13T00:01:00.000Z",
      summary: "[OpenAI native compaction checkpoint]",
      tokensBefore: 100000,
      firstKeptEntryId: "kept-entry",
      details: {
        strategy: "openai-native-compact-v1",
        compactedWindow,
      },
    },
  });

  assert.equal(result.ok, true, result.reason);
  assert.deepEqual(result.rewrittenPayload?.input, [...compactedWindow, liveTail]);
});
