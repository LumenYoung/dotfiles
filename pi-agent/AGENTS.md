# Pi Global Instructions

## IWE knowledge-base search

For broad searches in IWE, especially when you lack enough local context to answer directly, delegate the search to the `iwe-searcher` subagent in foreground/blocking mode. Do not launch it with `async: true` or `--bg` unless the user explicitly asks for background work.

The `iwe-searcher` subagent should find the most relevant IWE note for the current query and return a compact handoff: the note path/URI, an at-most-3-sentence content summary, and a brief description of the relevant note's graph structure so the main agent can retrieve and inspect the note directly.

When calling `iwe-searcher`, include the current query and any already-known local context. The subagent should first orient through the IWE bootstrap/profile instructions and index notes such as `Work/INDEX` or relevant `AGENTS` notes, use metadata-only broad search with a larger limit, and only retrieve full content for the best candidate notes. If the user explicitly asks for a paper or literature note, the subagent should start in `Literatures` and `Literature Notes`.
