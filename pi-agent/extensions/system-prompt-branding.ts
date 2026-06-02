import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const ORIGINAL = "You are an expert coding assistant operating inside pi, a coding agent harness.";
const REPLACEMENT = "You are an expert coding assistant operating inside a local coding workspace.";

export default function systemPromptBranding(pi: ExtensionAPI) {
	let warned = false;

	pi.on("before_agent_start", async (event, ctx) => {
		if (!event.systemPrompt.includes(ORIGINAL)) {
			if (!warned) {
				warned = true;
				const message =
					"[system-prompt-branding] Expected system prompt text not found; leaving prompt unchanged.";
				console.warn(message);
				ctx.ui.notify(message, "warning");
			}
			return undefined;
		}

		return {
			systemPrompt: event.systemPrompt.replace(ORIGINAL, REPLACEMENT),
		};
	});
}
