<pi-intercom>
Coordinate with other local pi sessions on related codebases. Use `/skill:pi-intercom` for patterns.

**When:** Same codebase (parallel work), reference codebase (consulting patterns), related repos (shared libraries).

**Not when:** Unrelated codebases, trivial questions, or when you can proceed independently.

**Principle:** Prefer `send` for notifications; `ask` only when blocked waiting for input.
</pi-intercom>

## Implementation review subagents

After substantial implementation work, use `impl-reality-checker` and `impl-quality-reviewer` to verify that the work is actually implemented and not over-engineered. For small, localized code changes, test and inspect the change yourself instead of launching subagents when direct validation is faster and sufficient.

## IWE knowledge-base workflow

Delegate broad, unfamiliar, or cross-note discovery to the `iwe-searcher` subagent in foreground/blocking mode. Do not launch it asynchronously unless instructed. Once the relevant keys and context are known, use IWE directly for targeted search and retrieval rather than delegating repeatedly.

Keep every IWE search and retrieval bounded. Set finite document and token limits, start small, and increase them only when the initial results are insufficient. Never project full content across a broad or unlimited result set.

The searcher should return a compact handoff of at most 10 workspace-relative note paths with short summaries, adding graph context only when it materially helps. Treat this as retrieval guidance: the main agent should retrieve and inspect the relevant notes before relying on or editing them.

The main agent owns all edits. Retrieve the latest note first; prefer narrow `iwe_query` block updates with exact selectors, `expect` guards, and `dry_run` for localized changes. Use whole-document `iwe_update` only when a complete rewrite is intentional, and use dedicated IWE tools for structural operations such as rename, extract, inline, and delete. Retrieve the result after editing to verify the change.
