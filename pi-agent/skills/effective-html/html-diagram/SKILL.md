---
name: html-diagram
description: Create a self-contained HTML diagram for relationships, sequence, topology, state, hierarchy, timelines, or quantitative structure. Available only when the user explicitly invokes /skill:html-diagram.
disable-model-invocation: true
license: MIT
---

# Effective HTML: HTML Diagram

## Pi-specific adapter

This adapter deliberately keeps the upstream Effective HTML workflow out of Pi's model-advertised skill list. Use it only after the user explicitly invokes `/skill:html-diagram`; do not activate it from an ordinary request.

## Load the upstream workflow

Read and follow the canonical upstream workflow in full before continuing: [`SKILL.md`](../../../../skills/vendor/effective-html/skills/html-diagram/SKILL.md).

The upstream repository is vendored at `skills/vendor/effective-html`, pinned by this dotfiles repository, and is distributed under its [MIT License](../../../../skills/vendor/effective-html/LICENSE). Treat this adapter as the Pi visibility boundary; do not copy or modify the vendored workflow here.
