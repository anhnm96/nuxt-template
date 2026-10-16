# Popover — design

Why the machinery is split this way. For how to *use* it, see [README.md](./README.md). For the
decision itself and the alternatives rejected, see
[ADR-0013](../../../../docs/adr/0013-popover-mechanism-is-separate-from-dropdown.md).

Three levels, each with one job:

| | Owns |
| --- | --- |
| `usePopover` | placement, the mount lifecycle, `Escape`, click-outside, focus restore |
| `<Popover>` | the reference element, `--trigger-width`, the surface, the `Escape` wiring |
| `Dropdown` | the trigger merge: click, `aria-*`, `ArrowDown` |

`<Popover>` is used by `Dropdown`, `Select`, `Autocomplete`, `DatePicker` and `TimePicker`;
`ContextMenu` sits on `usePopover` directly because it anchors to a point and has no reference
element. That reach is the main design constraint, and it is wider than `Dropdown`'s was, so
the rule that governs this file is: **nothing enters `usePopover` that only one host wants.**

## Why `<Popover>` exists

Five Hosts were assembling the same five pieces by hand: the reference ref, `usePopover`,
`useElementSize` for `--trigger-width`, `PopoverSurface`, and a wrapper carrying
`@keydown="popover.handleEscape"`. That is about thirteen lines each, and one of them is a
correctness trap — a Host that forgets the keydown loses `Escape` from the trigger silently.

It merges nothing onto the reference, which is what keeps it from becoming `Dropdown` again.
It has no behaviour to switch off, so it cannot grow the opt-out props ADR-0013 deleted; every
prop it takes is a straight forward to `usePopover`.

`Dropdown` is built on it rather than beside it. Otherwise those five pieces would exist twice
and the duplication would simply have moved one layer up.

## The reference is read from the DOM

`<Popover>` takes `rootRef.firstElementChild`, not a `ref` on `Slot`.

A `ref` on `Slot` resolves to three different things. With plain markup it is the element;
with a component it is the component instance; and when `Slot` returns a fragment — which it
does as soon as the slot also holds a comment — it is a text anchor. Floating UI then receives
something with no `getBoundingClientRect` and throws *asynchronously*, so nothing fails loudly
and only the positioning is wrong. A single explanatory comment above `DatePicker`'s
`MaskedInput` was enough to trigger it.

The root is `display: contents` and the teleport leaves only comment anchors behind, so its
first element child is always the trigger. `onMounted` plus `onUpdated` keeps it current
through a consumer's `v-if`.

## The seam

`usePopover` never knows a Trigger exists.

It takes a *reference* — an element, a component, or a `VirtualElement` standing for a point.
That is the whole of its knowledge about the thing it belongs to, and it is what lets
`ContextMenu` pass a cursor point and `Dropdown` pass an element with no mode flag between
them.

Everything that needs a Trigger stays in `Dropdown`:

| In `usePopover` | In `Dropdown` |
| --- | --- |
| Floating placement, `autoUpdate`, the teleport | `triggers` and the trigger event map |
| The `isMounted` / `afterLeave` lifecycle | The `Slot` merge onto the consumer's element |
| `Escape`, click-outside, focus capture and restore | `ArrowDown` roving focus |
| `--trigger-origin`, from the resolved placement | `--trigger-width`, which needs a measured Trigger |

Click-outside is in the mechanism, but only as a resolved boolean. Deriving it from how the
Popover opens is the Trigger pattern's policy — `Dropdown` computes
`?? triggers.includes('click')` and passes the answer down. A host with no Trigger has no
`triggers` to derive from, and giving the mechanism a `triggers` option it could not apply would
be the first crack in the rule above.

## Why the markup is a component and not a return value

A composable cannot own a teleport, a `<Transition>` or an element. Those are markup, and the
first draft of this split left them to each host.

That draft was wrong, and the evidence was already in the repository: `ContextMenu` had hand-
copied exactly this markup from `Dropdown`, and its copy had drifted — no `setTimeout(0)` and no
reopen guard on focus restore. The subtlest part of a Popover is the part a composable cannot
hold, so `PopoverSurface` holds it.

## Keeping the teleport alive through the leave transition

`isMounted` is a separate flag from `isOpen`. The `Teleport` is gated on `isMounted`, the
surface's `v-if` on `isOpen`.

Without the split, closing unmounts the teleport immediately and the leave transition never
plays. So `isMounted` goes true with `isOpen` and only returns to false in `onAfterLeave`, once
the transition has actually finished — and only if the Popover has not been reopened meanwhile.

## Why the teleport at all

