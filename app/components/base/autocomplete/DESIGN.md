# Autocomplete — design

Why this component is built the way it is. For how to *use* it — props, slots, keyboard, a11y —
see [README.md](./README.md).

Terms in Title Case are defined in [CONTEXT.md](../../../../CONTEXT.md). The architectural
rationale lives in
[ADR-0012](../../../../docs/adr/0012-autocomplete-is-separate-from-select.md), which also
explains why [ADR-0003](../../../../docs/adr/0003-select-handles-both-modes-in-one-component.md)
does not extend to it.

## Purpose

An editable combobox: one Option or none, chosen by typing. Two things make it a different
widget from a searchable Select rather than a mode of one.

The Trigger is the text input, so there is no second field inside the popup and `role="combobox"`
never moves. And in `freeform` the value may be text that corresponds to no Item — which breaks
the invariant Select is built on, that `items` is the single source of truth for membership and
identity.

## Shape

```
base/autocomplete/
  Autocomplete.vue          root: props, both models, the open/clear/toggle gestures
  AutocompleteControl.vue   the control box: input, clear button, chevron, $attrs split
  AutocompletePopup.vue     the list, the groups, the three empty states
  AutocompleteOption.vue    role="option" (NOT a <Button>)
  useAutocomplete.ts        the deep module: normalization, Visible Options, keyboard, open state
  context.ts                createContext, per the house pattern
```

The folder mirrors `base/select/` deliberately. `useAutocomplete.ts` copies roughly 40% of
`useSelect.ts` — accessor normalization, `matchedOptions`, `groups`, `visibleOptions` and the
`useListNavigation` wiring — and that copy is meant to be lifted into a shared `useOptionList`.
Keeping the two shapes parallel is what makes the extraction a lift rather than a merge. ADR-0012
records the commitment; do not let the two drift in the meantime.

## The (A) invariant

Everything below is derived from one rule, rather than decided separately:

> `modelValue` is non-null **if and only if** `query` is exactly the Label of the selected
> Option.

Two models can disagree — pick Japan, delete a character, and the model says `jp` while the box
says `Japa`. (A) closes that by making any divergence clear the Value. What falls out:

- **Filtering.** Filter only while `modelValue` is null. A non-null Value means the Query is an
  *echo* of the Label, so the list shows everything and a filled field stays browsable.
  No "has the user typed?" flag is needed, and the case that defeats the obvious rule
  `query === someLabel` is handled for free: typing a full Label by hand never selects anything,
  so the model stays null and the list correctly narrows.
- **Dirty Query.** Exactly "`modelValue` is null and `query` is not empty" — the one state the
  exit rules have to decide about.
- **No conditional model type.** `freeform` narrows nothing, so ADR-0003's `M & boolean` casting
  problem does not arise.

The cost is paid openly: typing after a pick emits `update:modelValue(null)`, and Abandon then
emits the old Value again. Two emissions per abandoned edit buys a model that never lies. The
alternative — letting the Value lag the text until blur — makes `watch(modelValue)` fire a focus
event late, which reads as a broken form.

### Where it is enforced

In `handleInput`, not in a watcher. A watcher on `query` would also fire on the echo that
`commit` and `abandon` write, and fight the restore they perform in the same tick. `handleInput`
is the only place the Query changes by typing, which makes it the only place that has to care.

One watcher does exist, on the resolved `selectedOption`, and it only repairs (A) when the Value
changes from *outside* — an initial model, a form reset, or an Item that resolves once `items`
arrive. For the component's own writes it is a no-op, because they already set both halves.

## Abandon

Blur, `Tab` and the second `Escape` share one policy, because they are one intention.

The empty-Query branch is the part worth not "fixing". Restoring the Last Commit over an empty
field would mean the field has no "off" — and emptying the field is the keyboard path to
clearing, since `Delete` and `Backspace` are text keys here and cannot carry Select's clear
shortcut. A partial Query is genuinely ambiguous, a slip or an abandoned edit, so the
conservative reading wins there and not for empty.

That leaves one seam, accepted: delete down to `Fra` and leave, and Japan comes back; delete all
the way and leave, and the field is empty. The same gesture, decided by one character.

### Blur closes before it abandons, and the order is the point

Blur fires on `mousedown`; `Dropdown`'s click-outside fires on `click`. Abandoning first would
restore the Last Commit while the popup was still open, and the list would visibly flip from "No
results" to every Option in the gap between those two events. So `onBlur` calls `close()` and
then `abandon()`.

Closing on blur is right on its own terms as well — a field that has lost focus should not leave
a popup behind — and it is always safe here, because every pointer gesture inside the control
prevents `mousedown`. A blur is therefore always a genuine exit.

### The popup freezes what it draws while closing

Closing first is not sufficient. `Dropdown` keeps the popover mounted through its leave
transition, and `abandon()`'s model writes land inside that window, so the swap would still be
visible on the way out. `AutocompletePopup` resolves the whole render into one `view` value and
stops updating it while `isOpen` is false.

