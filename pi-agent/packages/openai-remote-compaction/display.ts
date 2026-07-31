import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export const COMPACTION_DISPLAY_ENTRY_TYPE = "openai-remote-compaction-display";

export type CompactionUsage = {
  inputTokens: number;
  cachedInputTokens: number;
  cacheWriteInputTokens: number;
  outputTokens: number;
};

export type CompactionDisplayEntryData = {
  compactionEntryId: string;
  content: string;
  usage?: CompactionUsage;
};

const FALLBACK_DISPLAY_TEXT = "OpenAI remote compaction was used for this checkpoint.";

function isCompactionUsage(value: unknown): value is CompactionUsage {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const usage = value as Record<string, unknown>;
  return [usage.inputTokens, usage.cachedInputTokens, usage.cacheWriteInputTokens, usage.outputTokens]
    .every((tokens) => typeof tokens === "number" && Number.isFinite(tokens) && tokens >= 0);
}

export function normalizeCompactionDisplayEntryData(value: unknown): CompactionDisplayEntryData {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { compactionEntryId: "unknown", content: FALLBACK_DISPLAY_TEXT };
  }
  const data = value as Record<string, unknown>;
  return {
    compactionEntryId: typeof data.compactionEntryId === "string" && data.compactionEntryId
      ? data.compactionEntryId
      : "unknown",
    content: typeof data.content === "string" && data.content.trim()
      ? data.content
      : FALLBACK_DISPLAY_TEXT,
    ...(isCompactionUsage(data.usage) ? { usage: data.usage } : {}),
  };
}

export function formatCompactionUsage(usage: CompactionUsage): string {
  const ratio = usage.inputTokens > 0
    ? `${((usage.cachedInputTokens / usage.inputTokens) * 100).toFixed(1)}%`
    : "0%";
  const tokens = (value: number): string => Math.round(value).toLocaleString("en-US");
  return [
    `input ${tokens(usage.inputTokens)}`,
    `cache read ${tokens(usage.cachedInputTokens)} (${ratio})`,
    `cache write ${tokens(usage.cacheWriteInputTokens)}`,
    `output ${tokens(usage.outputTokens)}`,
  ].join(" · ");
}

export function isLegacyCompactionDisplayMessage(value: unknown, legacyCustomType: string): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const message = value as Record<string, unknown>;
  return message.role === "custom" && message.customType === legacyCustomType;
}

export function filterLegacyCompactionDisplayMessages<T>(
  messages: readonly T[],
  legacyCustomType: string,
): T[] {
  return messages.filter((message) => !isLegacyCompactionDisplayMessage(message, legacyCustomType));
}

export async function registerCompactionDisplay(pi: ExtensionAPI): Promise<void> {
  const { Box, Text, truncateToWidth } = await import("@earendil-works/pi-tui");
  pi.registerEntryRenderer(COMPACTION_DISPLAY_ENTRY_TYPE, (entry, _options, theme) => {
    const data = normalizeCompactionDisplayEntryData(entry.data);
    const box = new Box(1, 1, (text) => theme.bg("customMessageBg", text));
    box.addChild(new Text(theme.fg("customMessageLabel", theme.bold("[compaction]")), 0, 0));
    box.addChild(new Text(`\n${theme.fg("customMessageText", data.content)}`, 0, 0));
    if (data.usage) {
      box.addChild(new Text(`\n${theme.fg("dim", formatCompactionUsage(data.usage))}`, 0, 0));
    }
    const render = box.render.bind(box);
    box.render = (width) => render(width).map((line) => truncateToWidth(line, width, ""));
    return box;
  });
}
