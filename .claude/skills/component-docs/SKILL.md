---
name: component-docs
description: Write, update, or drift-check the documentation for a frontend component in this repo — README.md (how to use it) beside an optional DESIGN.md (why it is built that way), next to the component. Covers the three working modes, where docs live and why ADRs stay central, extracting the real API instead of recalling it, and the local trap where ESLint lints Markdown code fences as source. Use whenever a component is finished and needs documenting, when asked for a README, docs, or a spec for a component, when existing component docs have drifted from the code, when a component has changed and its docs need bringing back in line, when asked which docs a change affects, or when moving docs between folders.
---

# Documenting a component

## Principles

These decide the content. The procedure below only enforces them.

**1. Consumer-first.** Write for someone who installed this library and has not seen the
repository. They have the component, its types and their own application. They do not have our
routes, our commit history or the thing this component replaced. That reader is the test for
every sentence.

Two carve-outs, because these ship with the components and a consumer really can reach them:

- **The rest of `app/`** — `assets/`, `composables/`, `constants/`, `plugins/`, `stores/`,
  `types/`, `utils/`. Name a file in one when the component genuinely needs it: the stylesheet
  that owns a token, the exported type a prop takes, the helper that serializes its model. Say
  what the reader gets from it. Only `pages/` is out of bounds.
- **`pages/playground/`** — citable as a pointer, never as an import. "A worked example is in
  `pages/playground/slider.vue`" is useful; a snippet that imports from it is not, because the
  reader cannot open that file.

