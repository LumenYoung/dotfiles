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
    console.warn("[lumeny-openai] LUMENY_OPENAI_BASE_URL is not set; leaving Pi's OpenAI provider unchanged.");
    return;
  }
  if (!apiKey) {
    console.warn("[lumeny-openai] LUMENY_OPENAI_API_KEY is not set; leaving Pi's OpenAI provider unchanged.");
    return;
  }

  // Pi's built-in openai provider may otherwise prefer OPENAI_API_KEY from the
  // process environment. Keep this process-local and align it with the selected
  // Lumeny endpoint so no shell wrapper is required.
  process.env.OPENAI_API_KEY = apiKey;

  pi.registerProvider("openai", {
    name: "Lumeny OpenAI",
    baseUrl,
    api: "openai-responses",
    apiKey,
    models: configuredModelIds().map((id) => ({
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
}
