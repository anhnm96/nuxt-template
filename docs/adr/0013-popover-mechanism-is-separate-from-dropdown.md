---
status: accepted
---

# The Popover mechanism is separate from Dropdown

Three levels, each with one job:

| | Owns |
| --- | --- |
| `usePopover` | floating placement, the teleport, the leave-transition lifecycle, `Escape`, click-outside, focus restore |
| `PopoverSurface` | the teleport markup, the transition, the surface element |
| `Popover` | the reference element, `--trigger-width`, the surface, the `Escape` wiring |
| `Dropdown` | the Trigger merge: click, `aria-haspopup` / `aria-expanded`, `ArrowDown` |

`Select`, `Autocomplete`, `DatePicker`, `TimePicker` and `Dropdown` render a `Popover`.
`ContextMenu` sits on `usePopover` and `PopoverSurface` directly, because it anchors to a
cursor point and has no reference element. `Tooltip` stays on its own implementation.

## Why the split

[ADR-0012](0012-autocomplete-is-separate-from-select.md) states the rule this reverses the
violation of:

> Turning each off would mean four props whose only job is to disable a decision Select's own
> `DESIGN.md` argues for. That is how a deep module becomes a settings bag.

`Dropdown` was already there when that was written. It carried five opt-outs —
`manageKeyboard`, `focusOnOpen`, `dismissOnClickOutside`, `restoreFocus`, and `triggers: []` —
and `Autocomplete` set all five.

The count is the symptom. The cause is that `Dropdown` bundled two things that only some hosts
want together:

| Host | Wants the Trigger pattern | Wants the Popover mechanism |
| --- | --- | --- |
| `ThemePicker`, `TemplateHeader`, the toolbars (11 in all) | yes | yes |
| `Select`, `DatePicker` | no | yes |
| `Autocomplete`, `TimePicker` | no | yes |
| `ContextMenu` | no — it has a cursor point, not an element | yes |

Three further facts made the bundling concrete rather than theoretical:

- **`ContextMenu` could not use `Dropdown` at all**, and reimplemented the mechanism. The copy
  diverged: it has neither the `setTimeout(0)` nor the reopen guard that `Dropdown`'s focus
  restore needs, so re-opening during a leave transition races.
- **`Select` and `Autocomplete` neutralise the Trigger merge attribute by attribute.** Both
  override `aria-haspopup`, `aria-expanded` and `data-slot`; `AutocompleteControl` carries a
  comment explaining how it defeats the merge. They paid for a layer and then undid it.
- **`dropdownProps` was documented on both and used by zero consumers.** It leaked the pattern's
  whole prop surface into the public API of two components that do not use the pattern.

## The seam

`usePopover` never knows a Trigger exists. It takes a *reference* — an element or a
`VirtualElement` — which is what lets `ContextMenu` pass a cursor point and `Dropdown` pass an
element, with no mode flag between them.

| In `usePopover` | In `Dropdown` |
| --- | --- |
| Floating placement, `autoUpdate`, the teleport | `triggers` and the trigger event map |
| The `isMounted` / `afterLeave` lifecycle | The `Slot` merge onto the consumer's element |
| `Escape`, click-outside, focus capture and restore | `ArrowDown` roving focus |
| `--trigger-origin`, from the resolved placement | `--trigger-width`, which needs a measured Trigger |

Click-outside is in the mechanism as a resolved boolean. The *derivation* from `triggers`
stays in `Dropdown`, because it is the pattern's policy. A host with no Trigger has no
`triggers` to derive from.

## Why `Popover` sits between them

The first cut of this split had two levels, and left each Host to assemble five pieces by
hand: the reference ref, `usePopover`, `useElementSize` for `--trigger-width`,
`PopoverSurface`, and a wrapper carrying `@keydown="popover.handleEscape"`. Five Hosts did
that, about thirteen lines each.

Four of those lines are inert and one is a correctness trap: a Host that forgets the keydown
loses `Escape` from the Trigger, silently. The same assembly already existed inside
`Dropdown`, so leaving it there and adding it four more times meant the thing this ADR set out
to delete had simply moved up a layer.

