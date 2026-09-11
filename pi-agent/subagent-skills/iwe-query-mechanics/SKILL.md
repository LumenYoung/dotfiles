---
name: iwe-query-mechanics
description: Use before IWE query operations to perform guarded localized edits with validated query layers, selection checks, and recovery rules.
---

# IWE Query Mechanics

Use this skill before the first `iwe_query` call in a run. It defines durable query mechanics only; obtain vault-specific policy from `iwe-kb-bootstrap` and the current IWE `AGENTS` page.

Use `iwe_query` for localized, guarded partial edits when a typed IWE tool cannot express the change. Do not replace a complete page merely to avoid a block selection. Use `iwe_update` only with complete, current page content; it replaces the entire document and has no `dry_run` or `expect` guard.

## Separate the query layers

Do not infer a layer's syntax or use a field from one layer in another.

1. **Document filter** identifies candidate documents, for example `$key` or a `$content` membership condition.
2. **Read projection** (`project` or `addFields`) shapes returned data. `$blocks` and `$matches` here are output, not mutation selectors.
3. **Block selection and cardinality** identify the exact editable block(s). Inspect the returned matches, count, and text owned by each selected block. A heading's own text is not its nested body.
4. **Mutation payload** is the documented operator and its fields. Do not guess operator names, nesting, or payload keys.

Before an update, confirm the intended document count and block count. Zero, multiple, or unclear matches require a more specific selection or a different safe operation.

## Query lifecycle

1. Retrieve the complete, current target page before every mutation to establish current content and intent.
2. Use `find` additionally to inspect candidates and block matches. Keep the document filter exact when the key is known.
3. Build one documented update with document-level `expect` and one `expect` for each block operator.
4. Run it with `dry_run: true`. Review the changed preview, including affected page content and any graph warnings.
5. Apply the identical query immediately with `dry_run: false`; do not insert unrelated reads or edits between preview and apply.
6. Retrieve the changed page and verify both the intended change and preservation of unrelated content.

## Validated query shapes

These templates use the MCP schema and successful guarded IWE operations. Replace only the placeholders; do not add speculative fields.

### Inspect a known page and blocks containing unique text

Use `$content` inside `filter` for block membership. Use `project` to return the matched material for inspection.

```yaml
filter:
  $key: <document-key>
project:
  key: $key
  content:
    $blocks:
      $matches: <unique-text>
```

Call this as `iwe_query` with `operation: find`. The result returns the matching block objects under `content`; inspect their count, type, path, and owned text before choosing an update operator. Do not add a top-level `$matches` projection unless its exact grammar has been separately verified.

### Replace one exact text block

`$replaceText` takes the current owned text in `$text` and the replacement in `to`.

```yaml
filter:
  $key: <document-key>
expect: 1
update:
  $replaceText:
    $text: <exact-current-text>
    to: <replacement-text>
    expect: 1
```

Call this first with `operation: update, dry_run: true`, then repeat the same document with `dry_run: false` only if the preview is correct.

### Insert a section before a uniquely selected heading block

The document filter uses `$content` and the block selector uses `$text` with `$eq`. The insertion payload belongs directly under `$insertBefore`.

```yaml
filter:
  $key: <document-key>
  $content:
    $text:
      $eq: <exact-heading-text>
expect: 1
update:
  $insertBefore:
    content: |-
      <complete-markdown-to-insert>
    expect: 1
```

Use the same dry-run then immediate-apply sequence. The selector targets the heading block itself; choose another verified selector when the intended target is nested content rather than that heading. Structural insertion can rebase heading levels relative to the selected block, so inspect the actual heading hierarchy in the dry-run output and do not apply if it changed unexpectedly.

## Recovery rules

| Result | Required response |
| --- | --- |
| Parser, schema, or predicate error | Do not patch fields one at a time. Return to these templates and the tool schema, then reconstruct the query once. |
| Wrong, zero, or ambiguous cardinality | Re-run a read query, inspect returned blocks and own text, then refine selection. Do not mutate. |
| Stale `expect` | Re-retrieve current state and rebuild the request once. Never reuse or patch the stale request. |
| Unknown, interrupted, or partial mutation outcome | Retrieve current state before retrying. Make a retry idempotent where the tool supports it. |
| Adapter circuit breaker | Treat this as IWE adapter/tool unavailability, not proof of a network failure or an unapplied change. Stop speculative retries and report the state as unknown until it is re-read. |

## Other mutation safety

- For a new page, use a stable extensionless key and `iwe_create` with `if_exists: "skip"` when a retry must be idempotent. Its content is written verbatim.
- Use `iwe_extract` and `iwe_inline` list mode before selecting by block or partial reference/section text. Those selectors can be ambiguous; `iwe_extract` section matching is case-insensitive partial matching and `iwe_inline` reference matching is partial.
- `iwe_inline` defaults `keep_target` to false. Set it deliberately when the referenced document must remain.
- Use `dry_run` before destructive `iwe_delete`, `iwe_rename`, `iwe_extract`, or `iwe_inline` operations. Rename and delete update graph references and links.
- Inspect graph-stat warnings returned by create, update, delete, or query mutations (for example dangling links, orphans, or similar pages) and resolve material warnings before finishing.
