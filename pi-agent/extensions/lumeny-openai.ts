import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const MODEL_IDS = ["gpt-5.5", "gpt-5.4", "gpt-5.4-mini"];

function modelName(id: string): string {
  return id
    .split("-")
    .map((part) => part.toUpperCase() === "GPT" ? "GPT" : part.charAt(0).toUpperCase() + part.slice(1))
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
    models: MODEL_IDS.map((id) => ({
      id,
      name: modelName(id),
      reasoning: true,
      input: ["text", "image"],
      contextWindow: 256000,
      maxTokens: 32768,
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
