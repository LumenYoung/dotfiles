import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export type HerdrContext =
  | { kind: "none" }
  | { kind: "unknown"; reason: string }
  | { kind: "herdr-core"; terminalId: string }
  | { kind: "herdr-app"; terminalId: string; spaceId: string; tabId: string }
  | { kind: "herdr-legacy"; paneId: string; workspaceId: string; tabId: string };

type Probe = (
  command: string,
  args: string[],
  options: { timeout: number; maxBuffer: number },
) => Promise<{ code: number; stdout: string; killed: boolean }>;

const PROBE_OPTIONS = { timeout: 1500, maxBuffer: 64 * 1024 };

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonempty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

// All probes are read-only, bounded, and explicitly targeted at inherited caller context.
export async function detectHerdrContext(
  env: NodeJS.ProcessEnv,
  exec: Probe,
): Promise<HerdrContext> {
  const hasCore = Boolean(env.HC_TERMINAL_ID || env.HC_TERMINAL_SOCKET);
  const hasLegacy = Boolean(env.HERDR_ENV === "1" || env.HERDR_PANE_ID || env.HERDR_SOCKET_PATH);
  if (hasCore && hasLegacy) {
    return { kind: "unknown", reason: "Both herdr-core and older Herdr markers are inherited; no interface was selected." };
  }
  if (!hasCore && !hasLegacy) return { kind: "none" };

  try {
    if (hasCore) {
      if (!nonempty(env.HC_TERMINAL_ID) || !nonempty(env.HC_TERMINAL_SOCKET)) {
        return { kind: "unknown", reason: "Core caller markers are incomplete; both terminal ID and socket are required." };
      }
      // hc uses HC_SOCKET for lookup; HC_TERMINAL_SOCKET alone does not select its endpoint.
      const result = await exec("env", [`HC_SOCKET=${env.HC_TERMINAL_SOCKET}`, "hc", "get", env.HC_TERMINAL_ID, "--json"], PROBE_OPTIONS);
      if (result.killed || result.code !== 0) throw new Error("probe failed");
      const terminal: unknown = JSON.parse(result.stdout);
      if (!record(terminal) || terminal.address !== env.HC_TERMINAL_ID || terminal.state !== "live") {
        throw new Error("terminal identity or state not confirmed");
      }
      if (!record(terminal.labels)) throw new Error("terminal labels not confirmed");
      const labels = terminal.labels;
      const spaceId = labels["herdr.space"];
      const tabId = labels["herdr.tab"];
      if (nonempty(spaceId) && nonempty(tabId)) {
        return { kind: "herdr-app", terminalId: env.HC_TERMINAL_ID, spaceId, tabId };
      }
      if ("herdr.space" in labels || "herdr.tab" in labels) {
        return { kind: "unknown", reason: "The core terminal has incomplete Herdr app membership labels." };
      }
      return { kind: "herdr-core", terminalId: env.HC_TERMINAL_ID };
    }

    if (env.HERDR_ENV !== "1" || !nonempty(env.HERDR_PANE_ID) || !nonempty(env.HERDR_SOCKET_PATH)) {
      return { kind: "unknown", reason: "Older Herdr caller markers are incomplete." };
    }
    // --current resolves inherited caller identity, including a pane moved since process startup.
    const result = await exec("herdr", ["pane", "current", "--current"], PROBE_OPTIONS);
    if (result.killed || result.code !== 0) throw new Error("probe failed");
    const response: unknown = JSON.parse(result.stdout);
    const pane = record(response) && record(response.result) ? response.result.pane : undefined;
    if (!record(pane) || !nonempty(pane.pane_id) || !nonempty(pane.workspace_id) || !nonempty(pane.tab_id)) {
      throw new Error("pane identity not confirmed");
    }
    return { kind: "herdr-legacy", paneId: pane.pane_id, workspaceId: pane.workspace_id, tabId: pane.tab_id };
  } catch {
    return { kind: "unknown", reason: "Inherited Herdr context could not be verified (CLI unavailable, failed, timed out, or returned an invalid identity)." };
  }
}

