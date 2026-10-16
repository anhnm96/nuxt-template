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
  useAutocomplete.ts        the policy: two models, Last Commit, Abandon, keyboard, open state
  context.ts                createContext, per the house pattern

composables/
  useOptionList.ts          the option-list model, shared with Select (ADR-0012)
```

The folder mirrors `base/select/` deliberately, and the two share their model: Items become
Options, a Query narrows them, Groups cluster them and the Active Option moves over them, all in
[`useOptionList`](../../../composables/useOptionList.ts). What stays here is the policy — the two
models and the invariant between them, the Last Commit, Abandon, the open positions and the
keymap. See ADR-0012 for why the boundary falls there.

One policy hook carries this widget's share of the filtering. `skipFilter` takes
`externalFilter` **or** a set Value, because a Value means the Query is an echo of its Label
rather than a search. `useOptionList` holds no opinion about either reason, and `skipFilter` is
now the only *policy* hook it takes — the rest of its options describe the list itself
(`filterFn`, `loop`, `typeahead`). See "Debouncing and the minimum Query belong to the consumer"
for the second hook that was removed.

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

## Relationship to the Popover

This component is a **Field Popover**: it builds on
[`usePopover`](../popover/README.md) directly rather than on `Dropdown`. See CONTEXT.md for
the term, and [ADR-0013](../../../../docs/adr/0013-popover-mechanism-is-separate-from-dropdown.md)
for the split.

A bare `Popover` merges nothing onto its reference, so none of this component's requirements
need stating as options.
It does not toggle on click, does not take `ArrowDown`, and does not move focus into the
Popover — which is exactly what an input Trigger needs, because clicking must place a caret and
every printable key belongs to the field. One option is set, against the default:

- `restoreFocus: false` — the input holds focus throughout, so there is nothing to restore, and
  restoring would take focus back from wherever the user clicked.

This replaced four props on `Dropdown` whose only job was to switch `Dropdown` off
(`manage-keyboard`, `focus-on-open`, `triggers="[]"`, `dismiss-on-click-outside`). Two of them
no longer exist anywhere; the other two are `Dropdown`'s own concern now.

The control is whitelisted out of click-outside, scoped by `[data-autocomplete="<id>"]`. A
shared selector would make a click on any *other* Autocomplete count as inside this one. The
chevron is the only pointer gesture that closes from inside the control.

**`dismissOnClickOutside: undefined` in `Dropdown`'s `withDefaults` is still load-bearing**, for
the same reason as `autoHighlight` above — it is just no longer this component's problem.
Without it Vue casts the absent prop to `false`, `?? triggers.includes('click')` becomes
unreachable, and click-outside dies silently for every `Dropdown` consumer. It shipped broken
exactly that way and no existing test noticed, which is what `Dropdown.spec.ts` exists to
prevent.

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

## Two empty states, not one

Loading-with-nothing and loaded-with-no-matches are ordered rather than combined. Collapsing the
first into the second is the common bug: a field announcing "No results" while it is still
fetching them is wrong, and under `externalFilter` it would be wrong for the length of every
request.

## Debouncing and the minimum Query belong to the consumer

`query` is a model, not an event. Debouncing `update:query` would make the consumer's copy lag
the visible text — so in `freeform`, where the value is `modelValue ?? query`, the value itself
would lag on a timer. A component-owned debounce would therefore need a third emission alongside
the undebounced one, and two query-ish things with different timings is a worse API than one
line of `watchDebounced` at the call site.

The same argument retired a `minQueryLength` prop that this component used to carry. The
consumer who debounces also decides which Queries are worth a request — the gate is already
written in their watcher — so a prop restating the number gave the component a second copy of a
decision it could not make. What it bought was a suppressed list and a "keep typing" hint; what
it cost was a rule nobody could guess:

> The threshold gates *searching*, so it stops applying once an Option is **resolved**, because
> a Label is often shorter than the threshold. A Value whose Item has not arrived resolves to
> nothing, so it still applies there.

Both halves of that were shipped wrong once. Keying it off the raw model told a user who had
already chosen `Go` to keep typing; keying it off `hasValue` turned the async window into "No
results" before anyone had typed. The prop also kept a `suppressOptions` hook alive in
`useOptionList`, which is the settings bag ADR-0012 argued the shared module must not become.

The consumer now owns both ends, and `items` and `loading` are the levers. `suppressOptions` did
not merely hide the list, it emptied `visibleOptions` — so nothing highlighted, `selectActive()`
returned false, and `Enter` passed through. It also did this *synchronously*, as a function of
the Query, and that is the part consumer code has to reconstruct:

```js
/** Both the gate and the search read this, or they disagree about what the Query is. */
const term = computed(() => query.value.trim())
const canSearch = computed(() => term.value.length >= 2)

