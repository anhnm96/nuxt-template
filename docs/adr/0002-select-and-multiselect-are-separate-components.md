---
status: superseded by ADR-0003
---

# Select and MultiSelect are separate components, not a `multiple` prop

Multi-selection ships as its own `MultiSelect.vue` rather than a `multiple` prop on
`Select.vue`. Both are thin components over a shared `useSelect` composable and shared
popup/option children; the composable is the deep module, the two components are the seam.

The decisive reason is a Vue compiler behaviour, verified against `@vue/compiler-sfc@3.5.42`
rather than assumed. Typing `modelValue` honestly under a single component requires a generic
type parameter on the prop (`generic="T, M extends boolean = false"`, `multiple?: M`), but a
type-parameter-typed prop compiles to `{ type: null }` in the runtime props instead of
`{ type: Boolean }`:

| prop declaration | runtime type | `<Select multiple>` yields |
| --- | --- | --- |
| `multiple?: boolean` | `Boolean` | `true` |
| `multiple?: M` (generic) | `null` | `""` — falsy |

With `type: null` Vue skips Boolean casting, so the bare `multiple` attribute arrives as an
empty string and the component silently behaves as single-select. The failure is quiet and
produces no warning.

## Considered options

- **`multiple` prop, conditionally-typed `modelValue`** — the bug above.
- **`multiple` prop, `defineModel<V | V[] | null>()`** — avoids the bug but pushes a union
  onto every call site, which each consumer must then narrow.
- **Two components** — chosen. Each `modelValue` type stays simple and honest, and the
  behaviours that genuinely diverge (close-on-select, `Enter` vs `Space`,
  `aria-multiselectable`, `aria-selected` on one option vs many, trigger rendering, what
  `clearable` clears) stop being `v-if="multiple"` branches.

## Consequences

The same casting rule bites in reverse whenever a `false` literal appears in a prop's type
union. `filterFn?: false | ((item, query) => boolean)` compiles to
`type: [Boolean, Function]`, and Vue defaults an *absent* Boolean-typed prop to `false` —
so a `false` sentinel meaning "the parent filters" silently disabled filtering at every call
site that never passed one. That is why filtering is switched off by its own
`externalFilter` prop instead. Before putting a boolean literal in a prop union, check what
the SFC compiler emits.

## Superseded

The table above is accurate, but the conclusion drawn from it was wrong: it measured a **bare**
type parameter, not the declaration worth shipping. `multiple?: M & boolean` keeps Boolean
casting (`type: Boolean`) while still inferring `M`, which removes the only hard blocker.
See [ADR-0003](0003-select-handles-both-modes-in-one-component.md), which reverses this
decision and records how the reversal was verified.
