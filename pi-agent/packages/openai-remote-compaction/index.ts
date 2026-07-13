import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  getAgentDir,
  type ExtensionAPI,
  type ExtensionContext,
  type SessionBeforeCompactEvent,
} from "@earendil-works/pi-coding-agent";
import { isEligibleModel, loadConfig, type RemoteCompactionConfig } from "./config.ts";

type AdapterConfig = Record<string, unknown> & {
  scope: { allProviders: string; additionalProviders: string[] };
  tools: Record<string, boolean>;
  ui: Record<string, unknown>;
  compaction: { responsesCompaction: boolean };
  beta: { codeMode: boolean };
  openai: Record<string, unknown>;
};

type AdapterState = {
  enabled: boolean;
  cwd: string;
  promptSkills: unknown[];
  config: AdapterConfig;
  codexTurnState: unknown;
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

type CompactionTypesModule = {
  isNativeCompactionDetails(value: unknown): boolean;
  NATIVE_COMPACTION_DISPLAY_MESSAGE_TYPE: string;
  NATIVE_COMPACTION_DISPLAY_TEXT: string;
};

type AdapterConfigModule = {
  readCodexConversionConfig(): AdapterConfig;
};

type TurnStateModule = {
  createCodexTurnState(): unknown;
};

type RuntimeModules = {
  compaction: CompactionModule;
  compactionTypes: CompactionTypesModule;
  adapterConfig: AdapterConfigModule;
  turnState: TurnStateModule;
};

const CONFIG_BASENAME = "openai-remote-compaction.json";
const CODEX_PACKAGE = "@howaboua/pi-codex-conversion";
const EXPECTED_CODEX_VERSION = "2.2.0";

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

function buildAdapterConfig(base: AdapterConfig, config: RemoteCompactionConfig): AdapterConfig {
  return {
    ...base,
    mode: "normal",
    scope: { allProviders: "off", additionalProviders: config.providers },
    tools: {
      ...base.tools,
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
      backgroundShellWidget: false,
    },
    compaction: { responsesCompaction: true },
    beta: { codeMode: false },
    openai: {
      ...base.openai,
      fast: false,
      forceCachedWebSockets: false,
      compactionModel: config.compactionModel,
      compactionReasoning: config.compactionReasoning,
    },
  };
}

function isCancelResult(value: unknown): boolean {
  return Boolean(value && typeof value === "object" && "cancel" in value && (value as { cancel?: unknown }).cancel === true);
}

export default async function registerOpenAIRemoteCompaction(pi: ExtensionAPI): Promise<void> {
  const agentDir = getAgentDir();
  const configPath = join(agentDir, CONFIG_BASENAME);
  const modules = await loadRuntimeModules(agentDir);
  let config = loadConfig(configPath);
  const state: AdapterState = {
    enabled: false,
    cwd: process.cwd(),
    promptSkills: [],
    config: buildAdapterConfig(modules.adapterConfig.readCodexConversionConfig(), config),
    codexTurnState: modules.turnState.createCodexTurnState(),
  };

  const reloadConfig = (): void => {
    config = loadConfig(configPath);
    state.config = buildAdapterConfig(modules.adapterConfig.readCodexConversionConfig(), config);
  };

  pi.on("session_start", async (_event, ctx) => {
    reloadConfig();
    state.cwd = ctx.cwd;
    state.pendingPiCompactionNativeWindow = undefined;
  });

  pi.on("session_before_compact", async (event, ctx) => {
    reloadConfig();
    state.cwd = ctx.cwd;
    if (!isEligibleModel(ctx.model, config)) return undefined;

    const result = await modules.compaction.handleCodexSessionBeforeCompact(event, ctx, state, pi);
    if (config.fallbackToPi && !event.signal.aborted && isCancelResult(result)) {
      ctx.ui.notify("OpenAI remote compaction was unavailable; falling back to Pi compaction.", "warning");
      return undefined;
    }
    return result;
  });

  pi.on("before_provider_request", async (event, ctx) => {
    reloadConfig();
    state.cwd = ctx.cwd;
    if (!config.enabled) return undefined;

    const fallbackPayload = await modules.compaction.injectPendingNativeWindowIntoPiCompactionRequest(
      event.payload,
      ctx,
      state,
    );
    if (fallbackPayload !== undefined) return fallbackPayload;
    return modules.compaction.rewriteCodexCompactedProviderRequest(event.payload, ctx, state);
  });

  pi.on("session_compact", async (event) => {
    state.pendingPiCompactionNativeWindow = undefined;
    if (!event.fromExtension || !modules.compactionTypes.isNativeCompactionDetails(event.compactionEntry.details)) return;
    pi.sendMessage({
      customType: modules.compactionTypes.NATIVE_COMPACTION_DISPLAY_MESSAGE_TYPE,
      content: modules.compactionTypes.NATIVE_COMPACTION_DISPLAY_TEXT,
      display: true,
      details: { compactionEntryId: event.compactionEntry.id },
    }, { triggerTurn: false });
  });
}
