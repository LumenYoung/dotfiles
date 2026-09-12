<pi-intercom>
Coordinate with other local pi sessions on related codebases. Use `/skill:pi-intercom` for patterns.

**When:** Same codebase (parallel work), reference codebase (consulting patterns), related repos (shared libraries).

**Not when:** Unrelated codebases, trivial questions, or when you can proceed independently.

**Principle:** Prefer `send` for notifications; `ask` only when blocked waiting for input.
</pi-intercom>

## Implementation review subagents

After substantial implementation work, use `impl-reality-checker` and `impl-quality-reviewer` to verify that the work is actually implemented and not over-engineered. For small, localized code changes, test and inspect the change yourself instead of launching subagents when direct validation is faster and sufficient.

## Subagent and workflow timeouts

Foreground and plain single-agent async runs default to a 30-minute runtime deadline. Async composite workflows have no default top-level deadline, but their children remain individually bounded; an explicit workflow `timeoutMs` also bounds its children by the remaining time. For substantial workloads, set explicit `timeoutMs` values at the relevant workflow and/or child level with reasonable margin.

When a child fails solely due to its runtime deadline, inspect its status and partial workspace changes, then resume it with a new timeout only when reported resumable. When a composite workflow times out, inspect its receipt or status and recover resumable children in a new workflow; the JavaScript workflow continuation itself is not persisted. A `bg_wait` window expiring does not stop the run.

## Audience-relevant context

Write handoffs and durable artifacts for the recipient's task, not as a recap of the conversation. Preserve the context they need to act or understand correctly, including relevant constraints, rationale, evidence, and uncertainty.

Apply user corrections to your understanding; do not automatically carry the correction history or rejected interpretation into the output. Include past failures, alternatives, or negative statements only when they still explain the current system or affect the recipient's decisions or next actions—not merely because they were discussed or emphasized.

Before finalizing, check both: what missing context would force the recipient to guess, and what included detail serves only to recount this session?

## Documentation writing

Delegate substantial creation or revision of local durable documentation—including READMEs, tutorials, how-to guides, references, explanations, ADRs, and migration guides—to `document-writer` in foreground/blocking mode with forked context. Give it the intended artifact and target files rather than a scripted rewrite. Small, localized documentation fixes may be handled directly. 

Use `iwe-page-editor` for IWE updates.

## IWE knowledge-base workflow

Delegate broad, unfamiliar, or cross-note discovery to `iwe-searcher` in foreground/blocking mode. Treat its handoff as retrieval guidance: retrieve and inspect the relevant notes yourself before relying on them. Once the relevant keys are known, use bounded direct IWE retrieval rather than delegating repeated discovery, and pass exact keys to non-exploratory subagents.

Delegate every IWE mutation to `iwe-page-editor` in foreground/blocking mode with forked context. Give it the intended outcome, relevant keys, and constraints rather than prescribing tool operations. The editor owns those pages for the delegated run; do not edit them concurrently.

After the editor returns, retrieve and review every changed page yourself and address any material graph warnings or unresolved issues.
