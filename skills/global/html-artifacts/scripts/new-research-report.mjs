#!/usr/bin/env node
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const skillDir = path.resolve(path.dirname(scriptPath), '..');
const templatePath = path.join(skillDir, 'references', 'research-report-base.html');

function usage() {
  console.error('Usage: node scripts/new-research-report.mjs <target.html> [--title "Title"] [--force]');
  process.exit(2);
}

const args = process.argv.slice(2);
if (args.length < 1 || args.includes('-h') || args.includes('--help')) usage();

const target = path.resolve(args[0]);
let title = path.basename(target, '.html').replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
let force = false;
for (let i = 1; i < args.length; i++) {
  if (args[i] === '--force') force = true;
  else if (args[i] === '--title') {
    if (!args[i + 1]) usage();
    title = args[++i];
  } else usage();
}

if (!force) {
  try {
    await access(target);
    console.error(`Refusing to overwrite existing file: ${target}\nPass --force to overwrite.`);
    process.exit(1);
  } catch {}
}

let html = await readFile(templatePath, 'utf8');
html = html.replaceAll('{{TITLE}}', title);
await mkdir(path.dirname(target), { recursive: true });
await writeFile(target, html, 'utf8');
console.log(target);
