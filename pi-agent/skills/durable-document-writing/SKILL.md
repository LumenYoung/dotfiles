---
name: durable-document-writing
description: Write or revise durable documentation, tutorials, how-to guides, references, explanations, ADRs, and migration guides from rich implementation context. Use when the author must separate reader-relevant instructions and stable facts from transient implementation history, debugging evidence, internal process, and AI-agent narration.
disable-model-invocation: true
---

# Durable Document Writing

Use inherited implementation context as source material, not publication-ready prose.

The goal is not to remove every implementation detail. The goal is to include only the detail appropriate for this artifact, its intended reader, and its expected lifetime.

## Establish the document contract

Before drafting, infer the contract from the latest explicit user intent, the delegated task, the target document, and applicable project instructions:

- **Artifact type:** tutorial, how-to, reference, explanation, README, ADR, design note, migration guide, changelog, postmortem, or implementation report.
- **Audience:** who will read it and what they already know.
- **Reader goal:** what they should be able to do, decide, or understand afterward.
- **Scope and exclusions:** what this artifact owns and what belongs elsewhere.
- **Time horizon:** durable current-state documentation or an explicitly historical/change-oriented artifact.
- **Authority:** verified current behavior, approved design intent, or clearly labeled proposal.
- **Required form:** terminology, tone, structure, examples, and level of detail.

Do not print this analysis unless the user asks for it. Ask for clarification only when a materially ambiguous contract would produce substantially different content.

## Triage inherited context

Classify inherited information internally by function:

1. **Artifact instructions** — user requirements that control the final document.
2. **Durable content** — stable facts, domain concepts, supported behavior, reader-relevant constraints, and approved decisions.
3. **Verification evidence** — code, tests, diffs, logs, tickets, internal symbols, and discussion used to verify durable content.
4. **Process-only context** — implementation chronology, debugging narration, abandoned attempts, agent activity, tool calls, reviewer exchanges, and incidental corrections to the assistant.
5. **Other-artifact material** — useful information whose natural home is a changelog, migration guide, ADR, design note, postmortem, implementation report, or progress note rather than the current document.

Implementation context is evidence, not automatically documentation content. A detail does not belong merely because it is true, appeared in the conversation, or demonstrates that work occurred.

Follow all applicable system, developer, project, and delegated-authority instructions. Within those constraints, reconcile the latest explicit artifact intent, the target document's established purpose, and verified current behavior. Do not silently guess through a material conflict; escalate it through the invoking agent's defined channel.

## Apply the inclusion gate

Include a detail only when all of these are true:

- it serves the intended reader's goal;
- it belongs in this artifact type;
- it is necessary for action, understanding, safety, troubleshooting, extension, operation, or the stable documented contract;
- it is stated at the least implementation-specific level that remains accurate and useful.

Ask:

- Would removing this make the document misleading, unusable, unsafe, or materially harder for its intended reader?
- Will this still matter after the current implementation session is forgotten?
- Is this reader information, or only authoring and verification evidence?
- Does it have a more natural home in another artifact?

Prefer omission over forced placement. Do not create an orphan paragraph or section merely because the source context contains a fact.

## Respect the artifact's dominant mode

Every document should have one dominant reader mode. Supporting material is allowed only when it enables that mode.

- **Tutorial:** provide one reliable learning path, necessary prerequisites, observable results, and enough explanation to keep the learner oriented. Omit architecture alternatives and unrelated implementation history.
- **How-to:** move a competent reader toward a specific result. Include necessary branches and operational edge cases; link or defer conceptual and exhaustive reference material.
- **Reference:** describe the current contract accurately and consistently. Include internal paths, symbols, or schemas only when the intended reader must interact with them.
- **Explanation:** build understanding through concepts, relationships, constraints, and durable trade-offs. Include history only when it explains the present design.
- **README:** explain purpose, audience, key capabilities, essential setup, and navigation without becoming a changelog or implementation report.
- **ADR/design note:** preserve relevant alternatives, constraints, trade-offs, and decisions; exclude agent process and incidental drafting history.
- **Migration guide/changelog/postmortem:** retain the old/new or historical information required by that artifact, but omit implementation mechanics that do not help the reader migrate, assess impact, or learn from the event.

Do not apply rules written for agent-facing files, such as “document only unique patterns,” blindly to beginner tutorials or user-facing guides. Minimal yet complete is the target; shorter is not automatically better.

## Write from the appropriate time perspective

For durable tutorials, how-to guides, references, READMEs, and user-facing explanations, write from the reader's present rather than the author's implementation past:

- describe the current supported behavior and path;
- use timeless present-tense wording where practical;
- rewrite change narration as current-state guidance;
- prefer positive supported workflows over negative history.

Usually omit wording such as:

- “previously,” “formerly,” “new,” “now,” “recently,” or “as of this change”;
- “during the refactor,” “we changed,” “we added,” or “after fixing”;
- references to issues, PRs, commits, release dates, prompts, agents, models, reviewers, or tool calls.

Retain temporal language when time and change are part of the artifact's purpose, such as a migration guide, changelog, ADR, postmortem, or implementation report.

## Route information instead of leaking it

Use these natural homes when applicable:

- current reader behavior and procedures → tutorial, how-to, reference, or README;
- release deltas → changelog or release notes;
- reader-required old/new transitions → migration guide;
- durable and surprising trade-offs → ADR;
- evolving implementation structure → design note;
- incident chronology and lessons → postmortem;
- tests, commands, diffs, and delivery evidence → implementation report or handoff;
- active task state and agent process → progress or scratch artifact.

Do not force misplaced material into the current document merely because it is useful somewhere else.

## Verify before publishing

Use implementation sources to verify facts without copying their incidental structure into prose:

- confirm public names, commands, APIs, configuration, defaults, and supported behavior;
- test examples or commands when practical;
- preserve established domain terminology;
- distinguish verified behavior from intended or proposed behavior;
- avoid fabricated APIs, paths, flags, values, and examples.

A source filename or test name may justify a statement without appearing in that statement.

## Final content check

Before finishing, review the artifact for:

- implementation-session or debugging chronology;
- abandoned approaches and temporary architecture presented as durable knowledge;
- assistant mistakes, user corrections to the assistant, prompts, tools, models, or reviewer process;
- internal paths, private symbols, tests, scripts, and rollout mechanics that the reader does not need;
- changelog-shaped wording in durable docs;
- stale rationale, placeholders, generic introductions, repeated conclusions, and prose that merely restates headings or code;
- details that are accurate but belong in another artifact;
- necessary reader context accidentally removed in pursuit of brevity.

Remove, rewrite, or relocate conceptually anything that fails the document contract and inclusion gate.