/** The input's version — incremented when the input changes, not when a request is issued. */
let request = 0

// The two branches here mirror the debounced guard below. That is load-bearing: it is what
// makes the early return unreachable while `loading` is true, so the flag cannot leak.
watch([query, city], ([, chosen]) => {
  request++
  if (canSearch.value && !chosen) {
    loading.value = true
    return
  }
  loading.value = false
  if (!chosen) items.value = []
})

watchDebounced(query, async () => {
  if (!canSearch.value || city.value) return
  const token = request
  const value = term.value
  try {
    const results = await search(value)
    if (token !== request) return
    items.value = results
  } finally {
    if (token === request) loading.value = false
  }
}, { debounce: 300 })
```

The rule that makes it work is that the undebounced watcher owns `items` and `loading` outright,
and the debounced request may only ever say "the results arrived". Three defects were found
here, one per review, and each was the same write arriving late by a different route:

- **A clear inside the debounced watcher** reproduces the hiding but not the suppression. For
  the length of the debounce the previous search's Options stay listed, auto-highlighted and
  committable. Dropping from `al` to `a` leaves `Enter` committing a result for `al`.
- **A reply that outlives its Query.** Moving the clear out fixes that window and leaves a
  longer one, because the results are written after an `await`. Versioning the *requests* does
  not close it: a token minted when a request is issued cannot invalidate anything during the
  debounce that follows a keystroke, since no newer request exists there yet. The version has to
  advance when the input changes. That is why `request++` sits in the undebounced watcher and
  the debounced body only *reads* it.
- **A field that lies while it waits.** Between crossing the gate and the request starting,
  `items` is empty and nothing is loading, so `emptyText` reads "No results" before anything has
  been asked for. The undebounced watcher sets `loading` to cover it.

Worth recording, because it cost three rounds to see: a derived value replaced by consumer code
stops being derived, and every write site then has to re-derive it at the moment it writes. The
failures were not in the condition, which was right from the start, but in *when* it was read.

**`emptyText` has to move too.** Below the gate the component sees an empty list and no loading,
so it says "No results" — which is false, and it is the default. Only the consumer knows the
threshold, so only the consumer can word it:

```html
:empty-text="canSearch ? 'No results' : 'Type at least 2 characters'"
```

Those pieces are the whole cost of the removal, and the README's Async section states each of
them as a requirement rather than an option.

## Out of scope

- **Multiple selection** — one Option or none. Tags are a display treatment for a different
  component, not this one.
- **Create-new-option entry** — `freeform` already makes the typed text the value, so a
  "Create «foo»" row would be a second way to do what typing did.
- **Inline completion** (`aria-autocomplete="both"`) — it fights (A) on every keystroke, it is
  hostile in `freeform`, and it makes `Backspace` behave differently from every other field.
- **Virtualization** — no list here approaches a size that needs it; ADR-0001 keeps it possible.
- **A minimum Query length** — the consumer who debounces already decides which Queries earn a
  request, so the component would hold a second copy of that number. See "Debouncing and the
  minimum Query belong to the consumer" for the rule it cost and the two bindings that replace
  it.
