import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type {
  Api,
  AssistantMessage,
  AssistantMessageEventStream,
  Context,
  Model,
  ProviderHeaders,
  SimpleStreamOptions,
} from "@earendil-works/pi-ai";
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

type RequestBodyModule = {
  buildRequestBody<TApi extends Api>(
    model: Model<TApi>,
    context: Context,
    options?: SimpleStreamOptions,
  ): Record<string, unknown>;
};

type StreamEventsModule = {
  processCodexResponsesStream<TApi extends Api>(
    events: AsyncIterable<Record<string, unknown>>,
    output: AssistantMessage,
    stream: AssistantMessageEventStream,
    model: Model<TApi>,
    options?: SimpleStreamOptions,
  ): Promise<void>;
  assertSuccessfulCodexOutput(output: AssistantMessage): void;
};

type PiAIModule = {
  createAssistantMessageEventStream(): AssistantMessageEventStream;
};

type OpenAIClient = {
  responses: {
    create(body: unknown, options: unknown): {
      withResponse(): Promise<{
        data: AsyncIterable<Record<string, unknown>>;
        response: { status: number; headers: Headers };
      }>;
    };
  };
};

type OpenAIModule = {
  default: new (options: {
    apiKey: string;
    baseURL?: string;
    defaultHeaders?: ProviderHeaders;
  }) => OpenAIClient;
};

