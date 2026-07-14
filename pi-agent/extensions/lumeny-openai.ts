import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const FALLBACK_MODEL_IDS = [
  "gpt-5.6-sol",
  "gpt-5.6-luna",
  "gpt-5.6-terra",
  "gpt-5.5",
  "gpt-5.4",
  "gpt-5.4-mini",
  "claude-opus-4-8",
  "claude-opus-4-7",
  "claude-opus-4-6",
  "claude-sonnet-4-6",
  "claude-haiku-4-5",
];

type RemoteModelsPayload = {
  data?: Array<{ id?: unknown; owned_by?: unknown; name?: unknown }>;
  models?: Array<{ id?: unknown; owned_by?: unknown; name?: unknown }>;
};

const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
  "gpt-5.6-sol": 256000,
  "gpt-5.6-luna": 256000,
  "gpt-5.6-terra": 256000,
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
  "gpt-5.6-sol": 32768,
  "gpt-5.6-luna": 32768,
  "gpt-5.6-terra": 32768,
  "gpt-5.5": 32768,
  "gpt-5.4": 32768,
  "gpt-5.4-mini": 32768,
  "claude-opus-4-8": 32000,
  "claude-opus-4-7": 32000,
  "claude-opus-4-6": 32000,
  "claude-sonnet-4-6": 64000,
  "claude-haiku-4-5": 32000,
};

function configuredModelIds(): string[] | null {
  const raw = process.env.LUMENY_OPENAI_MODEL_IDS?.trim();
  if (!raw) return null;
  return raw
    .split(/[\s,]+/)
    .map((id) => id.trim())
    .filter(Boolean);
}

function isOpenAIModelId(id: string): boolean {
  if (id.startsWith("gpt-image-")) return false;
  return id.startsWith("gpt-") || id.startsWith("codex-");
}

function isTruthyEnv(value: string | undefined): boolean {
  return ["1", "true", "yes", "on"].includes((value ?? "").trim().toLowerCase());
}

function uniqueModelIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

async function discoverModelIds(baseUrl: string, apiKey: string): Promise<string[]> {
  const modelsUrl = `${baseUrl.replace(/\/+$/, "")}/models`;
  const timeoutMs = Number(process.env.LUMENY_OPENAI_MODEL_DISCOVERY_TIMEOUT_MS ?? "5000");
  const response = await fetch(modelsUrl, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 5000),
  });

  if (!response.ok) {
    throw new Error(`GET ${modelsUrl} failed with HTTP ${response.status}`);
  }

  const payload = (await response.json()) as RemoteModelsPayload;
  const entries = payload.data ?? payload.models ?? [];
  return uniqueModelIds(
    entries
      .map((model) => (typeof model.id === "string" ? model.id.trim() : ""))
      .filter((id) => id.startsWith("claude-") || isOpenAIModelId(id)),
  );
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

export default async function lumenyOpenAI(pi: ExtensionAPI) {
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

  let modelIds = configuredModelIds();
  if (!modelIds) {
    if (isTruthyEnv(process.env.PI_OFFLINE)) {
      modelIds = FALLBACK_MODEL_IDS;
    } else {
      try {
        modelIds = await discoverModelIds(baseUrl, apiKey);
        if (modelIds.length === 0) {
          console.warn("[lumeny-openai] Remote /models returned no GPT/Codex/Claude models; using fallback model list.");
          modelIds = FALLBACK_MODEL_IDS;
        }
      } catch (error) {
        console.warn(
          `[lumeny-openai] Failed to discover models from CLIProxyAPI; using fallback model list: ${error instanceof Error ? error.message : String(error)}`,
        );
        modelIds = FALLBACK_MODEL_IDS;
      }
    }
  }
  const claudeIds = modelIds.filter((id) => id.startsWith("claude-"));
  const openaiIds = modelIds.filter(isOpenAIModelId);

  // Only expose non-Claude (GPT) models on the Lumeny OpenAI-Responses provider.
  // Claude models are served by the native Anthropic provider below, since the
  // Responses surface under-reports their token usage (see comment further down).
  const openAIProviderConfig = {
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
  } as const;

  pi.registerProvider("lumeny-openai", openAIProviderConfig);

  // Paseo persists Pi model references as provider/model. Keep `openai` as a
  // compatibility alias so agents created or remembered with `openai/*` use
  // the same CLIProxyAPI endpoint and client key as `lumeny-openai/*`.
  pi.registerProvider("openai", openAIProviderConfig);

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
