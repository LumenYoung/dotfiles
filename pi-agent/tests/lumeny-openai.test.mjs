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
    const claude = new Map(providers.get("lumeny-anthropic").models.map((model) => [model.id, model]));
    assert.equal(claude.get("claude-opus-4-8").contextWindow, 200000);
    if (!offlineFallback) {
      assert.equal(claude.get("claude-future-test").contextWindow, 256000);
      assert.equal(claude.get("claude-future-test").maxTokens, 32000);
    }
  });
}
