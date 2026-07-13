import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_CONFIG, isEligibleModel, normalizeModelId, parseConfig } from "../config.ts";

test("normalizes provider-prefixed GPT model IDs", () => {
  assert.equal(normalizeModelId("openai/gpt-5.6-sol"), "gpt-5.6-sol");
});

test("requires provider, Responses API, and model pattern", () => {
  assert.equal(isEligibleModel({ provider: "lumeny-openai", api: "openai-responses", id: "gpt-5.6-sol" }, DEFAULT_CONFIG), true);
  assert.equal(isEligibleModel({ provider: "lumeny-openai", api: "openai-chat-completions", id: "gpt-5.6-sol" }, DEFAULT_CONFIG), false);
  assert.equal(isEligibleModel({ provider: "other", api: "openai-responses", id: "gpt-5.6-sol" }, DEFAULT_CONFIG), false);
  assert.equal(isEligibleModel({ provider: "lumeny-openai", api: "openai-responses", id: "claude-opus" }, DEFAULT_CONFIG), false);
});

test("parses overrides and rejects invalid regular expressions", () => {
  const config = parseConfig({ providers: ["Custom"], modelPattern: "^gpt-5\\." });
  assert.deepEqual(config.providers, ["custom"]);
  assert.equal(config.modelPattern, "^gpt-5\\.");
  assert.throws(() => parseConfig({ modelPattern: "[" }));
});
