---
name: iwe-kb-bootstrap
description: Load this before any iwe operation against the knowledge base so the agent discovers the correct instruction entrypoint for the active iwe access profile.
---

# IWE KB Bootstrap

## Bootstrap procedure

Before doing any other `iwe` read, search, create, update, delete, attach, extract, inline, squash, tree, or stats operation:

1. Retrieve the exact key `AGENTS` and follow it as the canonical instructions for the active knowledge-base profile.
   - In filesystem terms this corresponds to `AGENTS.md`, but IWE document keys omit the `.md` suffix.
   - After reading `AGENTS`, do not treat this skill as an independent source of additional rules.
2. If `AGENTS` is unavailable, stop and report that the active IWE profile is misconfigured. Do not guess another instruction entrypoint or continue with other IWE operations.
