import assert from "node:assert/strict";
import test from "node:test";
import {
  filterLegacyCompactionDisplayMessages,
  formatCompactionUsage,
  isLegacyCompactionDisplayMessage,
  normalizeCompactionDisplayEntryData,
} from "../display.ts";

const LEGACY_TYPE = "codex-native-compaction-display";

test("removes legacy display messages from model context", () => {
  const legacy = { role: "custom", customType: LEGACY_TYPE, content: "display only" };
  const user = { role: "user", content: "continue" };

  assert.equal(isLegacyCompactionDisplayMessage(legacy, LEGACY_TYPE), true);
  assert.deepEqual(filterLegacyCompactionDisplayMessages([legacy, user], LEGACY_TYPE), [user]);
});

test("does not remove unrelated custom messages", () => {
  const message = { role: "custom", customType: "other-extension", content: "model context" };
  assert.deepEqual(filterLegacyCompactionDisplayMessages([message], LEGACY_TYPE), [message]);
});

test("formats native V2 usage", () => {
  assert.equal(formatCompactionUsage({
    inputTokens: 1000,
    cachedInputTokens: 750,
    cacheWriteInputTokens: 100,
    outputTokens: 25,
  }), "input 1,000 · cache read 750 (75.0%) · cache write 100 · output 25");
});

test("normalizes malformed persisted display entries", () => {
  assert.deepEqual(normalizeCompactionDisplayEntryData(null), {
    compactionEntryId: "unknown",
    content: "OpenAI remote compaction was used for this checkpoint.",
  });
  assert.deepEqual(normalizeCompactionDisplayEntryData({
    compactionEntryId: "entry-1",
    content: "Checkpoint",
    usage: { inputTokens: -1 },
  }), {
    compactionEntryId: "entry-1",
    content: "Checkpoint",
  });
});
