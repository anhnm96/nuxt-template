---
status: accepted
---

# Autocomplete is a separate component, and carries a Value and a Query

`Autocomplete` is its own component under `base/autocomplete`, with its own composable. It is
not a mode of `Select`. It exposes two models — `v-model` for the Value and `v-model:query`
for the Query — and neither narrows the other's type.

[ADR-0003](0003-select-handles-both-modes-in-one-component.md) merged `MultiSelect` into
`Select`, so this reverses the direction of that decision for a component that looks adjacent.
It is reversed for a reason ADR-0003 names itself.

## Why ADR-0003 does not extend to this

ADR-0003 merged two *selection modes* that shared one invariant. CONTEXT.md states it under
**Item**: the `items` array is the single source of truth for option membership and identity.
Single and multiple differ in how many Options the model holds, never in where a Value may
come from. That shared invariant is what made five conditionals cheaper than two wrappers.

A Freeform Autocomplete breaks the invariant. Its value may be text that corresponds to no
Item, has no Key, and that `keyOfValue` can never resolve. There is no selection mode here to
merge — the two components disagree about what a Value *is*.

Four behaviours of `useSelect` are contradicted rather than extended, which is the practical
form the same disagreement takes:

| `useSelect` | Autocomplete needs |
| --- | --- |
| `query` is internal and resets on close | `query` is the input's visible text, modelled, and survives close |
| `Delete`/`Backspace` on the closed Trigger clear the selection | those keys edit text; the shortcut is unavailable |
| opens positioned on `selected-or-first` | typing must leave no Active Option |
| `watch(visibleOptions)` force-activates the first Option | an empty Active Option must be allowed to persist |

Turning each off would mean four props whose only job is to disable a decision Select's own
`DESIGN.md` argues for. That is how a deep module becomes a settings bag.

## Two models, not one

The alternatives considered for what `v-model` carries in Freeform:

- **A `string`** — the input *is* the value. One truth, but a pick loses the Key, and
  `itemValue` becomes meaningless in half the component's configurations.
- **`Value | string`** — undiscriminable. `item-value="code"` makes both members strings, so a
  consumer cannot tell a pick from a typed word.
- **A tagged union** — correct, and every call site pays a `.kind` check for a distinction most
  do not care about.
- **Two models** — chosen. `v-model` is always `Value | null`; `v-model:query` is always the
  text. Freeform reads as `modelValue ?? query`.

Two models have one failure mode, and the whole design exists to close it: the Value and the
Query can disagree. Pick Japan, then delete a character, and the model says `jp` while the box
says `Japa`.

**The invariant that closes it:** `modelValue` is non-null *if and only if* `query` is exactly
the Label of the selected Option. Any keystroke that breaks the equality sets `modelValue` to
null.

Everything else in the component is derived from it rather than decided separately:

- **Filtering.** Filter only while `modelValue` is null. A non-null Value means the text is an
  echo of the selection, not a search, so the list shows every Option — which is what makes a
  filled field browsable. This needs no "did the user type?" flag, and it handles the case that
  defeats the naive `query === someLabel` rule: typing a full Label by hand never selects
  anything, so the model stays null and the list correctly filters.
- **Abandon.** A Dirty Query is exactly "`modelValue` is null and `query` is not empty", which
  is the only state the exit rules have to decide.
- **No conditional model type.** `freeform` does not narrow `v-model`, so the `M & boolean`
  trap ADR-0003 documents does not arise here, and no second `select-types.vue` is needed to
  guard against it.

The cost is a real one and is not hidden: typing after a pick emits `update:modelValue(null)`,
so a consumer watching the model sees a null on every edit, including edits the user abandons.
Restoring the Last Commit on Abandon then emits the old Value again. Two emissions per
abandoned edit buys a model that never lies, and the alternative — letting the Value lag the
text until blur — makes `watch(modelValue)` fire a focus event late, which reads as a broken
form.

## Consequences

- **`CONTEXT.md` gains an Autocomplete section**: Query, Dirty Query, Last Commit, Abandon,
  Freeform. `Trigger` is corrected at the same time; it claimed Select used a text input when
  searchable, which `SelectControl.vue` has never done.
- **`Dropdown` gains `dismissOnClickOutside`**, defaulting to `triggers.includes('click')`.
  Click-outside dismissal was wired to the `click` trigger, so an input Trigger could not opt
  out of click-to-toggle without also losing dismissal. The default preserves every existing
  consumer by construction.
- **`Home` and `End` move the caret**, not the Active Option. An editable combobox cannot take
  them; `PageUp`/`PageDown` are the only keys that jump the list. This is a deliberate
  divergence from Select's keymap, not an oversight.
- **`autoHighlight` defaults to `!freeform`**, and highlights only on a prefix match of the
  Label. Auto-highlighting in Freeform is how `Enter` commits a suggestion the user was
  ignoring; defaulting it off there removes the trap without removing the feature.
- **The option-list model is shared, the policy is not.** `composables/useOptionList.ts` owns
  accessor normalization, filtering, `groups`, `visibleOptions` and the Active Option with its
  `useListNavigation` wiring. `useSelect` and `useAutocomplete` both build on it and keep what
  makes them different: who owns the Query, when the popup may open, and the keymap. The seam
  falls on the glossary — Item through Visible Options and Active Option is shared; how a widget
  drives them is not. This is the cut [ADR-0009](0009-menus-are-menus-not-listboxes.md) already
  made one layer down, where `useListNavigation` owns the arithmetic and each host keeps its
  cursor.

  Shipping the fork first and extracting after was deliberate: it kept the review of a new
  component separate from a refactor of a shipped one. The extraction changed no test and no
  public type, which is what made it safe to do second.
- **`skipFilter` is the only policy hook `useOptionList` takes.** Both hosts pass
  `externalFilter` through it; an Autocomplete also passes "the Query is an echo of the selected
  Label", which keeps a filled field browsable. The shared module holds no opinion about either
  reason — it would become a settings bag the moment it did.

  A second hook, `suppressOptions`, carried an Autocomplete's `minQueryLength` threshold when
  this ADR was written. Both the prop and the hook were removed afterwards: the consumer who
  debounces a search already owns the minimum Query, so the component held a second copy of a
  number it could not decide. See the Autocomplete's `DESIGN.md` — "Debouncing and the minimum
  Query belong to the consumer". The bag stayed empty, which is the outcome this bullet wanted.
- **`playground/select-types.vue` and `playground/autocomplete-types.vue` guard the generics at
  real call sites.** The accessor types are declared once now, so both pages check the same
  inference through two different components; the `@vue-expect-error` directives failing to be
  unused is what proved the extraction did not loosen it.

## The lesson worth keeping

ADR-0003's merge was right because the two modes shared an invariant. Reach for the same merge
when they do not, and the shared component spends its props disabling itself. Check what the
candidates disagree about before counting how much code they have in common.