A Popover rendered in place is clipped by any ancestor with `overflow: hidden` and stacked by
any ancestor with a `z-index`. Both are common in this app — inside tables, toolbars and
dialogs. So it teleports to `<div class="popovers" />` in `app.vue`, where it has the whole
viewport and one predictable stacking context.

The cost is paid in three places:

- **Events don't bubble to the reference's ancestors.** This is why `handleEscape` is exposed
  rather than wired once: `PopoverSurface` calls it for keystrokes inside the Popover, and the
  host must call it for keystrokes on the reference side. A keystroke inside the Popover never
  reaches the host's wrapper, because the DOM tree is what bubbling follows, not the component
  tree.
- **There is no keyboard route in.** `Tab` from the reference goes to whatever follows it in the
  document. `Dropdown`'s `ArrowDown` is one way in; content that takes focus itself, as `Menu`
  does, is the other.
- **Tests need the host.** A unit mount with no `.popovers` element renders nothing, and
  assertions that query for options quietly find zero.

## `disabled` gates opening, never dismissal

```ts
function toggle(value?: boolean) {
  const next = value ?? !isOpen.value
  if (toValue(options.disabled) && next) return
  isOpen.value = next
}
```

Gating both directions would strand an open Popover whenever a host disables mid-interaction.
`Select` does exactly that: it passes `disabled || isBlocked`, and becomes blocked when a refetch
empties its items while the popup is open. With symmetric gating, click-outside would silently
stop working and the user would be left with a Popover they cannot close.

`handleEscape` bypasses `toggle` and writes `isOpen` directly, for the same reason: an escape
hatch that can itself be disabled is not an escape hatch.

## Focus restore, and the reopen race

On close, focus returns to whatever held it when the Popover opened — but only after a
`setTimeout(0)`, and only if focus is currently nowhere useful.

The deferral exists because focus lands somewhere undefined during unmount. The guard exists
because of a race: reopening before the timer fires would otherwise steal focus back from the
new Popover, which has deliberately placed it. `Select` focuses its search field on open, so
this is reachable by double-clicking the trigger.

```ts
setTimeout(() => {
  // reopened before the timer fired — the new Popover owns focus now
  if (isOpen.value) return
  restoreLastFocused()
}, 0)
```

The `anchor` option exists for the containment half of that test. A reference may be a
`VirtualElement`, which has no `contains`, so the element to test against is passed separately
and hosts anchored to a point pass nothing.

## Why `open` is a caller's ref

`usePopover` takes the open state rather than creating it. Every host already models openness
its own way — `Dropdown` has a `defineModel`, `Select` derives a blocked state alongside it,
`ContextMenu` sets it from a gesture and needs to know whether that gesture drove it. Returning
a fresh ref would make each of them mirror it, and a mirrored boolean is a second truth.

## Why Tooltip is not here

`Tooltip.client.vue` keeps its own implementation. It shares `useFloating` and the leave-
transition pair with a Popover, and diverges everywhere else: it renders in place when
`attachTo` is empty, tracks the cursor live, carries an `arrow` middleware, applies a hover-
intent delay, and registers in a global store.

Pulling it in would add four options serving one caller, and `usePopover` would stop being
"what a Popover needs" and become the union of everything floating — which is the shape
`Dropdown` was in before this split. See ADR-0013.

About fifteen lines stay duplicated. A thinner `useFloatingLayer` could hold them, and is
deliberately not built: two callers with one behaviour in common is below the threshold where
extracting pays, and it can be extracted later from working code.

## `--trigger-width` is measured, so it starts at 0

`useElementSize` seeds its width at 0 and reaches the real one only when ResizeObserver first
delivers. So `--trigger-width` is `0px` for the first frame of every Popover, and every popup
floors its own width at 180px precisely so that frame is not visible.

**It stays `0px` forever wherever the rendering pipeline is stalled.** ResizeObserver delivers
on the same pipeline as `requestAnimationFrame`, so an embedded preview pane that never runs a
frame never reports a size — and a trigger narrower than 180px is indistinguishable from a
broken measurement even in a real browser, because the floor covers both.

That combination has already been mistaken for a bug and written up as one. Before concluding
the measurement is broken, check `requestAnimationFrame` actually fires in whatever is being
used to look at it. `tests/playwright/e2e/popover-trigger-width.spec.ts` is the check that
belongs in CI; it uses a Select, whose control is the widest trigger in the library.

## Known limitations

- **`whileElementsMounted: autoUpdate`** attaches scroll and resize listeners for as long as the
  Popover is mounted. Fine at current usage; worth revisiting if a page ever shows many open
  Popovers at once.
- **No focus trap, no submenus, no arrow.** All three are out of scope rather than unfinished.
  A host that needs a trap applies one to its own content, as `DatePicker` does.