type RuntimeModules = {
  compaction: CompactionModule;
  compactionTypes: CompactionTypesModule;
  adapterConfig: AdapterConfigModule;
  turnState: TurnStateModule;
  requestBody: RequestBodyModule;
  streamEvents: StreamEventsModule;
  piAI: PiAIModule;
  openAI: OpenAIModule;
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
  const packageRequire = createRequire(packageJsonPath);
  const openAIEntry = packageRequire.resolve("openai");
  const [compaction, compactionTypes, adapterConfig, turnState, requestBody, streamEvents, piAI, openAI] = await Promise.all([
    import(moduleUrl(distRoot, "adapter/compaction/compaction.js")) as Promise<CompactionModule>,
    import(moduleUrl(distRoot, "adapter/compaction/types.js")) as Promise<CompactionTypesModule>,
    import(moduleUrl(distRoot, "adapter/activation/config.js")) as Promise<AdapterConfigModule>,
    import(moduleUrl(distRoot, "providers/openai-codex/turn-state.js")) as Promise<TurnStateModule>,
    import(moduleUrl(distRoot, "providers/openai-codex/request-body.js")) as Promise<RequestBodyModule>,
    import(moduleUrl(distRoot, "providers/openai-codex/stream-events.js")) as Promise<StreamEventsModule>,
    import("@earendil-works/pi-ai") as Promise<PiAIModule>,
    import(pathToFileURL(openAIEntry).href) as Promise<OpenAIModule>,
  ]);
  return { compaction, compactionTypes, adapterConfig, turnState, requestBody, streamEvents, piAI, openAI };
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

type RegisteredProviderConfigWithStream = Record<string, unknown> & {
  api?: unknown;
  streamSimple?: unknown;
};

type CompactionStream = <TApi extends Api>(
  model: Model<TApi>,
  context: Context,
  options?: SimpleStreamOptions,
) => AssistantMessageEventStream;

function initialAssistantMessage<TApi extends Api>(model: Model<TApi>): AssistantMessage {
  return {
    role: "assistant",
    content: [],
    api: model.api,
    provider: model.provider,
    model: model.id,
    usage: {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens: 0,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    },
    stopReason: "pending",
    timestamp: Date.now(),
  };
}

function mergeHeaders(...groups: Array<ProviderHeaders | undefined>): ProviderHeaders {
  const headers = new Map<string, { name: string; value: string | null }>();
  for (const group of groups) {
    for (const [name, value] of Object.entries(group ?? {})) {
      headers.set(name.toLowerCase(), { name, value });
    }
  }
  return Object.fromEntries([...headers.values()].map(({ name, value }) => [name, value]));
}

function hasHeader(headers: ProviderHeaders, name: string): boolean {
  const expected = name.toLowerCase();
  return Object.entries(headers).some(
    ([key, value]) => key.toLowerCase() === expected && value !== null && value.trim() !== "",
  );
}

function resolveClientAuth(provider: string, apiKey: string | undefined, headers: ProviderHeaders): {
  apiKey: string;
  headers: ProviderHeaders;
} {
  if (apiKey) return { apiKey, headers };
  if (hasHeader(headers, "authorization")) return { apiKey: "unused", headers };
  throw new Error(`No API key for provider: ${provider}`);
}

/**
 * A narrow, unregistered Responses transport used only by native compaction.
 * Pi's standard Responses stream intentionally converts raw output items into
 * assistant content and does not forward the upstream-only onOutputItemDone
 * callback. V2 compaction needs that callback to retain the encrypted
 * `compaction` item, so this transport reuses the pinned upstream request and
 * event processors while avoiding provider registration or active-tool changes.
 */
export function createCompactionResponsesStream(modules: Pick<RuntimeModules, "requestBody" | "streamEvents" | "piAI" | "openAI">): CompactionStream {
  return function streamCompactionResponses<TApi extends Api>(
    model: Model<TApi>,
    context: Context,
    options?: SimpleStreamOptions,
  ) {
    const stream = modules.piAI.createAssistantMessageEventStream();
    const output = initialAssistantMessage(model);

    void (async () => {
      try {
        let headers = mergeHeaders(model.headers, options?.headers);
        const builtBody = modules.requestBody.buildRequestBody(model, context, options);
        const { client_metadata: _clientMetadata, ...genericResponsesBody } = builtBody;
        let body = genericResponsesBody;
        const rewritten = await options?.onPayload?.(body, model);
        if (rewritten !== undefined) body = rewritten as Record<string, unknown>;

        const auth = resolveClientAuth(model.provider, options?.apiKey, headers);
        headers = auth.headers;
        const client = new modules.openAI.default({
          apiKey: auth.apiKey,
          baseURL: model.baseUrl,
          defaultHeaders: headers,
        });
        const response = await client.responses.create(body, {
          ...(options?.signal ? { signal: options.signal } : {}),
          ...(options?.timeoutMs !== undefined ? { timeout: options.timeoutMs } : {}),
          maxRetries: options?.maxRetries ?? 0,
        }).withResponse();

        await options?.onResponse?.({
          status: response.response.status,
          headers: Object.fromEntries(response.response.headers.entries()),
        }, model);

        stream.push({ type: "start", partial: output });
        await modules.streamEvents.processCodexResponsesStream(
          response.data,
          output,
          stream,
          model,
          options,
        );
        if (options?.signal?.aborted) throw new Error("Request was aborted");
        modules.streamEvents.assertSuccessfulCodexOutput(output);
        stream.push({ type: "done", reason: output.stopReason, message: output });
        stream.end();
      } catch (error) {
        for (const block of output.content) {
          if (typeof block === "object" && block !== null) {
            delete (block as { partialJson?: unknown }).partialJson;
          }
        }
        output.stopReason = options?.signal?.aborted ? "aborted" : "error";
        output.errorMessage = error instanceof Error ? error.message : String(error);
        stream.push({ type: "error", reason: output.stopReason, error: output });
        stream.end();
      }
    })();

    return stream;
  };
}

/**
 * pi-codex-conversion 3.0.5 resolves the V2 transport only from the raw provider
 * registration. Supply the compaction-only stream through a read-only registry
 * view, without registering, replacing, or mutating providers globally.
 */
export function withCompactionStreamRegistryFallback(
  ctx: ExtensionContext,
  compactionStream?: CompactionStream,
): ExtensionContext {
  const providerId = ctx.model?.provider;
  if (!providerId || ctx.model?.api !== "openai-responses" || !compactionStream) return ctx;

  const modelRegistry = ctx.modelRegistry;
  const registered = modelRegistry.getRegisteredProviderConfig(providerId) as RegisteredProviderConfigWithStream | undefined;
  if (typeof registered?.streamSimple === "function") return ctx;

  const registryView = Object.create(modelRegistry) as ExtensionContext["modelRegistry"];
  Object.defineProperty(registryView, "getRegisteredProviderConfig", {
    value(requestedProviderId: string): unknown {
      const config = modelRegistry.getRegisteredProviderConfig(requestedProviderId) as RegisteredProviderConfigWithStream | undefined;
      if (requestedProviderId !== providerId || typeof config?.streamSimple === "function") return config;
      return {
        ...config,
        api: "openai-responses",
        streamSimple: compactionStream,
      };
    },
  });

  const contextView = Object.create(ctx) as ExtensionContext;
  Object.defineProperty(contextView, "modelRegistry", { value: registryView });
  return contextView;
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
  const compactionStream = createCompactionResponsesStream(modules);
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
      return modules.compaction.handleCodexSessionBeforeCompact(
        event,
        withCompactionStreamRegistryFallback(ctx, compactionStream),
        state,
        pi,
      );
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
