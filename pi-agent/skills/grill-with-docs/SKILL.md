---
name: grill-with-docs
description: Grilling session that challenges your plan against the existing domain model, sharpens terminology, and updates documentation (CONTEXT.md, ADRs) inline as decisions crystallise. Use when user wants to stress-test a plan against their project's language and documented decisions.
---

<what-to-do>

Interview me relentlessly about every aspect of this plan until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.

Ask the questions one at a time, waiting for feedback on each question before continuing.

When continuing a grill session from prior context, first recover existing decisions/questions (session_search/LCM/design notes as appropriate) and continue the existing decision index. Do **not** restart with "first question" unless no prior grill state exists. If the user corrects your process or a misunderstanding, acknowledge it and continue; do not automatically write that correction into project docs unless it is a real domain/design decision the user wants persisted.

If a question can be answered by exploring the codebase, explore the codebase instead.

</what-to-do>

<supporting-info>

## Domain awareness

During codebase exploration, also look for existing documentation:

### File structure

Most repos have a single context:

```
/
├── CONTEXT.md
├── docs/
│   └── adr/
│       ├── 0001-event-sourced-orders.md
│       └── 0002-postgres-for-write-model.md
└── src/
```

If a `CONTEXT-MAP.md` exists at the root, the repo has multiple contexts. The map points to where each one lives:

```
/
├── CONTEXT-MAP.md
├── docs/
│   └── adr/                          ← system-wide decisions
├── src/
│   ├── ordering/
│   │   ├── CONTEXT.md
│   │   └── docs/adr/                 ← context-specific decisions
│   └── billing/
│       ├── CONTEXT.md
│       └── docs/adr/
```

Create files lazily — only when you have something to write. If no `CONTEXT.md` exists, create one when the first term is resolved. If no `docs/adr/` exists, create it when the first ADR is needed.

## During the session

Reference note: `references/lumeny-learn-grilling-notes.md` showing how to capture service/runtime separation, phase-vs-domain distinctions, and taxonomy-use explanations during a product/domain grilling session. `references/dotfiles-mise-bootstrap-grill.md` captures a reusable grilling pattern for modernizing dotfiles bootstrap scripts into a `mise` tool manifest plus tasks, including conservative core propagation, `uv run --with` for Python propagation dependencies, thin setup wrappers, non-fatal optional source builds, and machine-local override creation. `references/ml-research-experiment-design-grill.md` captures a reusable grilling pattern for ML research experiments that combine papers/repos into training designs: stage scope, target feature space, interleaved modality boundaries, feature cache contracts, probes/decoders, success criteria, and repo boundaries. `references/elf-vl-stage1-grill.md` captures a concrete ELF/Tuna/Qwen/Beyond-style session: private experiment repo setup, mixed text/VQA/image-feature data factors, offline Qwen layer-11 feature cache decision, Stage-2 video-mixture caveat, and local-vs-remote dataset inventory reporting. `references/elf-vl-data-ops-subset-grill.md` captures data-ops and small-budget subset-sizing lessons for ELF-VL-style multimodal experiments: queued downloads behind staging gates, bounded origin-delivered monitors, smoke/PoC token-equivalent budgeting, Qwen-VL image token accounting via `image_grid_thw`, and filtered/stratified PoC subsets instead of full dataset cleaning. `references/elf-vl-stage1-data-ops-and-subsets.md` captures the follow-on data-ops/subset-sizing lessons: node-local multi-TB staging gates, queued large text-corpus downloads after rsync verification, explicit monitor success predicates, smoke/PoC token-equivalent budgets, and Qwen-VL `image_grid_thw.prod() // spatial_merge_size**2` image token accounting.

