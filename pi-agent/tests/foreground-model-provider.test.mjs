import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

// PI_SDK_ROOT=/path/to/pi-coding-agent node --test pi-agent/tests/foreground-model-provider.test.mjs
assert.ok(process.env.PI_SDK_ROOT, "Set PI_SDK_ROOT to the real Pi SDK package directory");
const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const configRoot = resolve(process.env.PI_CONFIG_ROOT ?? repo);
const settings = JSON.parse(readFileSync(join(configRoot, "pi-agent/settings.json")));
const subagentsSource = settings.packages.find(p => typeof p === "string" &&
  (p.endsWith("/Documents/git/pi-subagents") || p.startsWith("git:github.com/LumenYoung/pi-subagents@")));
assert.ok(subagentsSource, "The patched subagents fork must be selected");
const upstream = resolve(process.env.PI_SUBAGENTS_ROOT ?? (subagentsSource.startsWith("git:")
  ? join(repo, "pi-agent/git/github.com/LumenYoung/pi-subagents") : subagentsSource));
const home = mkdtempSync(join(tmpdir(), "pi-foreground-provider-"));
const agentDir = join(home, ".pi/agent");
mkdirSync(agentDir, { recursive: true });
Object.assign(process.env, {
  HOME: home, PI_CODING_AGENT_DIR: agentDir, PI_OFFLINE: "1",
  LUMENY_OPENAI_BASE_URL: "https://invalid.example/v1", LUMENY_OPENAI_API_KEY: "offline-test-only",
  LUMENY_OPENAI_MODEL_IDS: "gpt-5.6-sol,gpt-5.6-terra,gpt-6-astra",
});
let networkAttempts = 0;
globalThis.fetch = async () => { networkAttempts++; throw new Error("Network forbidden in provider test"); };
const sdkEntry = join(process.env.PI_SDK_ROOT, "dist/index.js");
const sdk = await import(pathToFileURL(sdkEntry).href);
const { createJiti } = createRequire(sdkEntry)("jiti");
const jiti = createJiti(import.meta.url, { alias: { "@earendil-works/pi-coding-agent": sdkEntry } });
const { buildInProcessChildLaunch } = await jiti.import(join(upstream, "src/runs/shared/child-launch.ts"));
const { createDefaultChildSessionFactory } = await jiti.import(join(upstream, "src/runs/shared/child-session.ts"));
after(() => { try { assert.equal(networkAttempts, 0); } finally { rmSync(home, { recursive: true, force: true }); } });

test("document-writer explicit provider resolves custom models before foreground session creation", async () => {
  const text = readFileSync(join(configRoot, "pi-agent/agents/document-writer.md"), "utf8");
  const paths = text.match(/^subagentOnlyExtensions: (.+)$/m)[1].split(",").map(x => x.trim());
  assert.ok(paths.some(x => x.endsWith("/extensions/lumeny-openai.ts")));
  // This control uses the actual factory, not manual provider registration.
  for (const withProvider of [false, true]) {
    const factory = createDefaultChildSessionFactory({ loadPiCodingAgent: async () => sdk });
    try {
      for (const id of ["gpt-5.6-sol", "gpt-5.6-terra", "gpt-6-astra"]) {
        const launch = buildInProcessChildLaunch({
          host: "parent", cwd: home, childAgentName: "document-writer", childIndex: 0,
          sessionEnabled: false, inheritProjectContext: false, inheritGlobalContext: false, inheritSkills: false,
          model: `lumeny-openai/${id}:high`, tools: ["read", "write"], hostAvailableBuiltins: ["read", "write"],
          subagentOnlyExtensions: withProvider ? paths : [],
        });
        // Model selection is normally projected by the executor into the session payload.
        launch.session.model = `lumeny-openai/${id}:high`;
        if (!withProvider) {
          await assert.rejects(factory.create(launch.session), /Model .*not found/);
        } else {
          const child = await factory.create(launch.session);
          assert.equal(child.modelId, `lumeny-openai/${id}`);
          await child.dispose();
        }
      }
    } finally { await factory.dispose(); }
  }
});
