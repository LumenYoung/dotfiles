import assert from "node:assert/strict";
import { test } from "node:test";
import lumenyOpenAI from "../extensions/lumeny-openai.ts";

for (const offlineFallback of [false, true]) {
  test(`provider preserves model limits with ${offlineFallback ? "offline fallback" : "configured model IDs"}`, async (t) => {
    const env = {
      LUMENY_OPENAI_BASE_URL: "https://invalid.example/v1",
      LUMENY_OPENAI_API_KEY: "offline-test-only",
      LUMENY_OPENAI_MODEL_IDS: offlineFallback ? "" : "gpt-6.1-sol,gpt-6-sol,gpt-6-luna,gpt-future-test,gpt-5.6-sol,gpt-6-astra,claude-opus-4-8,claude-future-test",
      PI_OFFLINE: "1",
    };
    const previous = new Map([...Object.keys(env), "OPENAI_API_KEY"].map((key) => [key, process.env[key]]));
    t.after(() => {
      for (const [key, value] of previous) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    });
    t.mock.method(globalThis, "fetch", async () => assert.fail("Network forbidden in provider metadata test"));
    Object.assign(process.env, env);
    const providers = new Map();
    await lumenyOpenAI({ registerProvider: (name, config) => providers.set(name, config) });

    for (const name of ["lumeny-openai", "openai"]) {
      const models = new Map(providers.get(name).models.map((model) => [model.id, model]));
      assert.equal(models.get("gpt-6.1-sol").contextWindow, 500000, `${name}/gpt-6.1-sol`);
      assert.equal(models.get("gpt-6.1-sol").maxTokens, 32768);
      for (const id of ["gpt-6-sol", "gpt-6-luna", "gpt-5.6-sol", ...(offlineFallback ? [] : ["gpt-future-test"])]) {
        assert.equal(models.get(id).contextWindow, 256000, `${name}/${id}`);
        assert.equal(models.get(id).maxTokens, 32768);
      }
      assert.equal(models.get("gpt-6-astra").contextWindow, 260000);
    }
    assert.equal(providers.has("lumeny-openrouter"), false);
    const claude = new Map(providers.get("lumeny-anthropic").models.map((model) => [model.id, model]));
    assert.equal(claude.get("claude-opus-4-8").contextWindow, 200000);
    if (!offlineFallback) {
      assert.equal(claude.get("claude-future-test").contextWindow, 256000);
      assert.equal(claude.get("claude-future-test").maxTokens, 32000);
    }
  });
}

function setEnvironment(t, overrides = {}) {
  const env = {
    LUMENY_OPENAI_BASE_URL: "https://cpa.example/v1",
    LUMENY_OPENAI_API_KEY: "cpa-test-key",
    LUMENY_OPENAI_MODEL_IDS: "",
    PI_OFFLINE: "",
    ...overrides,
  };
  const previous = new Map([...Object.keys(env), "OPENAI_API_KEY"].map((key) => [key, process.env[key]]));
  t.after(() => {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  Object.assign(process.env, env);
}

async function registeredProviders() {
  const providers = new Map();
  await lumenyOpenAI({ registerProvider: (name, config) => providers.set(name, config) });
  return providers;
}

const geminiId = "openrouter/google/gemini-test";
const claudeId = "openrouter/anthropic/claude-test";

test("discovers CPA OpenRouter aliases and uses public metadata without leaking the CPA key", async (t) => {
  setEnvironment(t);
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push(url);
    if (url === "https://cpa.example/v1/models") {
      assert.equal(options.headers.Authorization, "Bearer cpa-test-key");
      return Response.json({ data: [
        "gpt-6.1-sol", "claude-opus-4-8", geminiId, claudeId,
        geminiId, "gpt-image-2", "unrelated-model",
      ].map((id) => ({ id })) });
    }
    assert.equal(url, "https://openrouter.ai/api/v1/models");
    assert.equal(options.headers, undefined);
    return Response.json({ data: [
      {
        id: "google/gemini-test", name: "Gemini Test", context_length: 1048576,
        top_provider: { max_completion_tokens: 65536 },
        architecture: { input_modalities: ["text", "image", "audio"] },
        supported_parameters: ["reasoning", "tools"],
        pricing: { prompt: "0.000002", completion: "0.00001", input_cache_read: "0.0000002" },
      },
      {
        id: "anthropic/claude-test", context_length: 200000,
        top_provider: { max_completion_tokens: 32000 },
        architecture: { input_modalities: ["text"] },
        supported_parameters: ["tools"],
      },
      { id: "google/not-exposed-by-cpa", context_length: 1000000 },
    ] });
  });
  const providers = await registeredProviders();
  const router = providers.get("lumeny-openrouter");
  assert.equal(router.baseUrl, "https://cpa.example/v1");
  assert.equal(router.apiKey, "cpa-test-key");
  assert.equal(router.api, "openai-completions");
  assert.deepEqual(router.models.map((m) => m.id), [geminiId, claudeId]);
  const [gemini, claude] = router.models;
  assert.equal(gemini.name, "Gemini Test");
  assert.equal(gemini.contextWindow, 1048576);
  assert.equal(gemini.maxTokens, 65536);
  assert.equal(gemini.reasoning, true);
  assert.deepEqual(gemini.input, ["text", "image"]);
  assert.equal(gemini.cost.input, 2);
  assert.equal(gemini.cost.output, 10);
  assert.ok(Math.abs(gemini.cost.cacheRead - 0.2) < 1e-10);
  assert.equal(gemini.cost.cacheWrite, 2);
  assert.equal(gemini.compat.thinkingFormat, "openrouter");
  assert.equal(gemini.compat.maxTokensField, "max_tokens");
  assert.equal(gemini.compat.supportsStore, false);
  assert.equal(gemini.compat.supportsDeveloperRole, false);
  assert.equal(gemini.compat.cacheControlFormat, undefined);
  assert.equal(claude.compat.cacheControlFormat, "anthropic");
  assert.deepEqual(claude.input, ["text"]);
  assert.equal(claude.reasoning, false);
  assert.equal(providers.get("lumeny-openai").api, "openai-responses");
  assert.equal(providers.get("openai"), providers.get("lumeny-openai"));
  assert.deepEqual(providers.get("lumeny-anthropic").models.map((m) => m.id), ["claude-opus-4-8"]);
  assert.equal(calls.length, 2);
});