It watches `isOpen` as well as the view, so reopening picks the live state back up. The popup
does remount on each open today, which would hide the omission — and would leave this depending
on a detail of how `Dropdown` nests its `v-if` inside its `<Transition>`.

`useAutocomplete` is untouched by any of this: it keeps reporting the truth, and only what is
drawn is frozen. Nothing is navigable while the popup closes, so the freeze costs nothing.

### Focus is not restored on close

`Dropdown` returns focus to whatever held it when the popover opened. Here that is the input
itself, so restoring would pull focus back out of wherever the user just clicked. `Escape` needs
no restore either, because focus never leaves the input. Hence `:restore-focus="false"`.

### Last Commit is recorded by watching, not by hooking `commit`

It watches the resolved selection instead, so a Value the parent supplied — or one whose Item
only arrives with a later `items` — is remembered too. It is not cleared when *typing* nulls the
model, because that is precisely the state it exists to undo. `clear()` discards it, and so does
the consumer clearing the Value — see below.

Watching the *resolved* selection leaves one hole, which `lastCommittedValue` fills: a Value set
before its Items arrive resolves to no Option, so there is nothing for Abandon to restore. The
field looks empty for that whole window — the Label lives in the Item and nowhere else — so a
stray keystroke inside it would null the model, and Abandon would then clear a field the
consumer had filled.

Supplying a Value with no Item is a consumer contract violation and the README says so. Loading
`items` asynchronously is not: that consumer did everything right, and the window is theirs by
construction. So the raw Value is remembered alongside the Option, and Abandon falls back to it
— restoring the Value with an empty Query, which is exactly the state the field was already in.
The `selectedOption` watcher writes the Label once the Items land.

The fallback is deliberately *below* the Option: a resolved Last Commit restores its Label too,
and only an unresolved one falls through.

### Who cleared the Value decides what happens to the Query

The (A) invariant has to be repaired in both directions, and only one of them is typing.

When the component nulls the Value — `handleInput`, under (A) — the Query is the user's text and
both memories are what Abandon will put back. When the *consumer* nulls it, neither is true: the
Query is the Label of a Value that no longer exists. Leaving it shows a filled field over an
empty model, and the Dirty Query that creates makes the next Abandon restore the very Value the
consumer just cleared — a form reset undone by tabbing through the field.

So every write to the model goes through `writeValue`, which records what it wrote; the watcher
compares by identity and repairs only what it did not write. Two guards sit beside it:

- **`undefined` to `null`** is a form normalising its shape, not a Value being taken away. Only
  a Value that *was* there can be cleared, so the previous value has to be non-nullish.
- The repair discards both memories, not just the Query. That is also what keeps a **dataset
  swap** honest: an Option remembered from the old `items` can no longer be restored over the
  new ones.

The component cannot detect a dataset swap by itself. Under `externalFilter` every search
replaces `items`, and a Last Commit missing from the current results is the normal case there —
so validating the memory against `allOptions` would break the ordinary async path. The consumer
resetting the model alongside the swap is the only signal available, and it is the right one: a
dependent field that changes its dataset without clearing its value is holding a dangling Value
either way.

## Escape is two-stage

The first press dismisses the popup and leaves the text alone; the second restores the Last
Commit. They are different intentions that share a key: "get this list out of my way" is not
"undo my edit".

Stage one has to stop propagation, because
[`Dropdown` owns `Escape`](../dropdown/Dropdown.vue) with `stopImmediatePropagation` and would
otherwise close the popup before this component could tell the two stages apart. Stage two is
consumed only when there is an edit to undo, so an enclosing dialog still sees the key in every
other case.

## Auto-highlight, and why it is a prefix match

Typing with no Active Option means `Enter` does nothing, and every selection costs an extra
`ArrowDown`. Highlighting the first match fixes that, and lays a trap in `freeform`: the user
types a custom value in full, presses `Enter` meaning *"use what I typed"*, and commits a
suggestion they were ignoring.

So `autoHighlight` defaults to `!freeform` and matches on a **prefix** of the Label. The default
filter matches substrings, so the top row may merely *contain* the Query — committing that on
`Enter` is the trap in miniature. Falling back to no Active Option makes `Enter` mean "use my
text", which is the safe reading.

`freeform` still does exactly one thing. `autoHighlight` is a separate prop that merely *starts*
in the sensible place for each mode, so a consumer who wants freeform with auto-highlight writes
one attribute. Under a coupled design they could not.

### `autoHighlight: undefined` is load-bearing

A `boolean` prop compiles to `type: Boolean`, and Vue's Boolean casting turns an *absent* prop
into `false` unless the options object carries a `default` key. Without
`autoHighlight: undefined` in `withDefaults`, "not set" and "off" become the same value and the
`!freeform` default can never fire.

Nothing else fails when that regresses — the component merely stops highlighting, which reads as
a missing feature rather than a bug. `AutocompleteState.spec.ts` guards it directly. This is the
same casting rule as ADR-0003, and the same one that ruled out a `filterFn: false` sentinel in
Select.

