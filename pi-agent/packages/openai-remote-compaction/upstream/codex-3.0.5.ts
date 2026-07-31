import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type {
  ExtensionAPI,
  ExtensionContext,
  SessionBeforeCompactEvent,
  SessionEntry,
} from "@earendil-works/pi-coding-agent";
import type { RemoteCompactionConfig } from "../config.ts";

const CODEX_PACKAGE = "@howaboua/pi-codex-conversion";
export const EXPECTED_CODEX_VERSION = "3.0.5";

type AdapterConfig = Record<string, unknown> & {
  voiceFeaturesOnly: boolean;
  prompt: Record<string, unknown>;
  scope: { allProviders: string; additionalProviders: string[] };
  tools: Record<string, unknown>;
  ui: Record<string, unknown>;
  compaction: { responsesCompaction: boolean };
  beta: Record<string, unknown>;
  voice: Record<string, unknown>;
  openai: Record<string, unknown>;
};

type CodexTurnState = {
  reset?(): void;
};

type AdapterState = {
  enabled: boolean;
  cwd: string;
  promptSkills: unknown[];
  config: AdapterConfig;
  codexTurnState: CodexTurnState;
  pendingPiCompactionNativeWindow?: unknown;
};

type CompactionModule = {
  handleCodexSessionBeforeCompact(
    event: SessionBeforeCompactEvent,
    ctx: ExtensionContext,
    state: AdapterState,
    pi: ExtensionAPI,
  ): Promise<unknown>;
  injectPendingNativeWindowIntoPiCompactionRequest(
    payload: unknown,
    ctx: ExtensionContext,
    state: AdapterState,
  ): Promise<unknown | undefined>;
  rewriteCodexCompactedProviderRequest(
    payload: unknown,
    ctx: ExtensionContext,
    state: AdapterState,
  ): Promise<unknown | undefined>;
};

type NativeCompactionUsage = {
  inputTokens: number;
  cachedInputTokens: number;
  cacheWriteInputTokens: number;
  outputTokens: number;
};

type CompactionTypesModule = {
  isNativeCompactionDetails(value: unknown): boolean;
  isNativeCompactionEntry(value: unknown): boolean;
  NATIVE_COMPACTION_DISPLAY_MESSAGE_TYPE: string;
  NATIVE_COMPACTION_DISPLAY_TEXT: string;
};

type AdapterConfigModule = {
  DEFAULT_CODEX_CONVERSION_CONFIG: AdapterConfig;
};

type TurnStateModule = {
  createCodexTurnState(): CodexTurnState;
};

type RuntimeModules = {
  compaction: CompactionModule;
  compactionTypes: CompactionTypesModule;
  adapterConfig: AdapterConfigModule;
  turnState: TurnStateModule;
};

export type CodexCompactionBridge = {
  legacyDisplayMessageType: string;
  displayText: string;
  update(config: RemoteCompactionConfig, ctx: Pick<ExtensionContext, "cwd">): void;
  resetSession(config: RemoteCompactionConfig, ctx: Pick<ExtensionContext, "cwd">): void;
  compact(event: SessionBeforeCompactEvent, ctx: ExtensionContext, pi: ExtensionAPI): Promise<unknown>;
  rewriteRequest(payload: unknown, ctx: ExtensionContext): Promise<unknown | undefined>;
  clearPendingFallbackWindow(): void;
  isNativeCompactionDetails(value: unknown): boolean;
  hasNativeCompactionEntry(entries: SessionEntry[]): boolean;
  getUsage(details: unknown): NativeCompactionUsage | undefined;
};

function moduleUrl(distRoot: string, relativePath: string): string {
  return pathToFileURL(join(distRoot, relativePath)).href;
}

