---
status: accepted
---

# Calendar's selection mode is a string union, not a boolean

`Calendar` takes `mode?: 'single' | 'multiple'` and narrows `v-model` to `Date | null` or
`Date[]`. `Select`, under [ADR-0003](0003-select-handles-both-modes-in-one-component.md), takes
`multiple?: M & boolean`. Two sibling components in the same library spell the same idea
differently, so this records why.

## The decisive argument is the *next* change

`DateRangePicker.vue` exists and is on the same chopping block as everything else built on
PrimeVue's `DatePicker`. Range is therefore **known** future work, not speculation.

- Widening `'single' | 'multiple'` to `'single' | 'multiple' | 'range'` is **backwards
  compatible**. No call site moves.
- Going from `multiple: boolean` to three states is not. Either a second `range` boolean is
  added — making the nonsense state `<Calendar multiple range>` expressible in the type — or
  every call site breaks.

A boolean cannot express three states. The domain has three. The type should say so.

## It also sidesteps ADR-0003's landmine entirely

ADR-0003 exists because a bare generic boolean prop compiles to `type: null`, Vue skips
Boolean casting, and `<Select multiple>` arrives as `""` — falsy — so the component silently
does the wrong thing. That failure is invisible at runtime and to ordinary tests, and needed
two dedicated guards to catch: the `multiple: ''` case in `SelectModes.spec.ts`, and a
`vue-tsc`-checked page.

**String props have no casting rule and no equivalent trap.** `mode="multiple"` either matches
the union or `vue-tsc` fails loudly. Note this is a reason the enum is *safe*, not the reason
it was chosen — ADR-0003 demonstrated that `M & boolean` works. Had there been only two states,
matching `Select` would have won.

## Consequences

- **It is inconsistent with `Select`.** A developer who learned `<Select multiple>` will write
  `<Calendar multiple>` and get a type error. That is a real tax in a library whose selling
  point is coherence, and it is the price of this decision. ADR-0003's substantive reasoning —
  one component, several modes, because they share nearly everything — survives intact; only
  the *spelling* of the prop changes.
- **`range` is deferred, not designed.** Reserving a slot in a union costs nothing;
  half-building tentative-range hover preview, two-anchor state and third-click semantics costs
  a lot. `mode` ships as two members.
- `withDefaults` cannot type a generic prop's default, so `mode`'s fallback to `'single'` is
  restated where the composable reads it. Losing that restatement makes `mode` `undefined` at
  runtime, which `vue-tsc` catches.
- **`app/pages/playground/calendar-types.vue` is load-bearing.** Narrowing is invisible to unit
  tests; only a `.vue` template type-check proves `mode="multiple"` turns `v-model` into
  `Date[]`. Its `@vue-expect-error` directives are the half that matters — if narrowing
  regresses so `modelValue` widens, the mismatched bindings stop erroring and `vue-tsc`
  reports the directives as unused. Either direction fails the build. It also asserts that
  `mode="range"` is currently rejected, which is what will need updating — deliberately and
  visibly — when range lands.
