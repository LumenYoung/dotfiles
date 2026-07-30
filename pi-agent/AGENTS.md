<pi-intercom>
Coordinate with other local pi sessions on related codebases. Use `/skill:pi-intercom` for patterns.

**When:** Same codebase (parallel work), reference codebase (consulting patterns), related repos (shared libraries).

**Not when:** Unrelated codebases, trivial questions, or when you can proceed independently.

**Principle:** Prefer `send` for notifications; `ask` only when blocked waiting for input.
</pi-intercom>

## Implementation review subagents

After substantial implementation work, use `impl-reality-checker` and `impl-quality-reviewer` to verify that the work is actually implemented and not over-engineered. For small, localized code changes, test and inspect the change yourself instead of launching subagents when direct validation is faster and sufficient.

## IWE knowledge-base workflow

Delegate broad, unfamiliar, or cross-note discovery to the `iwe-searcher` subagent in foreground/blocking mode. Do not launch it asynchronously unless instructed. Once the relevant keys and context are known, use IWE directly for targeted retrieval rather than delegating repeatedly.

Keep every IWE search and retrieval bounded. Set finite document and token limits, start small, and increase them only when the initial results are insufficient. Never project full content across a broad or unlimited result set.

The searcher should return a compact handoff of at most 10 workspace-relative note paths with short summaries, adding graph context only when it materially helps. Treat this as retrieval guidance: the main agent should retrieve and inspect the relevant notes before relying on them.

When spawning a builtin subagent with IWE access, pass the relevant page keys explicitly whenever they are already known. Non-exploratory roles should call `iwe_retrieve` with those exact keys and should not use its `search` or `fuzzy` modes unless the task explicitly assigns knowledge-base discovery. They may use `iwe_tree` for bounded local exploration around the supplied keys. Exploratory roles such as `scout` and `researcher` may use `iwe_find`, but must keep discovery and graph traversal bounded.

Delegate all IWE mutations to `iwe-page-editor` in foreground/blocking mode with forked context. This includes localized guarded block changes as well as whole-page rewrites, multi-section revisions, restructuring, consolidation, and coordinated edits across pages. Give it the overall intent and relevant keys rather than a fully scripted edit sequence. The editor owns the delegated IWE changes for that run; do not edit the same pages concurrently. For localized changes it should prefer narrow `iwe_query` block operations with exact selectors, `expect` guards, and `dry_run`; for larger coherent changes it may use whole-document or structural operations. After it returns, retrieve and review every changed page yourself rather than requiring the editor to paste the full results into its handoff.
