import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const DEFAULT_MODEL_IDS = [
  "gpt-5.5",
  "gpt-5.4",
  "gpt-5.4-mini",
  "claude-opus-4-8",
  "claude-opus-4-7",
  "claude-opus-4-6",
  "claude-sonnet-4-6",
  "claude-haiku-4-5",
];

const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
  "gpt-5.5": 256000,
  "gpt-5.4": 256000,
  "gpt-5.4-mini": 256000,
  "claude-opus-4-8": 200000,
  "claude-opus-4-7": 200000,
  "claude-opus-4-6": 200000,
  "claude-sonnet-4-6": 200000,
  "claude-haiku-4-5": 200000,
};

const MODEL_MAX_TOKENS: Record<string, number> = {
  "gpt-5.5": 32768,
  "gpt-5.4": 32768,
  "gpt-5.4-mini": 32768,
  "claude-opus-4-8": 32000,
  "claude-opus-4-7": 32000,
  "claude-opus-4-6": 32000,
  "claude-sonnet-4-6": 64000,
  "claude-haiku-4-5": 32000,
};

function configuredModelIds(): string[] {
  const raw = process.env.LUMENY_OPENAI_MODEL_IDS?.trim();
  if (!raw) return DEFAULT_MODEL_IDS;
  return raw
    .split(/[\s,]+/)
    .map((id) => id.trim())
    .filter(Boolean);
}

function modelName(id: string): string {
  return id
    .split("-")
    .map((part) => {
      const upper = part.toUpperCase();
      if (["GPT", "API"].includes(upper)) return upper;
      if (["opus", "sonnet", "haiku"].includes(part)) return part.charAt(0).toUpperCase() + part.slice(1);
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("-")
    .replace("Mini", "Mini");
}

export default function lumenyOpenAI(pi: ExtensionAPI) {
  const baseUrl = process.env.LUMENY_OPENAI_BASE_URL?.trim();
  const apiKey = process.env.LUMENY_OPENAI_API_KEY?.trim();
  if (!baseUrl) {
    console.warn("[lumeny-openai] LUMENY_OPENAI_BASE_URL is not set; leaving Lumeny OpenAI provider unregistered.");
    return;
  }
  if (!apiKey) {
    console.warn("[lumeny-openai] LUMENY_OPENAI_API_KEY is not set; leaving Lumeny OpenAI provider unregistered.");
    return;
  }

  // Keep OPENAI_API_KEY process-local and aligned with the selected Lumeny
  // endpoint for any OpenAI-compatible code paths that still consult it.
  process.env.OPENAI_API_KEY = apiKey;

  const modelIds = configuredModelIds();
  const claudeIds = modelIds.filter((id) => id.startsWith("claude"));
  const openaiIds = modelIds.filter((id) => !id.startsWith("claude"));

  // Only expose non-Claude (GPT) models on the Lumeny OpenAI-Responses provider.
  // Claude models are served by the native Anthropic provider below, since the
  // Responses surface under-reports their token usage (see comment further down).
  pi.registerProvider("lumeny-openai", {
    name: "Lumeny OpenAI",
    baseUrl,
    api: "openai-responses",
    apiKey,
    models: openaiIds.map((id) => ({
      id,
      name: modelName(id),
      reasoning: true,
      input: ["text", "image"],
      contextWindow: MODEL_CONTEXT_WINDOWS[id] ?? 200000,
      maxTokens: MODEL_MAX_TOKENS[id] ?? 32768,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      thinkingLevelMap: {
        minimal: "low",
        low: "low",
        medium: "medium",
        high: "high",
        xhigh: "high",
      },
    })),
  });

  // Claude models served through Lumeny's OpenAI-Responses surface under-report
  // token usage: cached prompt tokens (Anthropic's cache_read_input_tokens) are
  // not mapped into the Responses usage fields, so Pi only sees the small
  // per-turn input and the context panel collapses to ~1% (and auto-compaction
  // never triggers). Lumeny (CLIProxyAPI) also exposes a native Anthropic
  // Messages endpoint at POST {host}/v1/messages, authenticated with the same
  // key via the x-api-key header. Pi's native "anthropic-messages" api reads
  // cache_read_input_tokens / cache_creation_input_tokens correctly, so route
  // Claude through it for accurate context accounting.
  if (claudeIds.length > 0) {
    // The Anthropic SDK appends "/v1/messages" to baseUrl, so it must be the
    // host root (e.g. https://api.lumeny.io), not the OpenAI "/v1" base.
    const anthropicBaseUrl = baseUrl.replace(/\/v1\/?$/, "");
    pi.registerProvider("lumeny-anthropic", {
      name: "Lumeny Anthropic",
      baseUrl: anthropicBaseUrl,
      api: "anthropic-messages",
      apiKey,
      models: claudeIds.map((id) => ({
        id,
        name: modelName(id),
        reasoning: true,
        input: ["text", "image"],
        contextWindow: MODEL_CONTEXT_WINDOWS[id] ?? 200000,
        maxTokens: MODEL_MAX_TOKENS[id] ?? 32000,
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      })),
    });
  }
}
