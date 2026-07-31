import { readFileSync } from "node:fs";

export type V2UserMessageRetention = 16 | 32 | 64;

export type RemoteCompactionConfig = {
  enabled: boolean;
  providers: string[];
  apis: string[];
  modelPattern: string;
  v2UserMessageRetention: V2UserMessageRetention;
  fallbackToPi: boolean;
};

export const DEFAULT_CONFIG: RemoteCompactionConfig = {
  enabled: true,
  providers: ["openai", "openai-codex", "lumeny-openai"],
  apis: ["openai-responses", "openai-codex-responses"],
  modelPattern: "^gpt-",
  v2UserMessageRetention: 64,
  fallbackToPi: true,
};

function stringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const normalized = value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return normalized.length > 0 ? [...new Set(normalized)] : fallback;
}

function v2UserMessageRetention(value: unknown): V2UserMessageRetention {
  return value === 16 || value === 32 || value === 64
    ? value
    : DEFAULT_CONFIG.v2UserMessageRetention;
}

export function parseConfig(value: unknown): RemoteCompactionConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return structuredClone(DEFAULT_CONFIG);
  }

  const input = value as Record<string, unknown>;
  const modelPattern = typeof input.modelPattern === "string" && input.modelPattern.trim()
    ? input.modelPattern.trim()
    : DEFAULT_CONFIG.modelPattern;
  new RegExp(modelPattern, "i");

  return {
    enabled: typeof input.enabled === "boolean" ? input.enabled : DEFAULT_CONFIG.enabled,
    providers: stringArray(input.providers, DEFAULT_CONFIG.providers),
    apis: stringArray(input.apis, DEFAULT_CONFIG.apis),
    modelPattern,
    v2UserMessageRetention: v2UserMessageRetention(input.v2UserMessageRetention),
    fallbackToPi: typeof input.fallbackToPi === "boolean" ? input.fallbackToPi : DEFAULT_CONFIG.fallbackToPi,
  };
}

export function loadConfig(configPath: string): RemoteCompactionConfig {
  return parseConfig(JSON.parse(readFileSync(configPath, "utf8")));
}

export function normalizeModelId(modelId: string): string {
  return modelId.split("/").pop()?.trim() || modelId.trim();
}

export function isEligibleModel(
  model: { provider?: string; api?: string; id?: string } | undefined,
  config: RemoteCompactionConfig,
): boolean {
  if (!config.enabled || !model?.provider || !model.api || !model.id) return false;
  const provider = model.provider.trim().toLowerCase();
  const api = model.api.trim().toLowerCase();
  if (!config.providers.includes(provider) || !config.apis.includes(api)) return false;
  return new RegExp(config.modelPattern, "i").test(normalizeModelId(model.id));
}
