import assert from "node:assert/strict";
import test from "node:test";
import { shouldFallbackToPi } from "../fallback.ts";

test("falls back only for a non-aborted cancellation before the first native checkpoint", () => {
  const cancellation = { cancel: true };
  assert.equal(shouldFallbackToPi(cancellation, {
    enabled: true,
    signalAborted: false,
    hasNativeCheckpoint: false,
  }), true);
  assert.equal(shouldFallbackToPi(cancellation, {
    enabled: true,
    signalAborted: false,
    hasNativeCheckpoint: true,
  }), false);
  assert.equal(shouldFallbackToPi(cancellation, {
    enabled: true,
    signalAborted: true,
    hasNativeCheckpoint: false,
  }), false);
  assert.equal(shouldFallbackToPi(undefined, {
    enabled: true,
    signalAborted: false,
    hasNativeCheckpoint: false,
  }), false);
});
