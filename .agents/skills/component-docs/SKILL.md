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

Prints props, slots with their actual props, events, exposed members and `data-slot` hooks, as
Markdown tables to fill in. Defaults and required-ness come from the *compiled* runtime props,
so they are what Vue really sees; types come from the declaration, because Vue's runtime type
is lossy.

It also prints HTML comments for the two traps that a table cell cannot express:

- **`skipCheck`** — a declared type Vue cannot represent at runtime. `target?: true | string |
  HTMLElement` compiles to `type: [Boolean, String], skipCheck: true`, so Vue validates
  nothing and an element *is* accepted. Document the declared type, never the compiled one.
- **Required *and* defaulted** — `withDefaults` on a required prop emits both. Vue applies the
  default for an omitted or `undefined` prop, silently, so "required" alone misdescribes it.
  `null` is not covered.

If a component forwards slots to a child (`v-bind="slotProps"`), the output says `(forwarded)`
— run the extractor on the child to get the real prop names.

**2. Read the source for behaviour the extractor cannot see:** the keymap, the a11y model,
loading and error states, what each prop does when combined with another.

**3. Draft both files.** Skeletons and section-choosing guidance are in
`references/templates.md`.

**4. Check every claim.** See below — this is the step that matters.

**5. Check the links.**

```bash
node <skill>/scripts/check-doc-links.mjs app/components/base/select
```

Resolves relative links and `#anchor` fragments. Run it after moving any doc: a file that
changes directory depth has every `../` link silently break.

**6. Apply the Simplified Technical English pass.** Invoke the `asd-ste100` skill. The two
files take different modes, because they have different jobs:

- **`README.md` — strict.** Someone integrating the component acts on it. An unnamed actor or
  a sentence with two readings is a defect there. Ours are reference rather than procedure, so
  the sentence caps are advisory; the vocabulary discipline is the point.
- **`DESIGN.md` — STE-flavored.** It explains why a decision was made. Keep the structural
  rules. Keep the reasoning: a rationale compressed into short declaratives stops being a
  rationale, and a hedge that becomes a fact is a different claim.

Then lint. Every finding points at an exact word, so this is a check rather than an opinion:

```bash
# README - passive voice stays on, as advisory
python <skill>/../asd-ste100/scripts/ste-lint.py --disable semicolon   app/components/base/select/README.md

# DESIGN - the passive is Vue or the browser acting, and the compound tense
# usually narrates history ("ADR-0002 had chosen")
python <skill>/../asd-ste100/scripts/ste-lint.py --disable semicolon,passive-voice,present-perfect   app/components/base/select/DESIGN.md
```

The script ships with the `asd-ste100` skill, installed beside this one. Unlike the other
scripts here it takes files, not a directory, so pass a glob for more than one.

**The semicolon is off by house style. Do not re-enable it to "fix" the docs.** STE bans the
mark outright (Rule 8.1) because it was written for aircraft maintenance cards. Of 71 semicolon
findings across these docs, 18 sit inside a Markdown table cell, where "split into separate
sentences" is not an available fix. The rest are deliberate.

What is left is worth fixing, and it is mostly one rule:

- **`synonym-rotation`** — the same action under several names (`show`/`display`,
  `check`/`verify`/`validate`, `remove`/`delete`). This is the one to take seriously. It is a
  machine check on the vocabulary `CONTEXT.md` exists to fix, and it catches drift across
  files that no single doc's review would.
- **`present-perfect`**, on README — often a legitimate keep. "until the leave animation *has
  finished*" is current relevance, which the rule itself says to preserve. Fix only where the
  simple tense says the same thing.
- **`dangling-conjunction`** — a false positive on wrapped lines. It reads a line ending in
  "or" as an incomplete list item.

**Fix the file you touched. Do not retrofit a whole folder in one pass** — a diff that large
hides the places where a rewrite quietly dropped a condition. That is the real risk here: the
rewrite reads better *because* it lost a scope qualifier, and nobody sees it in 200 changed
lines.

Do not gate source files on this. Over every `base/**` `.vue` and `.ts` it finds 28 things
in 44k words, and 12 are the dangling-conjunction false positive.

Baselines at the time of writing, so drift is visible:

| | README | DESIGN |
| --- | --- | --- |
| select | 12 (1 hard) | 5 (5 hard) |
| tooltip | 12 (0 hard) | 0 |
| dropdown | 9 (0 hard) | 1 (1 hard) |
| calendar | 3 (1 hard) | 6 (6 hard) |
| date-picker | 5 (0 hard) | 0 |

The pass fixes *form*, never substance. A clean run on a paragraph that says nothing produces
a short, well-punctuated paragraph that says nothing.

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

Run the STE pass from step 6 on what you rewrote, not on the file. An update is where
vocabulary drifts: the new paragraph says "display" because you wrote it today, and the
paragraph above it says "show" because you wrote that one in June.

**2. Work out the blast radius.** A component's docs are not the only ones that can be wrong:

| Location | On a change |
| --- | --- |
| `<component>/README.md`, `DESIGN.md` | Update. This is the point. |
| Other components' docs | Check. `grep -rl "Dropdown" --include="*.md" app/` — Select's README documents Dropdown behaviour it depends on. |
| `CONTEXT.md` | Update only if the vocabulary changed — a renamed concept, a new term. |
| `docs/adr/` | Edit in place while pre-release. See below — the rule changes at release. |
| `docs/specs/` | Edit in place while pre-release; closed specs stay closed. See below. |

**3. Keep the documentation aligned with the current design.**

> **This project is pre-release.** That one line is the switch for everything below. Change
> it here when the project ships, and the rule flips with it.

While pre-release, edit ADRs and change specs in place when the design, the requirements or
the implementation moves. The goal now is documentation that matches the project as it
stands, not a detailed account of every turn it took to get there. Do not write a new ADR
*solely* because an existing decision changed — update the existing one.

After release, ADRs become historical records. From then on, a changed decision means a new
ADR that supersedes the old one, with the old one marked superseded, because by then someone
outside the project has built against what it says.

Two things hold in both phases.

**When the recorded *reasoning* was wrong, the correction is the content — keep both.** This
is different from a design that simply moved on. ADR-0002 rejected a `multiple` prop on a
measurement that turned out to be wrong, and ADR-0003 exists to record the measurement.
Editing 0002 to agree with today's code would delete the only thing that stops someone
re-deriving the same wrong conclusion from the same real trap. The test is not "has this
changed?" but "would a reader repeat the mistake without the record?"

**An edited ADR reads as a decision, not as a changelog.** Rewrite it so it states what is
true now. Do not leave the strikethrough-and-annotate scars that accumulate from editing
around the old text — `~~**X has to come back.**~~ **Superseded — it never left, but...**` is
a diff, not a decision, and the next reader has to reconstruct the current position from it.
If an edit leaves you wanting that kind of scar tissue, the change is probably big enough to
deserve its own ADR even now.

A closed spec in `docs/specs/` stays closed: its work landed, and it is finished rather than
wrong. Update one in place only while its work is still open.


## Check every claim against source

A doc written from memory invents things, and it does so most confidently about code you just
read. A real example from this repo: a `@update:search` event was documented, with an example,
two turns after reading the component — which has no `defineEmits` at all. The prop it was
built on (`externalFilter`) exists, so the invention was plausible, which is exactly why it
survived drafting.

Before writing any prop, event, slot or method, check that it exists:

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