Reference note: `references/hermes-openwebui-plugin-boundary-grill.md` captures Hermes/OpenWebUI-specific lessons about respecting plugin/core boundaries and distinguishing Gateway platform adapter delivery from TUI/event-stream callbacks. `references/hermes-openwebui-progress-bubble-classification.md` captures how to classify Hermes-rendered platform progress bubbles into OpenWebUI status without core changes, including the two-stream lifecycle rule: a turn either directly starts assistant response or first starts a progress/status stream before assistant response. `references/mcp-integration-deployment-grill.md` captures the reusable decision order for MCP adapters that bridge agent runtimes to separately deployed services: API origin vs web/human URL, public vs internal routing, reachability ownership, fallback behavior, explicit backend selectors, workspace scoping, auth secrets, structured errors, natural success results, startup validation, HTTP client layering, and first-phase delegation scope. `references/multica-http-wait-wakeup-grill.md` captures the reusable wait/wakeup/rerun separation for remote-agent MCP adapters: domain-local bounded wait tools, Hermes wakeup continuation, short initial wait before scheduling, continuation caps, completion-scope reporting, balanced wakeup defaults, and one-time infra-only rerun policy. `references/multica-agent-delegation-grill.md` captures remote-agent delegation policies: choose assignable agents rather than raw runtimes, confirm machine-matched agent selection with the user, use a fixed Markdown task envelope, distinguish cancel-run/cancel-issue/stop-tracking semantics, and keep default failure evidence bounded while exposing explicit artifact retrieval. `references/internal-mcp-http-migration-implementation.md` captures the implementation sequence for moving internal MCP adapters from CLI/subprocess wrappers to direct HTTP: explicit backend selector, shared HTTP client, structured errors, natural successes, low-risk read tools first, TDD, and writable rollout checkpoint. For browser-native integration against an existing gateway/platform abstraction, see `references/hermes-openwebui-grill-notes.md`.

### Challenge against the glossary

When the user uses a term that conflicts with the existing language in `CONTEXT.md`, call it out immediately. "Your glossary defines 'cancellation' as X, but you seem to mean Y — which is it?"

### Sharpen fuzzy language

When the user uses vague or overloaded terms, propose a precise canonical term. "You're saying 'account' — do you mean the Customer or the User? Those are different things."

When proposing taxonomy fields (for example `primary`/`supporting`, statuses, roles, phases), explain how each category will actually be used before asking the user to accept it. Do not add categories just because they seem tidy; tie them to concrete behavior such as composition order, UI defaults, routing, permissions, or persistence.

When the user distinguishes implementation phasing from domain scope, capture that distinction explicitly. A capability can be part of the domain even if it is implemented later; do not accidentally exclude it from the glossary or context just because it is not in phase one.

When narrowing scope, explicitly distinguish **domain inclusion** from **implementation phase**. Do not imply that a capability is outside the repo/product merely because it should be implemented later. If the user says a later-phase capability must still be considered, capture it as a first-class domain term and record its phased delivery separately.

### Discuss concrete scenarios

When domain relationships are being discussed, stress-test them with specific scenarios. Invent scenarios that probe edge cases and force the user to be precise about the boundaries between concepts.

### Cross-reference with code

When the user states how something works, check whether the code agrees. If you find a contradiction, surface it: "Your code cancels entire Orders, but you just said partial cancellation is possible — which is right?"

When a design agreement includes an extension boundary (for example "plugin only", "no core changes", "adapter owns this", or "upstream-friendly"), actively check proposed implementation points against that boundary before recommending them. If your recommendation would touch code outside the agreed boundary, retract it and restate the options in terms of: (1) what can be done inside the boundary, (2) what requires a separate core/upstream extension, and (3) what existing event/callback path might avoid the change.

Before declaring an event or status stream unavailable, inspect the code for existing callback/event seams and distinguish paths precisely. For Hermes-like systems, do not conflate a platform-plugin delivery path with a separate TUI/event-stream runtime path: one may expose structured tool/status events while the other only receives rendered send/edit calls.

When the plan involves a plugin, adapter, fork, integration repo, or extension point, verify the ownership boundary before recommending changes. Distinguish "code exists in the upstream/core project" from "code is in the plugin/integration repo we are allowed to change." If a recommendation would require touching core files outside the agreed extension boundary, call that out as a separate core-extension decision/PR instead of folding it into the plugin V1 plan.

If the user catches a boundary violation or incorrect assumption during grilling, immediately update the affected ADR/design note to reflect the correction before continuing to the next question.

