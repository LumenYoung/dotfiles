---
name: html
description: Create or redesign a self-contained single-file HTML artifact for a report, explainer, landing page, presentation, tool, or mixed artifact. Available only when the user explicitly invokes /skill:html.
disable-model-invocation: true
license: MIT
---

# Effective HTML: HTML

## Pi-specific adapter

This adapter deliberately keeps the upstream Effective HTML workflow out of Pi's model-advertised skill list. Use it only after the user explicitly invokes `/skill:html`; do not activate it from an ordinary request.

## Load the upstream workflow

Read and follow the canonical upstream workflow in full before continuing: [`SKILL.md`](../../../../skills/vendor/effective-html/skills/html/SKILL.md).

The upstream repository is vendored at `skills/vendor/effective-html`, pinned by this dotfiles repository, and is distributed under its [MIT License](../../../../skills/vendor/effective-html/LICENSE). Treat this adapter as the Pi visibility boundary; do not copy or modify the vendored workflow here.
