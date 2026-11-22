import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const FALLBACK_MODEL_IDS = [
  "gpt-6.1-sol",
  "gpt-6-sol",
  "gpt-6-luna",
  "gpt-6-astra",
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

const DEFAULT_CONTEXT_WINDOW = 256000;

const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
  "gpt-6.1-sol": 500000,
  "gpt-6-astra": 260000,
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
      .filter((id) => id.startsWith("claude-") || isOpenAIModelId(id) || id.startsWith("openrouter/")),
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
          console.warn("[lumeny-openai] Remote /models returned no supported models; using fallback model list.");
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
      contextWindow: MODEL_CONTEXT_WINDOWS[id] ?? DEFAULT_CONTEXT_WINDOW,
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
        contextWindow: MODEL_CONTEXT_WINDOWS[id] ?? DEFAULT_CONTEXT_WINDOW,
        maxTokens: MODEL_MAX_TOKENS[id] ?? 32000,
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      })),
    });
  }

  const openRouterIds = uniqueModelIds(modelIds.filter((id) => id.startsWith("openrouter/")));
  if (openRouterIds.length > 0) {
    pi.registerProvider("lumeny-openrouter", {
      name: "Lumeny OpenRouter",
      baseUrl,
      api: "openai-completions",
      apiKey,
      models: await openRouterModels(openRouterIds),
    });
  }
}

type OpenRouterCatalogModel = {
  id: string;
  name?: string;
  context_length?: number;
  top_provider?: { max_completion_tokens?: number | null };
  architecture?: { input_modalities?: string[] };
  supported_parameters?: string[];
  pricing?: Record<string, string>;
};

async function openRouterModels(ids: string[]) {
  let catalog: OpenRouterCatalogModel[] = [];
  if (!isTruthyEnv(process.env.PI_OFFLINE)) {
    try {
      // CPA lists routable IDs, but omits model limits. Public metadata needs no key.
      const response = await fetch("https://openrouter.ai/api/v1/models", {
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (!Array.isArray(payload.data)) throw new Error("Missing model data array");
      catalog = payload.data;
    } catch {
      console.warn("[lumeny-openai] OpenRouter metadata unavailable; using conservative limits for CPA OpenRouter models.");
    }
  }
  const byId = new Map(catalog.filter((m) => m && typeof m.id === "string").map((m) => [m.id, m]));
  return ids.map((id) => {
    const upstreamId = id.slice("openrouter/".length);
    const metadata = byId.get(upstreamId);
    const contextWindow = positiveInteger(metadata?.context_length, 32768);
    const input: ("text" | "image")[] = ["text"];
    if (Array.isArray(metadata?.architecture?.input_modalities) && metadata.architecture.input_modalities.includes("image")) {
      input.push("image");
    }
    return {
      id,
      name: typeof metadata?.name === "string" && metadata.name.trim() ? metadata.name : upstreamId,
      reasoning: Array.isArray(metadata?.supported_parameters) && metadata.supported_parameters.includes("reasoning"),
      input,
      contextWindow,
      maxTokens: Math.min(positiveInteger(metadata?.top_provider?.max_completion_tokens, 4096), contextWindow),
      cost: {
        input: pricePerMillion(metadata?.pricing?.prompt),
        output: pricePerMillion(metadata?.pricing?.completion),
        cacheRead: pricePerMillion(metadata?.pricing?.input_cache_read ?? metadata?.pricing?.prompt),
        cacheWrite: pricePerMillion(metadata?.pricing?.input_cache_write ?? metadata?.pricing?.prompt),
      },
      // The CPA hostname/provider name cannot trigger Pi's OpenRouter auto-detection.
      compat: {
        supportsStore: false,
        supportsDeveloperRole: false,
        maxTokensField: "max_tokens" as const,
        thinkingFormat: "openrouter" as const,
        ...(upstreamId.startsWith("anthropic/") ? { cacheControlFormat: "anthropic" as const } : {}),
      },
    };
  });
}

function positiveInteger(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : fallback;
}

function pricePerMillion(value: string | undefined): number {
  const price = Number(value);
  return Number.isFinite(price) && price >= 0 ? price * 1_000_000 : 0;
}