When the user asks whether an existing system has a native capability, verify at three levels before answering: (1) base/domain abstractions, (2) concrete implementations, and (3) real call sites. Do not conclude from concrete adapters alone that there is no core abstraction; search for the base method and where it is invoked. If you miss one of these layers and the user pushes back, correct the design note/ADR immediately.

When the user explicitly asks to “define the boundary” or “confirm the scope” before implementation, treat that as a grilling session even if the task sounds small. Start with a concise proposed boundary and exactly one highest-leverage question, including your recommended answer. Do not jump into implementation or write a long plan; the goal is to stabilize deletion/ownership/safety boundaries before code changes. If the answer can be resolved by inspecting the repo or existing docs, inspect instead of asking.

When continuing an existing grill session, do not restart at “first question.” First recover the prior decision record from the conversation, session search, and/or existing design docs; continue using the established canonical decision IDs. If numbering drift occurs, unify the index before asking the next question. Distinguish user corrections to the assistant’s process from durable design decisions: do not write incidental assistant-mistake corrections into project docs unless they change the actual design.

### Update CONTEXT.md inline

When a term is resolved, update `CONTEXT.md` right there. Don't batch these up — capture them as they happen. Use the format in [CONTEXT-FORMAT.md](./CONTEXT-FORMAT.md).

`CONTEXT.md` should be totally devoid of implementation details. Do not treat `CONTEXT.md` as a spec, a scratch pad, or a repository for implementation decisions. It is a glossary and nothing else.

### Offer ADRs sparingly

Only offer to create an ADR when all three are true:

1. **Hard to reverse** — the cost of changing your mind later is meaningful
2. **Surprising without context** — a future reader will wonder "why did they do it this way?"
3. **The result of a real trade-off** — there were genuine alternatives and you picked one for specific reasons

If any of the three is missing, skip the ADR. Use the format in [ADR-FORMAT.md](./ADR-FORMAT.md).

### Use design notes for resolved structure that is not glossary or ADR

Some resolved decisions are useful project documentation but are neither pure domain vocabulary nor ADR-worthy trade-offs. Examples: repository layout, first-pass manifest shape, event names, file naming conventions, or phase boundaries. Capture these in a lightweight design note such as `docs/design-notes.md` instead of polluting `CONTEXT.md` or forcing an ADR.

Rules of thumb:

- `CONTEXT.md`: canonical domain terms only; no implementation details.
- `docs/adr/NNNN-*.md`: durable trade-off decisions that satisfy the ADR criteria above.
- `docs/design-notes.md`: practical agreed structure, schema sketches, event lists, and phase notes that may evolve.

### Reference examples