**2. Source-driven.** The implementation, the public types and what the package exports are the
truth. Verify every prop, event, slot, default and example against them. Never invent an API.
This is the one rule that holds in every mode — see
[Check every claim against source](#check-every-claim-against-source).

**3. Current behaviour only.** Describe what the component does today. Not what it replaced,
not what it used to do, not what it will do. A migration table, a named predecessor or "the old
implementation" belongs in `DESIGN.md` or an ADR, and only under the test in principle 6. A
planned feature is a backlog item: "worth adding an emit before the async call sites land" is
not documentation. A gap goes in Gotchas, stated as what the component does not do today.

**4. Public contract over implementation.** Document observable behaviour, usage constraints and
customization. Private composables, context objects and how state is held tell a consumer
nothing they can act on. `context.ts` in a file tree is noise; name the parts they import and
leave the rest to `DESIGN.md`.

**5. Accessibility is part of the contract.** Roles, the focus model, the keymap and the naming
requirement are behaviour a consumer must know and a reviewer will check. For anything
interactive this is required content, not an optional section. For a `Badge` there may be
nothing to say, and that is a finding you reached deliberately rather than a section you forgot.

**6. Keep history only when it prevents a repeat.** The test is not "has this changed?" but
"would a reader repeat the mistake without the record?" ADR-0002 rejected a `multiple` prop on a
measurement that turned out to be wrong, and ADR-0003 records the measurement; deleting it
invites the next person to re-derive the same wrong answer from the same real trap. A design
that simply moved on gets rewritten to state what is true now.

**7. Concise but complete.** Fewest words that explain the API and the behaviour accurately. No
introduction before the first example, no section that restates the table above it. Never trade
a correct detail for brevity: a dropped scope qualifier reads better and says something false.

**8. Consistent without boilerplate.** The section **order** is fixed, so a reader who knows one
component finds the same fact in the next one. Which sections **appear** is not. Omit a section
rather than pad it.

## Where docs live

| File | Answers | Read by | When |
| --- | --- | --- | --- |
| `README.md` | How do I use this? | Anyone integrating it | Always |
| `DESIGN.md` | Why is it like this? | Anyone changing it | Only when there is a decision to record |

**`DESIGN.md` is not a per-component tax.** Write one when the component holds a decision a
maintainer would otherwise re-derive wrongly: a constraint that ruled out the obvious approach,
a trade-off with a real cost, an invariant the code depends on. A `Badge` has none of these, and
an empty DESIGN file is worse than no file — it reads as though the thinking is recorded
somewhere when it is not. If the only reason is "it seemed cleaner", there is no decision.

Everything else stays where it is:

- **`docs/adr/`** — decisions, globally numbered. They stay central because they outlive the
  component and often span two: `Dropdown.vue` cites ADR-0001, which governs its contract with
  Select, so that ADR cannot live inside `base/select/`.
- **`docs/specs/<feature>/`** — change specs, one per piece of work, closed when it lands.
  Named after the problem (`week-view-gaps.md`), not the component. A finished component does
  not get one; use `/to-spec` for work not yet done.
- **`CONTEXT.md`** — shared vocabulary. Define a term once there, use it everywhere.

The split is by **lifetime**, not audience. Docs beside the code outlive any single change;
specs are closed when their work ships. One doc serves agents and humans alike — two docs on
one subject drift, and the less-loved one goes stale, which is worse than none.

Document the **public surface**, not the file count. A module nothing outside the folder
imports (`useSelect`) has no API to document; what a maintainer needs about it belongs in that
folder's `DESIGN.md`.

## Modes

Choose the smallest workflow that fully addresses the request.

| Mode | When | Actions |
| --- | --- | --- |
| **Quick** | A small documentation update after a component change | Inspect the diff and the source it touched, update the documentation it affects, verify the claims you wrote, run the drift check |
| **Document** | A new component, or a substantial rewrite | Extract the public API, read the source for behaviour, draft, then validate claims, examples, links and scope |
| **Audit** | A documentation review, or suspected drift | Compare the documented API, behaviour, examples, accessibility and constraints against the source. Run the applicable checks and report what disagrees |

**Quick is the default for a change to a component that is already documented.** Full
extraction is optional there: read what the change touched, not the whole surface. A large
diff hides the one line that matters.

**Audit reads the source, not only the scripts.** The checks resolve names; they cannot tell
you that a keymap row is wrong, that focus no longer moves on open, or that a loading state
behaves differently now. Those are the claims that rot invisibly, and an audit that skips them
reports a clean run on docs that mislead.

In every mode:

- **Verify factual claims against the current implementation.** Invention is likeliest in
  exactly the small, confident edit Quick mode covers.
- **Run `check-docs-current.mjs`** for the components you touched. It is cheap and exits
  non-zero.
- **Preserve correct documentation.** Fix what the change affects; do not rewrite around it.
- **A passing check is not proof the docs are right.** Every script here resolves names.
  Nothing machine-checks behaviour.

## Steps

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

**3. Draft.** The section order, the skeletons and the rule for choosing sections are in
`references/templates.md`. Write `DESIGN.md` only if the test above is met.

**4. Check every claim.** See below — this is the step that matters, and it runs in every mode.

**5. Check the links and the scope.**

```bash
node <skill>/scripts/check-doc-links.mjs app/components/base/select
node <skill>/scripts/check-doc-scope.mjs app/components/base/select
```

`check-doc-links.mjs` resolves relative links and `#anchor` fragments. Run it after moving any
doc: a file that changes directory depth has every `../` link silently break.

`check-doc-scope.mjs` reports the mechanical half of principles 1 and 3 — history, application
context and paths that no longer resolve. It reads README files for all three and `DESIGN.md`
for stale paths only, because a maintainer is entitled to the history and to the call sites.

Two findings it raises are correct to keep. A `DESIGN.md` path to a file that was deliberately
deleted is the record of the deletion. A README that genuinely has to name the predecessor —
because the consumer asked for a migration table — is the one case the rule yields to.
Everything else it reports is a defect.

**6. Run the language pass.** See below.

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

## The language pass

Clarity first. The linter is a cheap second opinion on vocabulary, not the standard the prose
has to meet — on a clean README it reports about twelve findings, of which roughly one is real.

**The rule worth running is `synonym-rotation`** — the same action under several names
(`show`/`display`, `check`/`verify`/`validate`, `remove`/`delete`). It is a machine check on the
vocabulary `CONTEXT.md` exists to fix, and it catches drift across files that no single doc's
review would. An update is where that drift happens: the new paragraph says "display" because
you wrote it today, and the paragraph above says "show" because you wrote that one in June.

```bash
python <skill>/../asd-ste100/scripts/ste-lint.py --disable semicolon app/components/base/select/README.md
```

The script ships with the `asd-ste100` skill, installed beside this one. Unlike the other
scripts here it takes files, not a directory, so pass a glob for more than one.

Everything else it reports is advisory. Fix a finding when the fix is clearly better:

- **`passive-voice`** — usually Vue or the browser acting, and naming the actor often helps.
  It is the bulk of the output and most of it is noise.
- **`present-perfect`** — often a legitimate keep. "until the leave animation *has finished*"
  is current relevance, which the rule itself says to preserve.
- **`dangling-conjunction`** — a false positive on wrapped lines. It reads a line ending in
  "or" as an incomplete list item.
- **`semicolon`** is off by house style. **Do not re-enable it to "fix" the docs.** STE bans the
  mark outright (Rule 8.1) because it was written for aircraft maintenance cards, and a
  Markdown table cell has no "split into two sentences" fix available.

For a longer rewrite, invoke the `asd-ste100` skill rather than only the linter, and keep the
two files in different modes: a README is acted on, so an unnamed actor is a defect there; a
`DESIGN.md` explains a decision, and a rationale compressed into short declaratives stops being
a rationale.

**Fix the file you touched. Do not retrofit a whole folder in one pass** — a diff that large
hides the places where a rewrite quietly dropped a condition. That is the real risk here: the
rewrite reads better *because* it lost a scope qualifier, and nobody sees it in 200 changed
lines. Do not gate source files on this at all.

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

**2. Work out the blast radius.** A component's docs are not the only ones that can be wrong:

| Location | On a change |
| --- | --- |
| `<component>/README.md` | Update. This is the point. |
| `<component>/DESIGN.md` | Update when it exists and the change touches its reasoning. Do not create one to hold a changelog. |
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

**When the recorded *reasoning* was wrong, the correction is the content — keep both.** This is
principle 6, and it is different from a design that simply moved on. Editing ADR-0002 to agree
with today's code would delete the only thing that stops someone re-deriving the same wrong
conclusion from the same real trap.

**An edited ADR reads as a decision, not as a changelog.** Rewrite it so it states what is
true now. Do not leave the strikethrough-and-annotate scars that accumulate from editing
around the old text — `~~**X has to come back.**~~ **Superseded — it never left, but...**` is
a diff, not a decision, and the next reader has to reconstruct the current position from it.
If an edit leaves you wanting that kind of scar tissue, the change is probably big enough to
deserve its own ADR even now.

A closed spec in `docs/specs/` stays closed: its work landed, and it is finished rather than
wrong. Update one in place only while its work is still open.

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
into one component. A path in backticks rots the same way and nothing resolves it:
`pages/test/select-types.vue` outlived its directory in three docs at once. Run
`check-doc-scope.mjs` after any rename or move, and grep for the old name, which the script
cannot know.