test("OpenRouter-only discovery does not inject fallback GPT or Claude models", async (t) => {
  setEnvironment(t);
  t.mock.method(globalThis, "fetch", async (url) => Response.json({ data:
    url.includes("cpa.example") ? [{ id: geminiId }] : [],
  }));
  const providers = await registeredProviders();
  assert.deepEqual(providers.get("lumeny-openai").models, []);
  assert.equal(providers.has("lumeny-anthropic"), false);
  assert.equal(providers.get("lumeny-openrouter").models[0].id, geminiId);
});

for (const mode of ["offline", "http-error", "malformed-catalog"]) {
  test(`configured OpenRouter models remain available with conservative metadata: ${mode}`, async (t) => {
    setEnvironment(t, { LUMENY_OPENAI_MODEL_IDS: `${geminiId},${geminiId}`, PI_OFFLINE: mode === "offline" ? "1" : "" });
    t.mock.method(console, "warn", () => {});
    t.mock.method(globalThis, "fetch", async (url) => {
      assert.notEqual(mode, "offline", "Offline mode must not access the network");
      assert.equal(url, "https://openrouter.ai/api/v1/models");
      return mode === "http-error" ? new Response(null, { status: 503 }) : Response.json({ data: {} });
    });
    const models = (await registeredProviders()).get("lumeny-openrouter").models;
    assert.equal(models.length, 1);
    assert.equal(models[0].contextWindow, 32768);
    assert.equal(models[0].maxTokens, 4096);
    assert.equal(models[0].reasoning, false);
    assert.deepEqual(models[0].input, ["text"]);
  });
}

test("malformed optional catalog fields do not prevent model registration", async (t) => {
  setEnvironment(t, { LUMENY_OPENAI_MODEL_IDS: geminiId });
  t.mock.method(globalThis, "fetch", async () => Response.json({ data: [
    null,
    { id: "google/gemini-test", name: {}, supported_parameters: {}, architecture: { input_modalities: 42 } },
  ] }));
  const [model] = (await registeredProviders()).get("lumeny-openrouter").models;
  assert.equal(model.id, geminiId);
  assert.equal(model.name, "google/gemini-test");
  assert.equal(model.reasoning, false);
  assert.deepEqual(model.input, ["text"]);
});

test("validates numeric catalog limits and prices without assuming GPT capabilities", async (t) => {
  setEnvironment(t, { LUMENY_OPENAI_MODEL_IDS: `${geminiId},${claudeId}` });
  t.mock.method(globalThis, "fetch", async () => Response.json({ data: [
    { id: "google/gemini-test", context_length: -1, top_provider: { max_completion_tokens: null }, pricing: { prompt: "bad", completion: "-1" } },
    { id: "anthropic/claude-test", context_length: 2048, top_provider: { max_completion_tokens: 4096 } },
  ] }));
  const [gemini, claude] = (await registeredProviders()).get("lumeny-openrouter").models;
  assert.equal(gemini.contextWindow, 32768);
  assert.equal(gemini.maxTokens, 4096);
  assert.equal(gemini.cost.input, 0);
  assert.equal(gemini.cost.output, 0);
  assert.equal(claude.maxTokens, 2048);
});
