import assert from "node:assert/strict";
import { existsSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { registerHooks } from "node:module";
import { dirname, join } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import {
  createCompactionResponsesStream,
  withCompactionStreamRegistryFallback,
} from "../upstream/codex-3.0.5.ts";

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

const clientPath = join(
  homedir(),
  ".pi/agent/npm/node_modules/@howaboua/pi-codex-conversion/dist/adapter/compaction/remote-v2-client.js",
);
const packageDist = join(
  homedir(),
  ".pi/agent/npm/node_modules/@howaboua/pi-codex-conversion/dist",
);
const { executeRemoteCompactionV2 } = await import(pathToFileURL(clientPath).href) as {
  executeRemoteCompactionV2(options: Record<string, unknown>): Promise<{ ok: boolean; reason?: string }>;
};
const requestBody = await import(pathToFileURL(join(packageDist, "providers/openai-codex/request-body.js")).href);
const streamEvents = await import(pathToFileURL(join(packageDist, "providers/openai-codex/stream-events.js")).href);
const piAI = await import(piPackageAliases.get("@earendil-works/pi-ai")!);

test("upstream V2 compaction accepts the raw-output-aware stream through the registry fallback", async () => {
  const model = {
    id: "gpt-5.6-sol",
    name: "GPT-5.6 Sol",
    provider: "openai",
    api: "openai-responses",
    baseUrl: "https://proxy.example/v1",
    reasoning: true,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 256000,
    maxTokens: 32768,
  };
  async function* compactionStream(_model: unknown, _context: unknown, options: any) {
    options.onOutputItemDone?.({
      type: "compaction",
      id: "cmp_test",
      encrypted_content: "opaque-window",
    });
    yield {
      type: "done",
      reason: "stop",
      message: {
        role: "assistant",
        content: [],
        api: "openai-responses",
        provider: "openai",
        model: "gpt-5.6-sol",
        usage: {
          input: 10,
          output: 1,
          cacheRead: 0,
          cacheWrite: 0,
          totalTokens: 11,
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
        },
        stopReason: "stop",
        timestamp: Date.now(),
        responseId: "resp_test",
      },
    };
  }
  const ctx = {
    model,
    modelRegistry: {
      getRegisteredProviderConfig: () => ({ api: "openai-responses" }),
    },
  } as any;
  const contextView = withCompactionStreamRegistryFallback(ctx, compactionStream as any);

  const result = await executeRemoteCompactionV2({
    runtime: {
      provider: "openai",
      api: "openai-responses",
      model: model.id,
      baseUrl: model.baseUrl,
      currentModel: model,
      apiKey: "test-key",
      headers: {},
    },
    modelRegistry: contextView.modelRegistry,
    context: { systemPrompt: "system", messages: [] },
    promptInput: [{
      type: "message",
      role: "user",
      content: [{ type: "input_text", text: "compact this" }],
    }],
    requestOptions: {},
    sessionId: "session-test",
  });

  assert.equal(result.ok, true, result.reason);
});

test("compaction-only Responses stream forwards the raw encrypted output item", async () => {
  const captured: { body?: any; client?: any } = {};
  const compaction = {
    type: "compaction",
    id: "cmp_transport",
    encrypted_content: "opaque-window",
  };

  class FakeOpenAI {
    responses = {
      create: (body: unknown) => {
        captured.body = body;
        return {
          withResponse: async () => ({
            response: { status: 200, headers: new Headers({ "x-request-id": "req_test" }) },
            data: (async function* () {
              yield {
                type: "response.created",
                response: { id: "resp_transport", status: "in_progress", output: [] },
              };
              yield { type: "response.output_item.added", output_index: 0, item: compaction };
              yield { type: "response.output_item.done", output_index: 0, item: compaction };
              yield {
                type: "response.completed",
                response: {
                  id: "resp_transport",
                  status: "completed",
                  output: [compaction],
                  usage: { input_tokens: 10, output_tokens: 1, total_tokens: 11 },
                },
              };
            })(),
          }),
        };
      },
    };

    constructor(options: unknown) {
      captured.client = options;
    }
  }

  const streamSimple = createCompactionResponsesStream({
    requestBody: requestBody as any,
    streamEvents: streamEvents as any,
    piAI: piAI as any,
    openAI: { default: FakeOpenAI as any },
  });
  const model = {
    id: "gpt-5.6-sol",
    name: "GPT-5.6 Sol",
    provider: "openai",
    api: "openai-responses",
    baseUrl: "https://proxy.example/v1",
    reasoning: true,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 256000,
    maxTokens: 32768,
  };
  const ctx = {
    model,
    modelRegistry: {
      getRegisteredProviderConfig: () => ({ api: "openai-responses" }),
    },
  } as any;
  const contextView = withCompactionStreamRegistryFallback(ctx, streamSimple);

  const result = await executeRemoteCompactionV2({
    runtime: {
      provider: "openai",
      api: "openai-responses",
      model: model.id,
      baseUrl: model.baseUrl,
      currentModel: model,
      apiKey: "test-key",
      headers: {},
    },
    modelRegistry: contextView.modelRegistry,
    context: { systemPrompt: "system", messages: [], tools: [] },
    promptInput: [{
      type: "message",
      role: "user",
      content: [{ type: "input_text", text: "compact this" }],
    }],
    requestOptions: {},
    sessionId: "session-transport-test",
  }) as { ok: boolean; reason?: string; compaction?: unknown };

  assert.equal(result.ok, true, result.reason);
  assert.deepEqual(result.compaction, compaction);
  assert.equal(captured.client.baseURL, model.baseUrl);
  assert.equal(captured.client.apiKey, "test-key");
  assert.equal("client_metadata" in captured.body, false);
  assert.equal(captured.body.input.at(-1).type, "compaction_trigger");
});
