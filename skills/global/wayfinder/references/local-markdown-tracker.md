# Local Markdown Wayfinder Tracker

Use this when the repository has no configured issue tracker guidance.

## Layout

```text
.scratch/<effort>/
├── map.md
└── issues/
    ├── 01-<ticket-slug>.md
    ├── 02-<ticket-slug>.md
    └── ...
```

## Map

`.scratch/<effort>/map.md` contains the Wayfinder map body: Destination, Notes, Decisions so far, Not yet specified, and Out of scope.

## Ticket

```markdown
# <Human-readable ticket title>

Type: research|prototype|grilling|task
Status: open|claimed|resolved|out-of-scope
Blocked by: <comma-separated ticket numbers, or none>

## Question

<The precise decision or investigation.>

## Answer

<Added only when resolved.>
```

Number tickets from `01`. The number is tracker identity, not the human-facing name.

## Operations

- **Create:** add one file under `issues/` with `Status: open`.
- **Block:** list blocker numbers in `Blocked by:`.
- **Frontier:** scan for tickets whose status is `open`, whose blockers are all `resolved`, and which are not claimed. Lowest number wins when the user did not choose.
- **Claim:** change `Status: open` to `Status: claimed` and save before work.
- **Resolve:** append the answer under `## Answer`, set `Status: resolved`, then append a linked one-line gist to the map's Decisions-so-far.
- **Rule out:** set `Status: out-of-scope`, add the reason under `## Answer`, and link it from the map's Out of scope section rather than Decisions-so-far.
- **Graduate fog:** remove the newly precise statement from Not yet specified as soon as its ticket or tickets are created.

Use repository-relative links from `map.md`, for example:

```markdown
- [Choose the state ownership boundary](issues/03-state-ownership.md) — Session runtime owns transient state; the management service owns durable metadata.
```
