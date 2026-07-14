import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const TAU_PACKAGE_PATH = join(
	process.env.PI_CODING_AGENT_DIR || join(homedir(), ".pi", "agent"),
	"npm",
	"node_modules",
	"tau-mirror",
	"extensions",
	"mirror-server.ts",
);

function registerDisabledNotice(pi: ExtensionAPI, reason: string) {
	pi.on("session_start", async (_event, ctx) => {
		console.warn(`[safe-tau] ${reason}`);
		ctx.ui.setStatus("mirror", "Tau disabled");
		ctx.ui.notify(`Tau disabled: ${reason}`, "warning");
	});
}

export default async function safeTau(pi: ExtensionAPI) {
	// Keep an explicit TAU_HOST override, but otherwise restrict Tau to loopback.
	if (!process.env.TAU_HOST?.trim()) {
		process.env.TAU_HOST = "127.0.0.1";
	}

	// Credentials must come from the environment. Do not let Tau fall back to
	// settings.json, and do not register any Tau commands or server hooks unless
	// both values are present.
	const user = process.env.TAU_USER?.trim();
	const pass = process.env.TAU_PASS;
	if (!user || !pass) {
		registerDisabledNotice(pi, "TAU_USER and TAU_PASS are required");
		return;
	}

	if (!existsSync(TAU_PACKAGE_PATH)) {
		registerDisabledNotice(pi, `package entry point not found at ${TAU_PACKAGE_PATH}`);
		return;
	}

	// tau-mirror is installed with its Pi extension filtered out in settings.json.
	// Loading it here keeps the upstream package unchanged while making this
	// credential check the only path that can register Tau.
	const { default: tau } = await import(pathToFileURL(TAU_PACKAGE_PATH).href);
	await tau(pi);
}
