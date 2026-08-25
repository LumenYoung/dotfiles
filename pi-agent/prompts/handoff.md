---
description: Write a portable handoff file for another agent, session, harness, directory, or person
argument-hint: "[next-session purpose, destination, or audience]"
---

<!-- Workflow adapted for Pi from https://www.aihero.dev/skills-handoff and the MIT-licensed mattpocock/skills handoff skill. -->

Create a concise, portable handoff document from the current conversation and the relevant verified workspace state.

Use this when work must travel to another agent, session, harness, directory, repository, or person. This is not conversation compaction. Do not compact or clear this session, start another session, or continue implementing the task.

Handoff focus:

${ARGUMENTS:-No additional focus was supplied. Preserve the current objective and its next actionable step.}

Follow this process:

1. Inspect the current workspace only as needed to verify claims that matter to continuation. Relevant checks can include the working directory, repository root, branch, commit, working-tree status, changed files, and test results.
2. Do not modify tracked workspace files.
3. Create a unique Markdown file in the OS temporary directory. Use `bash` with `mktemp`; respect `$TMPDIR` when it is set and otherwise use `/tmp`.
4. Write the handoff document to that path.
5. Read the completed document back and review it for unsupported claims, missing continuation context, accidental duplication, and sensitive information.

The document must be understandable without access to this conversation. Include only relevant sections from this structure:

# Handoff

## Destination focus

What the receiving agent or person is expected to do.

## Objective and constraints

The user's goal, requirements, preferences, and important boundaries.

## Workspace

Current directory, repository, branch or commit, and working-tree state when relevant.

## Current state

Separate completed, in-progress, and not-started work. Distinguish:

- **Verified** — confirmed through files, commands, tests, or other direct evidence.
- **Reported** — stated in the conversation but not independently verified.
- **Unknown** — important status that remains uncertain.

## Decisions and rationale

Decisions already made and the reasoning the recipient must preserve.

## Relevant artifacts

Reference specifications, plans, ADRs, issues, commits, diffs, and files by path or URL. Do not copy their contents into the handoff.

## Validation

Commands or checks already run and their material results. Do not imply that tests passed unless they were actually run successfully.

## Next steps

A short, ordered, actionable continuation plan.

## Risks and open questions

Unresolved assumptions, blockers, suspected problems, or claims that require verification.

## Suggested skills

Name only skills that are actually available and materially useful to the receiving agent. Explain briefly when each should be loaded. Omit this section if none apply.

## Resume instruction

A direct first instruction for the receiving agent.

Additional requirements:

- Keep the document compact, but preserve the reasoning needed to avoid rediscovery.
- Do not reproduce content already maintained in durable artifacts.
- Do not include API keys, tokens, passwords, credentials, private keys, personal data, or unnecessary identifying information.
- Redact sensitive values rather than merely warning that they exist.
- Do not convert assumptions into facts.
- Do not claim that work is complete merely because it was discussed.
- A temporary handoff is a transit document, not a durable project artifact.

After reviewing the file, respond with:

- the exact absolute path;
- one sentence describing its destination focus;
- a warning that temporary files may disappear and should be copied somewhere durable if the handoff will not be consumed soon.
