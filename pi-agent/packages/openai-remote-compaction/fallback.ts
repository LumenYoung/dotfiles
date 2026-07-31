export function isCancelResult(value: unknown): boolean {
  return Boolean(
    value
    && typeof value === "object"
    && "cancel" in value
    && (value as { cancel?: unknown }).cancel === true,
  );
}

export function shouldFallbackToPi(
  result: unknown,
  options: {
    enabled: boolean;
    signalAborted: boolean;
    hasNativeCheckpoint: boolean;
  },
): boolean {
  return options.enabled
    && !options.signalAborted
    && !options.hasNativeCheckpoint
    && isCancelResult(result);
}
