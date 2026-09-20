---
status: accepted
supersedes: ADR-0002
---

# Select handles both selection modes in one component

`Select` takes a `multiple` prop and narrows `v-model` to `V[]` or `V | null` accordingly.
`MultiSelect` is removed. This reverses [ADR-0002](0002-select-and-multiselect-are-separate-components.md),
whose central argument turned out to be a measurement error.

ADR-0002 rejected a `multiple` prop because a generic prop compiles to `type: null` in the
runtime props, which makes Vue skip Boolean casting so `<Select multiple>` arrives as `""` —
falsy — and the component silently behaves as single-select. That is true of a **bare** type
parameter and only of a bare type parameter:

| prop declaration | runtime type | `<Select multiple>` yields |
| --- | --- | --- |
| `multiple?: boolean` | `Boolean` | `true` |
| `multiple?: M` | `null` | `""` |
| **`multiple?: M & boolean`** | **`Boolean`** | **`true`** |

The intersection gives the SFC compiler a concrete `boolean` member to emit, while TypeScript
still infers the literal `M`. This is the technique Nuxt UI's own `Select` uses.

## What convinced us

Three independent checks, because either half alone would have been insufficient — and
because ADR-0002 exists precisely as a record of trusting one incomplete measurement:

1. **Runtime** — compiling the real component emits `multiple: { type: Boolean, required: false }`.
2. **Types in isolation** — a `--strict` `tsc` probe confirms `M` infers through the
   intersection, with mismatched `modelValue` rejected in both directions.
3. **Types at a call site** — `pages/test/select-types.vue` is checked by `vue-tsc` and covers
   single, bare `multiple`, and both whole-Item variants. Its `@vue-expect-error` directives
   were verified to be *live*: making a mismatched binding correct causes vue-tsc to report
   the directive as unused, so the probe cannot pass vacuously.

Checks 1 and 2 were available when ADR-0002 was written. Check 3 was not: the repo had no type
checker at all until `vue-tsc` was added for this decision.

## Consequences

- **The `#value` slot has one signature for both modes**: `{ modelValue, option, options,
  unresolvedCount }`. Each mode carries one field it does not need — `option` is
  `options[0] ?? null`. This is the only place the merge is a genuine compromise, and it is
  why the slot prop is `modelValue` rather than the old `value`.
- **`modelValue` has no `default`.** The modes would need different ones (`null` vs `[]`), and
  a prop carries one. Undefined is normalised where it is read, so an uncontrolled Select
  starts genuinely empty instead of with a fabricated value.
- **Two regression guards are load-bearing and must not be deleted**: the `multiple: ''` case
  in `SelectModes.spec.ts` (runtime casting) and `pages/test/select-types.vue` (narrowing).
  Both fail loudly if the declaration regresses to a bare `M`.
- The behavioural divergence ADR-0002 also cited — close-on-select, `Enter` vs `Space`,
  `aria-multiselectable`, what `clearable` clears — amounts to five conditionals, which is
  less duplication than two near-identical wrappers over the same shared parts.

## The lesson worth keeping

ADR-0002's evidence was correct and its conclusion was wrong, because the variant tested was
not the variant worth shipping. When a compiler behaviour drives an architectural decision,
test the **exact declaration you intend to ship**, and prefer a guard that fails the build
over a note in a document.
