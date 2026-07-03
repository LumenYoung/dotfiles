<pi-intercom>
Coordinate with other local pi sessions on related codebases. Use `/skill:pi-intercom` for patterns.

**When:** Same codebase (parallel work), reference codebase (consulting patterns), related repos (shared libraries).

**Not when:** Unrelated codebases, trivial questions, or when you can proceed independently.

**Principle:** Prefer `send` for notifications; `ask` only when blocked waiting for input.
</pi-intercom>

## Implementation review subagents

After substantial implementation work, use `impl-reality-checker` and `impl-quality-reviewer` to verify that the work is actually implemented and not over-engineered. For small, localized code changes, test and inspect the change yourself instead of launching subagents when direct validation is faster and sufficient.

## IWE knowledge-base search

For broad searches in IWE, especially when you lack enough local context to answer directly, delegate the search to the `iwe-searcher` subagent in foreground/blocking mode. Do not launch it with `async: true` or `--bg` unless instructed. Even if you would searching yourselfs, start search with meta data only.

The `iwe-searcher` subagent should find the most relevant IWE notes for the current query and return a compact handoff: at most 10 notes unless otherwise specified, each with a note path relative to the SilverBullet/IWE workspace root and a compact summary so the main agent can retrieve and inspect the note directly. It should include a compact tree-view graph only when the note connects to other relevant notes; isolated notes do not need a graph.

When calling `iwe-searcher`:
- Include the current query and any relevant context.
- For paper/literature queries, start in `Literatures` and `Literature Notes`.
