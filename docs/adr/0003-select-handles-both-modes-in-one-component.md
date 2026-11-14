---
status: accepted
---

# Select handles both selection modes in one component

`Select` takes a `multiple` prop and narrows `v-model` to `V[]` or `V | null` accordingly.
There is no separate `MultiSelect`. The prop is declared `multiple?: M & boolean`, and the
intersection is the part that must not change.

## The trap

Typing `modelValue` honestly under one component needs a generic type parameter on the prop.
What the SFC compiler emits for that prop depends on how the parameter is written, verified
against `@vue/compiler-sfc@3.5.42` rather than assumed:

| prop declaration | runtime type | `<Select multiple>` yields |
| --- | --- | --- |
| `multiple?: boolean` | `Boolean` | `true` |
| `multiple?: M` | `null` | `""` — falsy |
| **`multiple?: M & boolean`** | **`Boolean`** | **`true`** |

With `type: null` Vue skips Boolean casting, so the bare `multiple` attribute arrives as an
empty string and the component silently behaves as single-select. The failure is quiet and
produces no warning.

The intersection gives the SFC compiler a concrete `boolean` member to emit, while TypeScript
still infers the literal `M`. This is the technique Nuxt UI's own `Select` uses.

## What misled us

This decision was first made the other way. Multi-selection shipped as its own
`MultiSelect.vue` over a shared `useSelect`, because the second row of the table looked like a
hard blocker: a generic `multiple` prop silently broke.

The measurement was accurate and the conclusion drawn from it was wrong. It measured a **bare**
type parameter, not the declaration worth shipping. The third row removes the only hard
blocker, and nobody had compiled it.

This section stays because the trap is real and the wrong answer is easy to reach again from
it.

## What convinced us

Three independent checks, because either half alone would have been insufficient, and because
the first decision is a record of trusting one incomplete measurement:

1. **Runtime** — compiling the real component emits `multiple: { type: Boolean, required: false }`.
2. **Types in isolation** — a `--strict` `tsc` probe confirms `M` infers through the
   intersection, with mismatched `modelValue` rejected in both directions.
3. **Types at a call site** — `pages/playground/select-types.vue` is checked by `vue-tsc` and covers
   single, bare `multiple`, and both whole-Item variants. Its `@vue-expect-error` directives
   were verified to be *live*: making a mismatched binding correct causes vue-tsc to report
   the directive as unused, so the probe cannot pass vacuously.

Checks 1 and 2 were available when the first decision was made. Check 3 was not: the repo had
no type checker at all until `vue-tsc` was added for this decision.

## Considered options

- **Two components** — rejected. Each `modelValue` type stays simple, but the behaviours that
  diverge (close-on-select, `Enter` vs `Space`, `aria-multiselectable`, what `clearable`
  clears) amount to five conditionals. That is less duplication than two near-identical
  wrappers over the same shared parts.
- **`multiple` prop, `defineModel<V | V[] | null>()`** — rejected. It avoids the casting bug
  but pushes a union onto every call site, which each consumer must then narrow.
- **`multiple?: M & boolean`, conditionally-typed `modelValue`** — chosen.

## Consequences

- **The `#value` slot has one signature for both modes**: `{ modelValue, option, options,
  unresolvedCount }`. Each mode carries one field it does not need — `option` is
  `options[0] ?? null`. This is the only place the merge is a genuine compromise, and it is
  why the slot prop is `modelValue` rather than `value`.
- **`modelValue` has no `default`.** The modes would need different ones (`null` vs `[]`), and
  a prop carries one. Undefined is normalised where it is read, so an uncontrolled Select
  starts genuinely empty instead of with a fabricated value.
- **Two regression guards are load-bearing and must not be deleted**: the `multiple: ''` case
  in `SelectModes.spec.ts` (runtime casting) and `pages/playground/select-types.vue` (narrowing).
  Both fail loudly if the declaration regresses to a bare `M`.

## The casting rule in reverse

The same rule bites from the opposite direction whenever a `false` literal appears in a prop's
type union. `filterFn?: false | ((item, query) => boolean)` compiles to
`type: [Boolean, Function]`, and Vue defaults an *absent* Boolean-typed prop to `false`. A
`false` sentinel meaning "the parent filters" would silently disable filtering at every call
site that never passed one. That is why filtering is switched off by its own `externalFilter`
prop instead.

A plain `boolean` prop whose absence must mean something has the same problem, and needs an
explicit `undefined` default.

Before putting a boolean literal in a prop union, check what the SFC compiler emits.

## The lesson worth keeping

When a compiler behaviour drives an architectural decision, test the **exact declaration you
intend to ship**, and prefer a guard that fails the build over a note in a document.
