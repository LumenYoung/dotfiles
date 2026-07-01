---
name: marimo-authoring
description: Compact marimo notebook authoring guidance to use alongside marimo-pair for script-runnable notebooks, tests, validation, and structure.
---

# Marimo Authoring Patterns

This skill is a compact grammar, syntax, and pattern reference for marimo
notebooks. It is intentionally **not** an editing-transport guide: use whatever
editing mechanism the active workflow provides, such as `marimo-pair` for live
sessions.

## When This Skill Helps

Use these notes when the user asks to:

- create a marimo notebook from scratch;
- make a notebook runnable without browser interaction;
- add CLI/config parameters for batch runs;
- preserve useful interactive UI while adding script-mode behavior;
- validate, test, export, or deploy a notebook;
- reason about final output rendering or notebook-file structure.

## Notebook File Shape

A marimo notebook is a Python file. A minimal file contains:

```python
import marimo

__generated_with = "0.23.0"
app = marimo.App(width="medium")


@app.cell
def _():
    import marimo as mo
    return (mo,)


@app.cell
def _(mo):
    mo.md("# Hello marimo")
    return


if __name__ == "__main__":
    app.run()
```

This structure is useful for understanding generated notebook files and for
creating notebooks outside a live session.

## Make a Notebook Script/Batch Runnable

Batch-runnable means the same notebook can run from the command line without
manual browser interaction, for example:

```bash
uv run notebook.py --sample-size 4096 --learning-rate 0.005
```

Add script-mode behavior without removing the interactive UI.

```python
@app.cell
def _(mo):
    is_script_mode = mo.app_meta().mode == "script"
    cli_args = mo.cli_args()
    return cli_args, is_script_mode
```

Guidelines:

- Keep sliders, forms, buttons, and outputs visible for interactive users.
- In script mode, use CLI/config/default values instead of waiting for clicks.
- In interactive mode, keep using widget values and explicit buttons where they
  improve exploration.
- Avoid cells that block indefinitely in script mode.
- For heavy jobs, expose the important knobs explicitly and print/log enough
  progress for non-interactive runs.

Example pattern:

```python
@app.cell
def _(mo):
    learning_rate = mo.ui.slider(0.001, 0.1, value=0.01, label="learning rate")
    learning_rate
    return (learning_rate,)


@app.cell
def _(cli_args, is_script_mode, learning_rate):
    lr = float(cli_args.get("learning-rate", learning_rate.value)) if is_script_mode else learning_rate.value
    return (lr,)
```

For larger parameter sets, prefer a single source of truth such as a dataclass or
Pydantic model, then populate it from CLI args in script mode and UI/form values
in interactive mode.

## Rendering Rules

marimo renders the final expression of a cell. Indented expressions or values
hidden inside conditionals may not display as intended.

Prefer:

```python
@app.cell
def _(mo, show_details):
    output = mo.md("Details") if show_details else mo.md("Summary")
    output
    return
```

Avoid relying on a display expression buried in an `if` body.

## Reactivity and Cell Design

- Let marimo's dependency graph decide when cells run; avoid unnecessary guard
  clauses just to wait for upstream variables.
- Do not redefine the same public name in multiple cells. Edit the owning cell
  or choose a new public output name.
- Avoid mutating shared objects across cells when a pure new value is clearer.
- Use private `_names` for same-cell scratch intermediates, but do not make an
  entire notebook unreadable by prefixing everything.
- Avoid broad `try/except` blocks for normal control flow. Let unexpected errors
  surface unless there is a specific recovery path.

## Dependencies and PEP 723

For standalone notebooks, keep dependencies in a PEP 723 metadata block when
appropriate:

```python
# /// script
# requires-python = ">=3.12"
# dependencies = [
#     "marimo",
#     "numpy",
# ]
# ///
```

If a notebook already has PEP 723 metadata and is opened outside a project
environment, use sandbox mode so those dependencies are honored.

## Validation and Tests

Before handing back an offline notebook change, run marimo's checker when
practical:

```bash
uvx marimo check notebook.py
```

If the project already provides a marimo runner, prefer that project's command.

When adding tests:

- add `pytest` as a notebook/project dependency if it is not present;
- put pytest tests in cells that contain only test code;
- run the project's test command or `pytest notebook.py` when practical.

## Authoring Checklist

1. Preserve interactive UI unless the user explicitly wants a pure script.
2. Add script-mode defaults or CLI/config values for non-interactive runs.
3. Keep cell outputs as final expressions when they should render.
4. Respect marimo's DAG: no cycles, no public redefinitions, no wildcard imports.
5. If possible, run `marimo check` or an equivalent project validation before
   declaring the notebook ready.
