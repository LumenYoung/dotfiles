import { join } from "node:path";
import {
  getAgentDir,
  type ExtensionAPI,
} from "@earendil-works/pi-coding-agent";
import { isEligibleModel, loadConfig } from "./config.ts";
import {
  COMPACTION_DISPLAY_ENTRY_TYPE,
  filterLegacyCompactionDisplayMessages,
  registerCompactionDisplay,
} from "./display.ts";
import { shouldFallbackToPi } from "./fallback.ts";
import { createCodexCompactionBridge } from "./upstream/codex-3.0.5.ts";

const CONFIG_BASENAME = "openai-remote-compaction.json";

export default async function registerOpenAIRemoteCompaction(pi: ExtensionAPI): Promise<void> {
  const agentDir = getAgentDir();
  const configPath = join(agentDir, CONFIG_BASENAME);
  let config = loadConfig(configPath);
  const bridge = await createCodexCompactionBridge(agentDir, config);
  await registerCompactionDisplay(pi);

  const reloadConfig = (): void => {
    config = loadConfig(configPath);
  };

  pi.on("context", async (event) => {
    const messages = filterLegacyCompactionDisplayMessages(
      event.messages,
      bridge.legacyDisplayMessageType,
    );
    return messages.length === event.messages.length ? undefined : { messages };
  });

  pi.on("session_start", async (_event, ctx) => {
    reloadConfig();
    bridge.resetSession(config, ctx);
  });

  pi.on("session_before_compact", async (event, ctx) => {
    reloadConfig();
    bridge.update(config, ctx);
    if (!isEligibleModel(ctx.model, config)) return undefined;

    const result = await bridge.compact(event, ctx, pi);
    if (shouldFallbackToPi(result, {
      enabled: config.fallbackToPi,
      signalAborted: event.signal.aborted,
      hasNativeCheckpoint: bridge.hasNativeCompactionEntry(ctx.sessionManager.getBranch()),
    })) {
      ctx.ui.notify("OpenAI remote compaction was unavailable; falling back to Pi compaction.", "warning");
      return undefined;
    }
    return result;
  });

  pi.on("before_provider_request", async (event, ctx) => {
    reloadConfig();
    if (!config.enabled) return undefined;
    bridge.update(config, ctx);
    return bridge.rewriteRequest(event.payload, ctx);
  });

  pi.on("session_compact", async (event) => {
    bridge.clearPendingFallbackWindow();
    const details = event.compactionEntry.details;
    if (!event.fromExtension || !bridge.isNativeCompactionDetails(details)) return;
    pi.appendEntry(COMPACTION_DISPLAY_ENTRY_TYPE, {
      compactionEntryId: event.compactionEntry.id,
      content: bridge.displayText,
      usage: bridge.getUsage(details),
    });
  });
}