## Opening

| gesture | Active Option |
| --- | --- |
| typing | none; auto-highlight then decides |
| `ArrowDown` / `ArrowUp` | the Selected Option, else first / last |
| click on the input, or the chevron | the Selected Option, else **none** |
| `Tab` into the field | the popup does not open |

A click is browsing, not navigating. Activating whichever Option happens to be first would make
`Enter` commit something the user never looked at, so `selected-or-none` exists as its own
position for pointer opens.

`Tab` must not open: a form of six fields should not fire six listboxes open and shut, and
open-on-focus would fight Abandon — the restore runs, focus returns, and the popup reopens.

Clicking the input when it is already open does nothing. Repositioning the Active Option there
would move the highlight out from under a user who only wanted the caret.

## Relationship to Dropdown

`Dropdown` is the Menu Host. Three of its props carry this component's requirements:

- `manage-keyboard="false"` — navigation is this component's, under the `aria-activedescendant`
  model of ADR-0001.
- `focus-on-open="false"` — focus stays in the input, as it does for `TimePicker`.
- `triggers="[]"` with `dismiss-on-click-outside` — clicking the input must place a caret, so
  the trigger cannot toggle on click. The chevron is then the only pointer gesture that closes.
- `restore-focus="false"` — the input holds focus throughout, so there is nothing to restore
  and restoring would take focus back from wherever the user clicked.

`dismissOnClickOutside` and `restoreFocus` were both added to `Dropdown` for this. Click-outside
dismissal was previously wired to the `click` trigger, so opting out of click-to-toggle also
switched off the only way to dismiss with a mouse. Both default to the previous behaviour, so
every other consumer is unchanged by construction.

**`dismissOnClickOutside: undefined` in `Dropdown`'s `withDefaults` is load-bearing**, for the
same reason as `autoHighlight` above. Without it Vue casts the absent prop to `false`,
`?? triggers.includes('click')` becomes unreachable, and click-outside dies silently for *every*
`Dropdown` consumer — Select, Menu, ContextMenu, TimePicker. It shipped broken exactly that way
and no existing test noticed, which is what `Dropdown.spec.ts` now exists to prevent.

The control is also whitelisted out of `Dropdown`'s click-outside, scoped by
`[data-autocomplete="<id>"]`. A shared selector would make a click on any *other* Autocomplete
count as inside this one.

### The attribute order in `AutocompleteControl`

`v-bind="inputAttrs"` is spread **before** the input's own attributes. `Dropdown` merges
`data-slot="dropdown-trigger"` and `aria-haspopup="true"` onto whatever it is given, and with
`inheritAttrs: false` that lands on the input — silently replacing the combobox's `data-slot`
and narrowing `listbox` to `true`. It failed exactly that way the first time, and every test in
the suite went red at once. `SelectControl` orders its trigger the same way, for the same reason.

## Loading never blocks

Select refuses to open while loading with no Items, because the popup would be an empty box with
a spinner the trigger already shows. Here that is backwards: the keystroke that starts the
request is the same one that should show the popup.

`listboxIsRendered` lives in the composable rather than being recomputed in the popup and the
control. The popup branches on it and the input's `aria-controls` / `aria-activedescendant` hang
off it; an `aria-controls` pointing at an id that resolves to nothing is worse than no
relationship at all, so the three must not drift.

## The popup sizes itself, not its list

`.select-list` carries Select's `min-width: max(var(--trigger-width), 180px)`, and only two of
the four popup states render it. The loading and "keep typing" states have no list, so the
popover collapsed to the width of a spinner or a line of text. `.autocomplete-popup` takes the
sizing instead, so every state is the same width.

Select never showed this: it refuses to open while it has nothing to list, so that branch is
nearly unreachable there. An Autocomplete always opens, which puts the loading state on the
path of every server-backed search.

## Three empty states, not one

Below `minQueryLength`, loading-with-nothing, and loaded-with-no-matches are ordered rather than
combined. Collapsing the first into the third is the common bug: a freshly focused field
announcing "No results" before the user has typed is wrong, and under `externalFilter` it would
be wrong for the length of every request.

## Debouncing belongs to the consumer

`query` is a model, not an event. Debouncing `update:query` would make the consumer's copy lag
the visible text — so in `freeform`, where the value is `modelValue ?? query`, the value itself
would lag on a timer. A component-owned debounce would therefore need a third emission alongside
the undebounced one, and two query-ish things with different timings is a worse API than one
line of `watchDebounced` at the call site.

## Out of scope

- **Multiple selection** — one Option or none. Tags are a display treatment for a different
  component, not this one.
- **Create-new-option entry** — `freeform` already makes the typed text the value, so a
  "Create «foo»" row would be a second way to do what typing did.
- **Inline completion** (`aria-autocomplete="both"`) — it fights (A) on every keystroke, it is
  hostile in `freeform`, and it makes `Backspace` behave differently from every other field.
- **Virtualization** — no list here approaches a size that needs it; ADR-0001 keeps it possible.
