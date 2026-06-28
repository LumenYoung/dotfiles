---
name: iwe-kb-bootstrap
description: Load this before any iwe operation against the knowledge base so the agent discovers the correct instruction entrypoint for the active iwe access profile.
---

# IWE KB Bootstrap

## Access profiles

The knowledge base intentionally supports two `iwe` access profiles:

1. **Full profile**: can retrieve the root instruction document at key `AGENTS`.
2. **Work profile**: cannot see `AGENTS`; it can retrieve work-scoped entrypoints such as `Work/INDEX`.

The absence of `AGENTS` is intentional access control, not an error.

## Bootstrap procedure

Before doing any other `iwe` read, search, create, update, delete, attach, extract, inline, squash, tree, or stats operation:

1. Try to retrieve the exact key `AGENTS`.
   - In filesystem terms this corresponds to `AGENTS.md`, but `iwe` document keys omit the `.md` suffix.
   - If `AGENTS` is available, treat it as the canonical root instructions and follow it.
   - After reading `AGENTS`, do not treat this skill as an independent source of additional rules.
2. If `AGENTS` is unavailable, retrieve the exact key `Work/INDEX`.
   - Treat this as the intentional work-profile fallback.
   - Follow its work-scope and persistence rules.