export function buildHerdrInstructions(context: HerdrContext, home = homedir(), appHome = process.env.HERDR_APP_HOME): string | undefined {
  if (context.kind === "none") return undefined;
  if (context.kind === "unknown") {
    return [
      "Herdr environment: unconfirmed.",
      context.reason,
      "Do not claim this process is outside Herdr, choose a control interface, or target a focused pane on this evidence.",
      "If Herdr operations are requested, resolve the caller context with read-only checks or ask the user. /reload repeats detection.",
    ].join("\n");
  }

  const lines = [
    `Herdr environment: ${context.kind} (verified at session initialization).`,
    "The inherited caller context identifies a host terminal, not proof that this process owns a separate visible pane or is its foreground agent; nested/headless agents can inherit it.",
  ];
  if (context.kind === "herdr-legacy") {
    lines.push(
      `Caller pane/workspace/tab: ${JSON.stringify({ pane: context.paneId, workspace: context.workspaceId, tab: context.tabId })}.`,
      "Use the older `herdr` CLI, not `herdr-app` or `hc`. Before relevant operations, load the herdr-legacy skill and run `herdr --skill` for the installed CLI's manual.",
      "Use `herdr pane current --current` for live caller identity (pane moves can change IDs); target --current or explicit returned IDs, never the UI-focused pane by default.",
      "Do not run bare `herdr` for discovery: it launches/attaches the TUI. Use `herdr --help` or the relevant command group's help.",
    );
  } else {
    lines.push(`Core terminal ID: ${JSON.stringify(context.terminalId)}. This is not a desktop pane ID or an older Herdr pane ID.`);
    if (context.kind === "herdr-app") {
      lines.push(
        `App membership labels: ${JSON.stringify({ space: context.spaceId, tab: context.tabId })}.`,
        "Use `herdr-app` for desktop spaces/tabs/panes and `hc` for core-terminal operations; do not apply the older `herdr` skill or its HERDR_ENV requirement.",
        "Before relevant operations, load the herdr-app skill; use `herdr-app --skill`, `herdr-app commands`, and `hc --skill` for installed-version guidance.",
        `Before app configuration changes, read ${JSON.stringify(join(appHome || join(home, ".config", "herdr-app"), "AGENTS.md"))}. It is app-generated and overwritten at startup; do not edit it for persistent agent policy.`,
      );
    } else {
      lines.push(
        "No Herdr app membership labels were found; only herdr-core context is confirmed. Do not infer desktop membership from `herdr-app status` or from the CLI being installed.",
        "Before relevant terminal operations, load the herdr-core skill and run `hc --skill`. Do not substitute the older `herdr` CLI or desktop pane commands.",
      );
    }
    lines.push('Bind core lookups to the inherited endpoint: `HC_SOCKET="$HC_TERMINAL_SOCKET" hc get "$HC_TERMINAL_ID" --json`. Use that endpoint for core operations; do not fall back to the default socket. Discover app pane mappings explicitly when needed; never substitute the focused pane.');
  }
  lines.push(
    "Environment awareness does not authorize terminal control. Only use Herdr control features when the user explicitly asks for Herdr or terminal/pane operations, not merely because background work or delegation could help.",
    "Inspect targets before sending input. Do not close other people's panes, stop servers, or restart Herdr without explicit authorization; avoid focus changes unless requested.",
    "Detection is cached until session initialization or /reload; recheck live IDs before mutations if topology may have changed.",
  );
  return lines.join("\n");
}

export default function herdrContext(pi: ExtensionAPI) {
  let context: HerdrContext = { kind: "none" };
  let instructions: string | undefined;

  pi.on("session_start", async (_event, ctx) => {
    context = await detectHerdrContext(process.env, (command, args, options) => pi.exec(command, args, options));
    instructions = buildHerdrInstructions(context);
    if (context.kind === "unknown" && ctx.hasUI) {
      ctx.ui.notify(`Herdr context unconfirmed: ${context.reason}`, "warning");
    }
  });

  pi.on("resources_discover", (_event, ctx) => {
    if (context.kind === "none" || context.kind === "unknown") return { skillPaths: [] };
    const skill = join(homedir(), ".config", "optin-skills", "herdr", context.kind, "SKILL.md");
    if (!existsSync(skill)) {
      if (ctx.hasUI) ctx.ui.notify(`Herdr skill adapter missing: ${skill}. Propagate dotfiles optin-skills, then /reload.`, "warning");
      return { skillPaths: [] };
    }
    return { skillPaths: [skill] };
  });

  pi.on("before_agent_start", (event) => {
    if (instructions) event.systemPromptOptions.sections.herdr_environment = instructions;
    else delete event.systemPromptOptions.sections.herdr_environment;
  });
}
