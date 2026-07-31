import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_CONFIG } from "../config.ts";
import { buildAdapterConfig, EXPECTED_CODEX_VERSION } from "../upstream/codex-3.0.5.ts";

const BASE_CONFIG = {
  voiceFeaturesOnly: false,
  prompt: { heavySystemPromptOverwrite: true },
  scope: { allProviders: "on", additionalProviders: [] },
  tools: {
    customRustBinariesDir: "/tmp/bin",
    webRun: true,
    imageGeneration: true,
    viewImageFallback: true,
    applyPatchOnly: true,
    viewImageOnly: true,
    webRunOnly: true,
    imageGenerationOnly: true,
  },
  ui: {
    statusLine: true,
    toolRenaming: true,
    compactTools: true,
    codeModeDetails: true,
    backgroundShellWidget: true,
  },
  compaction: { responsesCompaction: false },
  beta: { codeMode: true, responsesLite: true, v2UserMessageRetention: 16 },
  voice: { v3Voice: "cove" },
  openai: {
    fast: true,
    verbosity: "low",
    forceCachedWebSockets: true,
    harnessIdentifierHeader: true,
  },
};

test("pins the supported upstream implementation", () => {
  assert.equal(EXPECTED_CODEX_VERSION, "3.0.5");
});

test("enables only native V2 compaction in the synthetic adapter config", () => {
  const config = buildAdapterConfig(structuredClone(BASE_CONFIG), DEFAULT_CONFIG);
  assert.equal(config.voiceFeaturesOnly, false);
  assert.deepEqual(config.scope, {
    allProviders: "off",
    additionalProviders: DEFAULT_CONFIG.providers,
  });
  assert.deepEqual(config.compaction, { responsesCompaction: true });
  assert.equal(config.beta.codeMode, false);
  assert.equal(config.beta.responsesLite, false);
  assert.equal(config.beta.v2UserMessageRetention, 64);
  assert.equal(config.tools.webRun, false);
  assert.equal(config.tools.imageGeneration, false);
  assert.equal(config.tools.applyPatchOnly, false);
  assert.equal(config.ui.statusLine, false);
  assert.equal(config.ui.backgroundShellWidget, false);
  assert.equal(config.openai.fast, false);
  assert.equal(config.openai.forceCachedWebSockets, false);
  assert.equal(config.openai.harnessIdentifierHeader, false);
});