Reference note: `references/elf-vl-grill-continuation-notes.md`: ongoing research-design grill lessons for ELF/Qwen feature-flow work: recover prior grill state instead of restarting with “first question,” avoid writing assistant-handling corrections into project docs, and distinguish ELF text discrete decode from continuous image-feature finalization.
Reference note: `references/elf-vl-grill-continuation-notes.md`: ongoing research-design grill lessons for ELF/Qwen feature-flow work: recover prior grill state instead of restarting with “first question,” avoid writing assistant-handling corrections into project docs, and distinguish ELF text discrete decode from continuous image-feature finalization.
Reference note: `references/elf-vl-online-qwen-token-features.md`: reusable pitfalls for ELF/Qwen feature-flow grills: prefer online frozen-teacher token-feature extraction over dense offline caches when features are per token; avoid pooled embedding APIs; clarify token-level T5/Qwen hidden states; verify Qwen visual raw vs projected deepstack dimensions; keep modality projectors; and distinguish ELF global branch switches from per-sample timestamps.
Reference note: `references/elf-vl-feature-encoder-overlap-and-preprocess.md`: Phase-3.9 continuation lessons for ELF/Qwen feature-flow at scale: rename frozen target producer from teacher to feature encoder, evaluate local per-rank async feature encoding by uncovered wait rather than raw EPS, and attack preprocessing with thread sweeps, persistent process pools, image-only preprocessing, preprocessed ring buffers, and NUMA/core pinning before cropped vLLM.
Reference note: `references/elf-vl-local-feature-encoder-overlap.md`: ELF-VL local feature-encoder overlap lessons: rename frozen target-feature producers from teacher to feature encoder, use post-DeepStack as projected DeepStack features in language space, evaluate per-rank/per-GPU local encoders with async N+1 overlap by uncovered wait rather than raw eps, prioritize preprocessed-input caching before vLLM/cropped checkpoints when processor time dominates, and account for same-GPU compute/memory contention.
Reference note: `references/elf-vl-qwen-feature-contract-corrections.md`: feature-contract corrections from an ELF-VL/Qwen3-VL session: ELF/T5 text targets are contextual per-token encoder outputs, Qwen processor owns image special tokens while ELF owns spans, Qwen3-VL `pooler_output` is a merged patch-token sequence rather than a whole-image vector, pooler/main vs deepstack trade-offs, and teacher-service horizontal scaling when batch-size scaling saturates.
Reference note: `references/elf-vl-phase4-joint-service-prereqs.md`: Phase-4 continuation lessons after the joint hidden-state correction: do not block on hidden-layer ablation after final-layer proof; use true per-example `[B,L]` joint masks for collation; benchmark full joint Qwen forward hidden states rather than split features; start teacher topology with 2 dedicated non-shared GPUs, least-inflight sharding, ACK-delete plus TTL janitor; keep cosine as metric-first with gated auxiliary-loss ablation.
Reference note: `references/elf-vl-feature-encoder-preprocessing-parallelism.md`: Phase-3.9/Phase-4 feature-encoder throughput lessons after shallow early exit: rename teacher to feature encoder, optimize uncovered wait after async overlap, prioritize CPU preprocessing pipeline work before cropped/vLLM when processor dominates, compare chunk_thread vs persistent chunk_process carefully, avoid pickle/PIL/tensor IPC bottlenecks, and validate chunked outputs against full AutoProcessor.
Reference note: `references/elf-vl-phase4-prerequisites.md`: Phase-4 prerequisite lessons after joint hidden-state correctness: final layer as current default with mid-feature ablation deferred, 2 dedicated non-shared teacher replicas first, least-inflight bounded sharding, ACK-delete plus TTL fallback, cosine as metric before gated auxiliary loss, and `[B,L]` batched joint-mask implementation pattern.


Reference note: `references/lumeny-learn-grill-session.md`: example of a grill-with-docs session that separated glossary, ADRs, and design notes while clarifying a Marimo-based learning service. `references/lumeny-learn-agent-pairing-profile-mcp.md` captures the Lumeny Learn decision to use ACP with a dedicated Hermes profile cloned from default plus narrow Marimo Code Mode MCP, and records the no-profile-inheritance/possible sync-overlay implication. `references/elf-vl-grill-notes.md` captures ELF/Qwen3-VL/Tuna2 multimodal grilling lessons, including resuming an existing grill index, not writing process corrections into project docs automatically, and routing continuous image features vs text decode/CFG behavior.
- `references/session-service-grill-pattern.md`: reusable decision order and pitfalls for grilling services that manage sessions, execution runtimes, progress events, and trusted agent/operator skills.
- `references/elf-vl-grill-index-continuation.md`: continuation pattern for research/ML architecture grill sessions where prior decisions already exist: retrieve context first, count existing decisions, continue with a canonical `D#` index, avoid temporary `N+` labels, and distinguish agent-behavior corrections from actual design decisions before writing docs.

### Greenfield service/product grilling pattern

When the repo is mostly empty and the user wants to clarify requirements, start by stabilising vocabulary before implementation. Good first branches are: canonical product name, primary user, material/artifact boundary, source-input boundary, execution boundary, deployment/runtime separation, and state ownership. Capture stable domain terms in `CONTEXT.md` immediately; create ADRs only for architecture choices that constrain future implementation, such as separating a management service from per-session runtimes. See `references/greenfield-learning-service-grill.md` for a compact example question sequence.

</supporting-info>