async function loadRuntimeModules(agentDir: string): Promise<RuntimeModules> {
  const packageRoot = join(agentDir, "npm", "node_modules", "@howaboua", "pi-codex-conversion");
  const packageJsonPath = join(packageRoot, "package.json");
  if (!existsSync(packageJsonPath)) {
    throw new Error(`${CODEX_PACKAGE}@${EXPECTED_CODEX_VERSION} is not installed under ${agentDir}/npm`);
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as { version?: string };
  if (packageJson.version !== EXPECTED_CODEX_VERSION) {
    throw new Error(`Expected ${CODEX_PACKAGE}@${EXPECTED_CODEX_VERSION}, found ${packageJson.version ?? "unknown"}`);
  }

  const distRoot = join(packageRoot, "dist");
  const [compaction, compactionTypes, adapterConfig, turnState] = await Promise.all([
    import(moduleUrl(distRoot, "adapter/compaction/compaction.js")) as Promise<CompactionModule>,
    import(moduleUrl(distRoot, "adapter/compaction/types.js")) as Promise<CompactionTypesModule>,
    import(moduleUrl(distRoot, "adapter/activation/config.js")) as Promise<AdapterConfigModule>,
    import(moduleUrl(distRoot, "providers/openai-codex/turn-state.js")) as Promise<TurnStateModule>,
  ]);
  return { compaction, compactionTypes, adapterConfig, turnState };
}

export function buildAdapterConfig(base: AdapterConfig, config: RemoteCompactionConfig): AdapterConfig {
  return {
    ...base,
    voiceFeaturesOnly: false,
    prompt: {
      ...base.prompt,
      heavySystemPromptOverwrite: false,
    },
    scope: {
      allProviders: "off",
      additionalProviders: config.providers,
    },
    tools: {
      ...base.tools,
      customRustBinariesDir: "",
      webRun: false,
      imageGeneration: false,
      viewImageFallback: false,
      applyPatchOnly: false,
      viewImageOnly: false,
      webRunOnly: false,
      imageGenerationOnly: false,
    },
    ui: {
      ...base.ui,
      statusLine: false,
      toolRenaming: false,
      compactTools: false,
      codeModeDetails: false,
      backgroundShellWidget: false,
    },
    compaction: { responsesCompaction: true },
    beta: {
      ...base.beta,
      codeMode: false,
      responsesLite: false,
      v2UserMessageRetention: config.v2UserMessageRetention,
    },
    voice: { ...base.voice },
    openai: {
      ...base.openai,
      fast: false,
      forceCachedWebSockets: false,
      harnessIdentifierHeader: false,
    },
  };
}

function extractUsage(details: unknown): NativeCompactionUsage | undefined {
  if (!details || typeof details !== "object" || Array.isArray(details)) return undefined;
  const usage = (details as Record<string, unknown>).usage;
  if (!usage || typeof usage !== "object" || Array.isArray(usage)) return undefined;
  const record = usage as Record<string, unknown>;
  const values = [record.inputTokens, record.cachedInputTokens, record.cacheWriteInputTokens, record.outputTokens];
  if (!values.every((value) => typeof value === "number" && Number.isFinite(value) && value >= 0)) return undefined;
  return {
    inputTokens: record.inputTokens as number,
    cachedInputTokens: record.cachedInputTokens as number,
    cacheWriteInputTokens: record.cacheWriteInputTokens as number,
    outputTokens: record.outputTokens as number,
  };
}

export async function createCodexCompactionBridge(
  agentDir: string,
  initialConfig: RemoteCompactionConfig,
  initialCwd = process.cwd(),
): Promise<CodexCompactionBridge> {
  const modules = await loadRuntimeModules(agentDir);
  const baseConfig = modules.adapterConfig.DEFAULT_CODEX_CONVERSION_CONFIG;
  const state: AdapterState = {
    enabled: false,
    cwd: initialCwd,
    promptSkills: [],
    config: buildAdapterConfig(baseConfig, initialConfig),
    codexTurnState: modules.turnState.createCodexTurnState(),
  };

  const update = (
    config: RemoteCompactionConfig,
    ctx: Pick<ExtensionContext, "cwd">,
  ): void => {
    state.cwd = ctx.cwd;
    state.config = buildAdapterConfig(baseConfig, config);
  };

  return {
    legacyDisplayMessageType: modules.compactionTypes.NATIVE_COMPACTION_DISPLAY_MESSAGE_TYPE,
    displayText: modules.compactionTypes.NATIVE_COMPACTION_DISPLAY_TEXT,
    update,
    resetSession(config, ctx) {
      update(config, ctx);
      state.pendingPiCompactionNativeWindow = undefined;
      state.codexTurnState.reset?.();
    },
    compact(event, ctx, pi) {
      return modules.compaction.handleCodexSessionBeforeCompact(event, ctx, state, pi);
    },
    async rewriteRequest(payload, ctx) {
      const fallbackPayload = await modules.compaction.injectPendingNativeWindowIntoPiCompactionRequest(
        payload,
        ctx,
        state,
      );
      if (fallbackPayload !== undefined) return fallbackPayload;
      return modules.compaction.rewriteCodexCompactedProviderRequest(payload, ctx, state);
    },
    clearPendingFallbackWindow() {
      state.pendingPiCompactionNativeWindow = undefined;
    },
    isNativeCompactionDetails(value) {
      return modules.compactionTypes.isNativeCompactionDetails(value);
    },
    hasNativeCompactionEntry(entries) {
      return entries.some((entry) => modules.compactionTypes.isNativeCompactionEntry(entry));
    },
    getUsage: extractUsage,
  };
}
