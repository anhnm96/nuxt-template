---
name: component-docs
description: Write, update, or drift-check the documentation pair for a frontend component in this repo — README.md (how to use it) beside DESIGN.md (why it is built that way), next to the component. Covers where docs live and why ADRs stay central, extracting the real API instead of recalling it, and the local trap where ESLint lints Markdown code fences as source. Use whenever a component is finished and needs documenting, when asked for a README, docs, or a spec for a component, when existing component docs have drifted from the code, when a component has changed and its docs need bringing back in line, when asked which docs a change affects, or when moving docs between folders.
---

# Documenting a component

Two files, beside the component:

| File | Answers | Read by |
| --- | --- | --- |
| `README.md` | How do I use this? | Anyone integrating it |
| `DESIGN.md` | Why is it like this? | Anyone changing it |

Everything else stays where it is:

- **`docs/adr/`** — decisions, globally numbered. They stay central because they outlive the
  component and often span two: `Dropdown.vue` cites ADR-0001, which governs its contract with
  Select, so that ADR cannot live inside `base/select/`.
- **`docs/specs/<feature>/`** — change specs, one per piece of work, closed when it lands.
  Named after the problem (`week-view-gaps.md`), not the component. A finished component does
  not get one; use `/to-spec` for work not yet done.
- **`CONTEXT.md`** — shared vocabulary. Define a term once there, use it in both files.

The split is by **lifetime**, not audience. Docs beside the code outlive any single change;
specs are closed when their work ships. One doc serves agents and humans alike — two docs on
one subject drift, and the less-loved one goes stale, which is worse than none.

Document the **public surface**, not the file count. A module nothing outside the folder
imports (`useSelect`) has no API to document; what a maintainer needs about it belongs in that
folder's `DESIGN.md`.

## Workflow

**1. Extract the API. Do not recall it.**

```bash
node <skill>/scripts/extract-api.mjs app/components/base/select/Select.vue
```

Prints props with real types and defaults from the *compiled* runtime props, slots with their
actual props, events, exposed members and `data-slot` hooks, as Markdown tables to fill in.

If a component forwards slots to a child (`v-bind="slotProps"`), the output says `(forwarded)`
— run the extractor on the child to get the real prop names.

**2. Read the source for behaviour the extractor cannot see:** the keymap, the a11y model,
loading and error states, what each prop does when combined with another.

**3. Draft both files.** Skeletons and section-choosing guidance are in
`references/templates.md`.

**4. Verify every claim.** See below — this is the step that matters.

**5. Check the links.**

```bash
node <skill>/scripts/check-doc-links.mjs app/components/base/select
```

Resolves relative links and `#anchor` fragments. Run it after moving any doc: a file that
changes directory depth has every `../` link silently break.

## Updating docs after a component changes

Start from the change, not from the component. `git diff` (or `git diff main...HEAD`) on the
component tells you what can possibly have gone stale; reading the whole file again tells you
nothing about what moved.

**1. Find the mechanical drift.**

```bash
node <skill>/scripts/check-docs-current.mjs app/components/base/select
```

Reports props, events, slots and exposed members that exist in the code but not the README,
and API-table rows naming things the component no longer has. Exits non-zero, so it works as
a commit gate.

It checks the **surface only**. A keymap row, a loading behaviour, an a11y claim — those go
stale invisibly, and only reading the diff catches them. A clean run means "the API matches",
never "the docs are correct".

**2. Work out the blast radius.** A component's docs are not the only ones that can be wrong:

| Location | On a change |
| --- | --- |
| `<component>/README.md`, `DESIGN.md` | Update. This is the point. |
| Other components' docs | Check. `grep -rl "Dropdown" --include="*.md" app/` — Select's README documents Dropdown behaviour it depends on. |
| `CONTEXT.md` | Update only if the vocabulary changed — a renamed concept, a new term. |
| `docs/adr/` | **Never edit.** See below. |
| `docs/specs/` | **Never retro-edit.** See below. |

**3. Leave the historical record alone.**

An ADR records what was decided, when, and on what evidence. If the decision changes you write
a *new* ADR that supersedes the old one and mark the old one superseded — which is exactly
what ADR-0002 → ADR-0003 did. Editing ADR-0002 to match current reality would erase the
record of a reversal, and that record is the most useful thing in it.

Change specs in `docs/specs/` close when their work lands. A spec describing a problem that
has since been solved is not wrong; it is finished. Editing it to match today's code destroys
the account of why the work happened.

Both are append-only. If reality has moved past them, add something new — never revise.

## Verify every claim against source

A doc written from memory invents things, and it does so most confidently about code you just
read. A real example from this repo: a `@update:search` event was documented, with an example,
two turns after reading the component — which has no `defineEmits` at all. The prop it was
built on (`externalFilter`) exists, so the invention was plausible, which is exactly why it
survived drafting.

Before writing any prop, event, slot or method, confirm it exists:

```bash
grep -n "defineEmits\|defineExpose\|defineModel" <Component>.vue
```

Three rules that catch most of it:

- **Never document an affordance you have not seen in the source.** If the API ought to exist
  but doesn't, say so in Gotchas — a documented gap is useful; an invented feature is a bug
  report waiting to happen.
- **Qualify conditional behaviour.** "A spinner appears in the search field" is wrong when the
  search field only exists under `searchable`.
- **Re-read the component when updating docs.** Drifted docs are the common case, and the
  drift is never where you expect.

## Local traps

**ESLint lints Markdown code fences as real source.** A ```` ```vue ```` fence is parsed as an
SFC and a ```` ```ts ```` fence as a module, so fragments fail: a top-level
`<template #popover>` is an invalid attribute, a bare `return` is `no-useless-return`, and a
`…` placeholder is a parse error. Either make the snippet valid — nest it in its parent
component, show the whole function — or tag the fence `html` when it is plain markup. Run
`npx eslint <path>` on the docs before finishing.

**Moving a doc breaks its links.** Depth changes invalidate every `../`. Run the link checker.

**Stale cross-references outlive renames.** When a component is retired, references to it
survive in prose — a keymap table still had `Select | MultiSelect` columns after the two merged
into one component. Grep for the old name after any rename.
