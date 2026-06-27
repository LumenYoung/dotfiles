#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

function usage() {
  console.error('Usage: node scripts/validate-report-html.mjs <report.html>');
  process.exit(2);
}

const target = process.argv[2];
if (!target || process.argv.includes('-h') || process.argv.includes('--help')) usage();
const html = await readFile(path.resolve(target), 'utf8');
const errors = [];

if (!/<meta\s+name=["']viewport["'][^>]*content=["'][^"']*width=device-width/i.test(html)) {
  errors.push('Missing responsive viewport meta tag.');
}

const style = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(m => m[1]).join('\n');
if (!style) errors.push('Missing inline <style> block.');

const vars = new Map();
for (const match of style.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) vars.set(match[1], match[2].trim());
for (const name of ['--bg', '--paper', '--ink', '--muted', '--line', '--accent']) {
  if (!vars.has(name)) errors.push(`Missing CSS variable ${name}.`);
}

function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function rule(selector) {
  const re = new RegExp(`(?:^|})\\s*${escapeRegex(selector)}\\s*\\{([\\s\\S]*?)\\}`, 'm');
  return style.match(re)?.[1] ?? '';
}
function prop(body, name) {
  const re = new RegExp(`${name}\\s*:\\s*([^;]+);`);
  return body.match(re)?.[1]?.trim();
}
function resolveColor(value) {
  if (!value) return null;
  const varName = value.match(/var\((--[\w-]+)\)/)?.[1];
  if (varName) return resolveColor(vars.get(varName));
  const hex = value.match(/#(?:[0-9a-f]{3}|[0-9a-f]{6})\b/i)?.[0];
  return hex ? expandHex(hex) : null;
}
function expandHex(hex) {
  hex = hex.toLowerCase();
  if (hex.length === 4) return '#' + [...hex.slice(1)].map(c => c + c).join('');
  return hex;
}
function rgb(hex) {
  hex = expandHex(hex).slice(1);
  return [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
}
function lum(hex) {
  return rgb(hex).map(c => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
    .reduce((a, c, i) => a + c * [0.2126, 0.7152, 0.0722][i], 0);
}
function contrast(fg, bg) {
  const [l1, l2] = [lum(fg), lum(bg)].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
}
function checkSurface(selector, min = 4.5) {
  const body = rule(selector);
  if (!body) return errors.push(`Missing required selector ${selector}.`);
  const fg = resolveColor(prop(body, 'color'));
  const bg = resolveColor(prop(body, 'background(?:-color)?'));
  if (!fg) errors.push(`${selector} must declare an explicit hex/var foreground color.`);
  if (!bg) errors.push(`${selector} must declare an explicit hex/var background color.`);
  if (fg && bg) {
    const ratio = contrast(fg, bg);
    if (ratio < min) errors.push(`${selector} contrast ${ratio.toFixed(2)} is below ${min}:1 (${fg} on ${bg}).`);
  }
}

for (const selector of ['.surface-light', '.surface-dark', '.surface-accent', '.tldr', '.section-title', '.metric', '.callout']) {
  checkSurface(selector);
}

for (const selector of ['h1', 'h2', 'h3']) {
  const body = rule(selector);
  const color = prop(body, 'color');
  if (color && color !== 'inherit') errors.push(`${selector} should use color: inherit; avoid global heading colors overriding surface colors.`);
}

if (!/class=["'][^"']*surface-(light|dark|accent|blue|green|purple)/.test(html)) {
  errors.push('No surface-* classes found in body; use explicit surface classes for major blocks.');
}

if (errors.length) {
  console.error(`HTML report validation failed for ${target}:`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log(`HTML report validation passed: ${target}`);
