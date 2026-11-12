import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const installer = fileURLToPath(new URL("../../install/cli/herdr_agent_skill.bash", import.meta.url));
const upstream = "---\nname: herdr\ndescription: legacy skill\n---\n# Herdr\n";

function sandbox(t) {
  const home = mkdtempSync(join(tmpdir(), "herdr-skill-install-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const bin = join(home, "bin");
  mkdirSync(bin);
  const curl = join(bin, "curl");
  writeFileSync(curl, '#!/usr/bin/env bash\nset -eu\nprintf "%s" "$MOCK_SKILL" > "$4"\n');
  chmodSync(curl, 0o755);
  const env = { ...process.env, HOME: home, CODEX_HOME: join(home, "custom-codex"), XDG_STATE_HOME: join(home, "state"), PATH: `${bin}:${process.env.PATH}`, MOCK_SKILL: upstream };
  const shared = join(home, ".agents/skills/herdr");
  const codex = join(env.CODEX_HOME, "skills/herdr/SKILL.md");
  const state = join(env.XDG_STATE_HOME, "dotfiles/herdr-skills");
  const run = (...args) => spawnSync("bash", [installer, ...args], { env, encoding: "utf8" });
  return { home, env, shared, codex, state, run };
}

function put(path, text) {
  mkdirSync(resolve(path, ".."), { recursive: true });
  writeFileSync(path, text);
}

test("bootstrap installs only Codex and archives the existing shared directory intact", (t) => {
  const s = sandbox(t);
  put(join(s.shared, "SKILL.md"), upstream + "local changes\n");
  put(join(s.shared, "extra.txt"), "preserve extras\n");
  const result = s.run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(existsSync(s.shared), false);
  assert.equal(readFileSync(s.codex, "utf8"), upstream);
  const backups = readdirSync(s.state);
  assert.equal(backups.length, 1);
  const archived = join(s.state, backups[0], "herdr");
  assert.equal(readFileSync(join(archived, "SKILL.md"), "utf8"), upstream + "local changes\n");
  assert.equal(readFileSync(join(archived, "extra.txt"), "utf8"), "preserve extras\n");
  assert.equal(s.run().status, 0);
  assert.deepEqual(readdirSync(s.state), backups, "idempotent migration creates no extra backup");
  assert.equal(existsSync(s.shared), false, "re-running bootstrap does not re-expose the skill to Pi");
});

test("migration-only performs no download and preserves the existing Codex skill", (t) => {
  const s = sandbox(t);
  put(join(s.shared, "SKILL.md"), upstream);
  put(s.codex, "local Codex content\n");
  s.env.MOCK_SKILL = "invalid download";
  const result = s.run("--migrate-shared-only");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(existsSync(s.shared), false);
  assert.equal(readFileSync(s.codex, "utf8"), "local Codex content\n");
  assert.equal(s.run("--migrate-shared-only").status, 0);
});

test("invalid download does not mutate either existing skill", (t) => {
  const s = sandbox(t);
  put(join(s.shared, "SKILL.md"), upstream);
  put(s.codex, "local Codex content\n");
  s.env.MOCK_SKILL = "not a skill";
  const result = s.run();
  assert.equal(result.status, 1);
  assert.equal(readFileSync(join(s.shared, "SKILL.md"), "utf8"), upstream);
  assert.equal(readFileSync(s.codex, "utf8"), "local Codex content\n");
  assert.equal(existsSync(s.state), false);
});

test("unrecognized shared directory is left untouched with an actionable error", (t) => {
  const s = sandbox(t);
  put(join(s.shared, "SKILL.md"), "---\nname: another-skill\n---\n");
  const result = s.run("--migrate-shared-only");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /relocat|move.*outside skill roots/);
  assert.equal(existsSync(s.shared), true);
  assert.equal(existsSync(s.state), false);
});

test("relative shared symlink is not moved and broken by migration", (t) => {
  const s = sandbox(t);
  const target = join(s.home, ".agents/skills/original");
  put(join(target, "SKILL.md"), upstream);
  symlinkSync("original", s.shared);
  const result = s.run("--migrate-shared-only");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /symlink/);
  assert.equal(readFileSync(join(s.shared, "SKILL.md"), "utf8"), upstream);
  assert.equal(existsSync(s.state), false);
});

test("unknown installer arguments cannot trigger migration", (t) => {
  const s = sandbox(t);
  put(join(s.shared, "SKILL.md"), upstream);
  assert.equal(s.run("--unknown").status, 2);
  assert.equal(existsSync(s.shared), true);
});