`Popover` merges nothing onto its reference, and that is what stops it becoming `Dropdown`
again. It has no behaviour to switch off, so it cannot grow the opt-out props this ADR
deleted; every prop it takes is a straight forward to `usePopover`. `Dropdown` is built on it
rather than beside it, for the same reason — otherwise the five pieces exist twice.

A thinner wrapper that owned only the markup was considered and rejected: it saved three lines,
could not own `usePopover` (every Host needs the open state in script), and left the trap in
place.

**The reference is read from the DOM**, as `rootRef.firstElementChild`, rather than from a
`ref` on `Slot`. A `ref` there resolves to three different things — the element for plain
markup, a component instance for a component, and a text anchor when `Slot` returns a fragment,
which it does as soon as the slot also holds a comment. Floating UI then throws
*asynchronously*, so only the positioning breaks and nothing fails loudly. One explanatory
comment above `DatePicker`'s `MaskedInput` was enough to trigger it during this work.

## Considered options

- **Keep one component and accept the opt-outs.** Fewer concepts, and the props are at least
  documented. Rejected: the opt-outs grow with each new host, and two hosts had already given
  up and written their own.
- **Full reka-ui decomposition** — `<Popover>` / `<PopoverTrigger>` / `<PopoverContent>` with
  provide/inject. Rejected: it makes `Autocomplete`'s already-subtle wiring implicit, and
  `PopoverContext` already meant something else here.
- **A composable alone, with each host writing its own teleport markup.** Rejected: it
  single-sources the logic and leaves three copies of the `isMounted` / `afterLeave` pair,
  which is the subtlest part and the one most worth writing once.
- **Pull `Tooltip` in as well.** Rejected; see below.

## Why Tooltip stays out

A Tooltip shares `useFloating` and the leave-transition pair with a Popover, and diverges
everywhere else: it renders in place when `attachTo` is empty, tracks the cursor live, carries
an `arrow` middleware, applies a hover-intent delay, and registers in a global store.

Four options serving one caller would make `usePopover` the union of everything floating. That
is the shape `Dropdown` was in, recreated one layer down.

The remaining duplication is about fifteen lines. A thinner `useFloatingLayer` could hold it,
and is deliberately not built: two callers with one behaviour in common is below the threshold
where extracting pays, and it can be extracted later from working code.

## Consequences

- **`PopoverContext` becomes `HostContext`**, `NO_POPOVER` becomes `NO_HOST`. The context
  describes a capability a Host offers, not a popover. `Menu`'s `hasHost` then reads as what it
  asks rather than as an identity check against a sentinel named for the wrong thing.
- **`CONTEXT.md` gains Popover, Host and Field Popover**, and `Menu Host` becomes a
  specialisation of `Host`. The repo's most-depended-on primitive had no entry; "popover"
  appeared only in two `_Avoid_` lists.
- **`manageKeyboard` and `focusOnOpen` are deleted.** Their only consumers were hosts that have
  left the pattern layer. `Dropdown` goes from twelve props to nine, and none of the nine exists
  to switch `Dropdown` off.
- **`dropdownProps` is deleted from `Select` and `Autocomplete`.** No call site passed it.
- **Field Popover is still a name, not a component.** `Autocomplete`, `DatePicker` and
  `TimePicker` agree that the field keeps the keyboard and disagree about every key. `Popover`
  is not that component: it is the scaffolding every Host with a reference element shares,
  `Select` included, and it encodes the agreement only by merging nothing.
- **`ContextMenu` gains the focus-restore guard** it never had.
- **The blast radius grows.** `Dropdown`'s `DESIGN.md` opened by noting that a change there lands
  in nine places; a change in `usePopover` lands in those nine plus five more. The ~239 tests
  across the affected components are what makes that acceptable, and the migration order was
  chosen around them: `Dropdown` moved onto `usePopover` first, while every host still routed
  through it, so all 239 exercised the new mechanism before any consumer moved.

## The lesson worth keeping

Count the props whose only job is to turn the component off. `Autocomplete` set five of them,
and two other hosts had already written their own copy rather than set a sixth. Both are the
same signal, and the second is louder: when a would-be consumer reimplements you instead of
configuring you, the thing it skipped is the seam.
