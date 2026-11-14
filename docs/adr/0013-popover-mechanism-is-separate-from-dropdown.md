---
status: accepted
---

# The Popover mechanism is separate from Dropdown

Four layers, each with one job:

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

[ADR-0012](0012-autocomplete-is-separate-from-select.md) states the rule that a single
`Dropdown` broke:

> Turning each off would mean four props whose only job is to disable a decision Select's own
> `DESIGN.md` argues for. That is how a deep module becomes a settings bag.

A `Dropdown` that also owns the mechanism needs five opt-outs — `manageKeyboard`,
`focusOnOpen`, `dismissOnClickOutside`, `restoreFocus`, and `triggers: []` — and `Autocomplete`
would set all five.

The count is the symptom. The cause is that such a `Dropdown` bundles two things that only
some hosts want together:

| Host | Wants the Trigger pattern | Wants the Popover mechanism |
| --- | --- | --- |
| `ThemePicker`, `TemplateHeader`, the toolbars | yes | yes |
| `Select`, `DatePicker` | no | yes |
| `Autocomplete`, `TimePicker` | no | yes |
| `ContextMenu` | no — it has a cursor point, not an element | yes |

Three further costs of the bundling are concrete rather than theoretical:

- **`ContextMenu` cannot use such a `Dropdown` at all**, and would have to reimplement the mechanism.
  A copy diverges: it misses the `setTimeout(0)` and the reopen guard that focus restore
  needs, so re-opening during a leave transition races.
- **`Select` and `Autocomplete` would have to neutralise the Trigger merge attribute by attribute.**
  Both would override `aria-haspopup`, `aria-expanded` and `data-slot`. They would pay for a layer and
  then undo it.
- **Both would need a `dropdownProps` pass-through.** It leaks the pattern's whole prop surface into
  the public API of two components that do not use the pattern.

## The seam

`usePopover` never knows a Trigger exists. It takes a *reference* — an element or a
`VirtualElement` — which is what lets `ContextMenu` pass a cursor point and `Dropdown` pass an
element, with no mode flag between them.

| In `usePopover` | In `Dropdown` |
| --- | --- |
| Floating placement, `autoUpdate`, the teleport | The click handler and the trigger's ARIA |
| The `isMounted` / `afterLeave` lifecycle | The `Slot` merge onto the consumer's element |
| `Escape`, click-outside, focus capture and restore | `ArrowDown` roving focus |
| `--trigger-origin`, from the resolved placement | `--trigger-width`, which needs a measured Trigger |

Click-outside is in the mechanism as a resolved boolean that defaults to `true`. The mechanism
does not derive it from how the Popover opens
([ADR-0017](0017-dropdown-opens-on-click-only.md)).

## Why `Popover` sits between them

A split into two levels leaves each Host to assemble five pieces by hand: the reference ref,
`usePopover`, `useElementSize` for `--trigger-width`, `PopoverSurface`, and a wrapper carrying
`@keydown="popover.handleEscape"`. That is about thirteen lines in each of five Hosts.

Four of those lines are inert and one is a correctness trap: a Host that forgets the keydown
loses `Escape` from the Trigger, silently. `Dropdown` needs the same assembly, so without
`Popover` the duplication this ADR removes only moves up a layer.

`Popover` merges nothing onto its reference, and that is what stops it becoming a bundled
`Dropdown` again. It has no behaviour to switch off, so it cannot grow opt-out props; every
prop it takes is a straight forward to `usePopover`. `Dropdown` is built on it rather than
beside it, for the same reason — otherwise the five pieces exist twice.

A thinner wrapper that owned only the markup was considered and rejected: it saved three lines,
could not own `usePopover` (every Host needs the open state in script), and left the trap in
place.

**The reference is read from the DOM**, as `rootRef.firstElementChild`, rather than from a
`ref` on `Slot`. A `ref` there resolves to three different things — the element for plain
markup, a component instance for a component, and a text anchor when `Slot` returns a fragment,
which it does as soon as the slot also holds a comment. Floating UI then throws
*asynchronously*, so only the positioning breaks and nothing fails loudly. One explanatory
comment above `DatePicker`'s `MaskedInput` is enough to trigger it.

## Considered options

- **Keep one component and accept the opt-outs.** Fewer concepts, and the props are at least
  documented. Rejected: the opt-outs grow with each new host, and a host that cannot be
  configured writes its own copy.
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
is the bundled `Dropdown` again, one layer down.

The remaining duplication is about fifteen lines. A thinner `useFloatingLayer` could hold it,
and is deliberately not built: two callers with one behaviour in common is below the threshold
where extracting pays, and it can be extracted later from working code.

## Consequences

- **The context is `HostContext`, and its sentinel is `NO_HOST`.** The context describes a
  capability a Host offers, not a popover. `Menu`'s `hasHost` reads as what it asks.
- **`CONTEXT.md` defines Popover, Host and Field Popover**, and `Menu Host` is a
  specialisation of `Host`.
- **`Dropdown` has no `manageKeyboard`, `focusOnOpen` or `triggers`.** None of its props
  exists to switch `Dropdown` off.
- **`Select` and `Autocomplete` have no `dropdownProps`.**
- **Field Popover is still a name, not a component.** `Autocomplete`, `DatePicker` and
  `TimePicker` agree that the field keeps the keyboard and disagree about every key. `Popover`
  is not that component: it is the scaffolding every Host with a reference element shares,
  `Select` included, and it encodes the agreement only by merging nothing.
- **`ContextMenu` has the focus-restore guard**, because the guard is in `usePopover`.
- **The blast radius is large.** A change in `usePopover` lands in every `Dropdown` call site
  and in five more Hosts. The specs of the affected components are what makes that acceptable.

## The lesson worth keeping

Count the props whose only job is to turn the component off. Five of them on one host is a
signal. A host that writes its own copy rather than set a sixth is the same signal, and
louder: when a would-be consumer reimplements you instead of configuring you, the thing it
skipped is the seam.
