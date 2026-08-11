---
name: wayfinder
description: Plan work too large for one agent session as a durable map of decision tickets, then resolve one frontier ticket per session until the route to the destination is clear. Use explicitly for multi-session planning efforts, not ordinary single-session implementation.
license: references/LICENSE
metadata:
  upstream: https://github.com/mattpocock/skills/tree/main/skills/engineering/wayfinder
  adapted-from: 84fdeffd12f2ee307994d1eb6feb48173b6e0502
  local-integration: grill-with-docs
  disable-model-invocation: true
disable-model-invocation: true
---

# Wayfinder

Use Wayfinder when an effort is too large or uncertain for one agent session. It creates a durable **map** whose child **decision tickets** are resolved across later sessions. Wayfinding finds the route to a destination; it does not charge directly at the destination.

This is a locally governed adaptation of Matt Pocock's Wayfinder. Read [references/upstream.md](references/upstream.md) for provenance and local differences.

## Local integration rule

Assume the existing `grill-with-docs` skill is available.

- Use `grill-with-docs` whenever Wayfinder needs to name the destination, map the decision frontier with the human, or resolve a `grilling` ticket.
- Do not restate or reimplement generic interview, glossary, ADR, design-note, or domain-modeling instructions here. `grill-with-docs` owns that behavior.
- Wayfinder owns only the outer multi-session map: destination, decision tickets, blocking relationships, claims, frontier, fog of war, and resolution pointers.
- Use available repository-native research/prototype skills or subagents for `research` and `prototype` tickets. Do not require a particular companion skill name when the runtime provides an equivalent capability.

## Plan, don't do

Wayfinder is planning by default. A ticket resolves a decision or investigation needed to make the route clear. The map is complete when nothing material remains to decide before implementation can proceed.

Do not turn decision tickets into implementation slices. An effort may explicitly state in its map Notes that execution is included, but absent that override, stop at a decision-ready handoff.

## Tracker selection

Before creating or working a map:

1. Read the repository's issue-tracker guidance when present, especially `docs/agents/issue-tracker.md`.
2. Use that tracker's native child issue, blocking, assignment, comment, and close operations.
3. If no tracker guidance exists, use [references/local-markdown-tracker.md](references/local-markdown-tracker.md).

Do not require a separate setup skill merely to start a local map.

## Refer by name

Maps and tickets have human-readable titles. In narration and the map's Decisions-so-far, refer to tickets by linked title, not bare issue numbers or slugs. IDs remain inside links and tracker operations.

## The map

The map is the canonical low-resolution index for one effort. On issue trackers, label it `wayfinder:map`; on the local Markdown tracker, store it at `.scratch/<effort>/map.md`.

The map indexes resolved decisions but does not duplicate their full answers. Each detailed answer lives in exactly one resolved ticket.

```markdown
## Destination

<One or two lines describing what reaching the end of this map produces: a spec, a locked decision, or a change whose remaining route is clear.>

## Notes

<Domain, skills to consult, execution override if any, and standing preferences.>

## Decisions so far

- [<resolved ticket title>](link) — <one-line gist of the answer>

## Not yet specified

<In-scope fog that is visible but not yet precise enough to become a ticket.>

## Out of scope

<Work consciously ruled beyond this destination, with a reason and ticket link when applicable.>
```

Open tickets are discovered through the tracker's child/frontier query; do not copy the open-ticket list into the map.

## Decision tickets

A ticket must fit one agent session and resolve one precise question or prerequisite investigation.

```markdown
## Question

<The decision or investigation this ticket resolves.>
```

Each ticket has one type:

- **Grilling** — HITL conversation. Resolve with `grill-with-docs`; the agent must not answer the human's side for them.
- **Research** — AFK investigation of primary sources or local knowledge needed by a later decision.
- **Prototype** — HITL reaction to a deliberately cheap, throwaway artifact that raises discussion fidelity.
- **Task** — prerequisite work that must happen before a decision can be made. It belongs on the map only because it unblocks a decision, not because it delivers the destination.

Use tracker-native blocking relationships where available. A ticket is **unblocked** when all blockers are resolved. The **frontier** is the set of open, unblocked, unclaimed child tickets.

Claim a ticket before working it. On a remote tracker, assignment is the claim. On local Markdown, set `Status: claimed`.

## Fog of war

Do not pretend the complete ticket tree is visible at the start.

- Create a ticket when its question can be stated precisely now, even if blocked.
- Keep it in `Not yet specified` when the area is in scope but the question cannot yet be phrased precisely.
- Move it to `Out of scope` when it lies beyond the destination rather than merely beyond current visibility.

Resolving a ticket may make fog precise enough to graduate into one or more new tickets. Create those tickets only when they become specifiable.

## Invocation modes

Never resolve more than one non-research ticket per session.

### Chart a new map

Use this mode when the user supplies a loose, multi-session idea.

1. **Name the destination.** Run `grill-with-docs` until the destination and scope boundary are explicit.
2. **Map the first frontier breadth-first.** Use `grill-with-docs` to identify decisions whose prerequisites are already settled, blocked decisions that are already precise, and visible fog that is not yet precise.
3. If the route is already clear and fits one session, stop: Wayfinder overhead is unnecessary. Ask the user whether to proceed directly.
4. Create the map with Destination, Notes, empty Decisions-so-far, current fog, and Out of scope.
5. Create only the tickets that can be stated precisely now.
6. Wire blocking edges after ticket identities exist.
7. Launch independent research tickets in parallel when the runtime supports it; record their findings in the ticket or a linked repository artifact.
8. Stop after charting. Do not also resolve a HITL ticket in the charting session.

### Work through an existing map

Use this mode when the user provides a map URL/path, optionally with a ticket.

1. Load the map's low-resolution body, not every ticket.
2. If the user named a ticket, verify it is claimable. Otherwise choose the first frontier ticket in tracker order.
3. Claim it before doing work.
4. Resolve according to its type. For a Grilling ticket, invoke `grill-with-docs` and let it own the conversation and documentation updates.
5. Record the full answer on the ticket, mark it resolved/closed, and append one linked gist to Decisions-so-far.
6. Create and wire newly visible tickets. Graduate newly precise fog and remove the graduated text from Not yet specified.
7. If the resolution shows work is beyond the destination, close/rule it out and record it under Out of scope rather than Decisions-so-far.
8. Stop after the one ticket is resolved.

## Completion

A map is complete when:

- every child decision ticket is resolved or explicitly out of scope;
- `Not yet specified` is empty because all in-scope fog has either become resolved tickets or disappeared;
- Decisions-so-far provides a linked route through the detailed resolutions; and
- the destination can now be handed to planning/implementation without hidden product or architecture decisions.

Wayfinder completion is not implementation completion unless the map Notes explicitly opted into execution.
