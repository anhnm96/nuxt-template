# Dropdown — design

Why this component is built the way it is. For how to *use* it — props, slots, keyboard — see
[README.md](./README.md).

Dropdown is the shared popover primitive: Select, ColorPicker, ColorPickerField, TimePicker,
QuarterPicker, ThemePicker, TemplateHeader, EditImage and four tiptap toolbars all sit on it.
That reach is the main design constraint — a change here lands in nine places at once, so the
component prefers mechanisms hosts can opt out of over behaviour it imposes.

## Why the popover is teleported

A popover rendered in place is clipped by any ancestor with `overflow: hidden` and stacked by
any ancestor with a `z-index`. Both are common in this app — inside tables, toolbars and
dialogs. So the popover teleports to `<div class="popovers" />` in `app.vue`, where it has the
whole viewport and one predictable stacking context.

The cost is paid in three places, and each is worth knowing before changing anything:

- **Events don't bubble to the trigger's ancestors.** The component therefore has *two*
  keydown handlers — `handleKeydown` on the wrapper and `handleKeydownPopover` on the
  teleported element. They are not redundant: a keystroke inside the popover never reaches the
  wrapper, because the DOM tree is what bubbling follows, not the component tree.
- **There is no keyboard route in.** Tab from the trigger goes to whatever follows it in the
  document, not into the popover. `manageKeyboard`'s `ArrowDown` is the only way in.
- **Tests need the host.** A unit mount with no `.popovers` element renders no popover at all,
  and assertions that query for options quietly find zero. Every select spec creates the host
  explicitly for this reason.

## Keeping the teleport alive through the leave transition

`isMounted` is a separate flag from `isOpen`. The `Teleport` is gated on `isMounted`, the
popover's `v-if` on `isOpen`.

Without the split, closing unmounts the teleport immediately and the leave transition never
plays. So `isMounted` goes true with `isOpen` and only returns to false in `onPopoverAfterLeave`,
once the transition has actually finished — and only if the popover has not been reopened
meanwhile.

## `disabled` gates opening, never dismissal

```ts
function toggleShow(value?: boolean) {
  const next = value ?? !isOpen.value
  if (props.disabled && next) return
  isOpen.value = next
}
```

Gating both directions would strand an already-open popover whenever a host disables
mid-interaction. Select does exactly that: it passes `disabled || isBlocked`, and becomes
blocked when a refetch empties its items while the popup is open. With symmetric gating,
click-outside would silently stop working and the user would be left with a popover they
cannot close.

Escape bypasses `toggleShow` entirely and writes `isOpen` directly, for the same reason: an
escape hatch that can itself be disabled is not an escape hatch.

## Focus restore, and the reopen race

On close, focus returns to whatever held it when the popover opened — but only after a
`setTimeout(0)`, and only if focus is currently nowhere useful (`body`, or inside the
dropdown that is disappearing).

The deferral exists because focus lands somewhere undefined during unmount. The guard exists
because of a race: reopening before the timer fires would otherwise steal focus back from the
new popover, which has deliberately placed it. Select focuses its search field on open, so
this is reachable by double-clicking the trigger.

```ts
setTimeout(() => {
  // reopened before the timer fired — the new popover owns focus now
  if (isOpen.value) return
  restoreLastFocused()
}, 0)
```

## The keyboard contract with hosts

`manageKeyboard` exists because two models cannot share one element.

Dropdown's default is roving focus: `ArrowDown` moves DOM focus into the popover. Select's
model is `aria-activedescendant` — DOM focus stays on the trigger (or the search input) for
the whole interaction and only a highlight moves ([ADR-0001](../../../../docs/adr/0001-select-uses-aria-activedescendant.md)).
If both ran, `ArrowDown` would move the highlight *and* throw focus into the list.

`focusOnOpen` is the softer version of the same opt-out, for hosts whose trigger keeps using
the keyboard: TimePicker's trigger is a text input, where `ArrowDown` should open the popover
without leaving the field.

Escape stays with Dropdown in every configuration. Dismissal is the popover's own concern, and
every consumer wants identical behaviour.

## The double-toggle hazard

The trigger wrapper toggles on click. A host that *also* emits a toggle from inside the trigger
slot closes the popover the instant it opens, because its click bubbles into the wrapper.

What makes this worth a section: **it does not reproduce under test.** A scripted `click()`
dispatches both listeners within one synchronous task, so Vue has not flushed and the second
handler reads stale state. A real mouse gesture runs a microtask checkpoint between the two
listeners, Vue flushes, and the second handler reads the already-open state and flips it back.
The bug is only visible to a human with a mouse.

`SelectControl.vue` carries a comment recording this; it deliberately has no `toggle` emit.

## CSS variables over props

`--trigger-width` and `--trigger-origin` are published on the popover element rather than
exposed as props or slot props, so a consumer sizes its popup in CSS:

```css
min-width: max(var(--trigger-width, 0px), 200px);
```

`--trigger-origin` derives from the **resolved** placement, after `flip()` has had its say, so
a popover pushed above its trigger animates from the correct edge. Both live on the teleported
element because that is the only node both the floating styles and the consumer's CSS can see.

## Known limitations

- **`triggers` is read once at setup.** `hasClickOutside` and the `triggerEvents` object are
  plain values computed during setup, so changing `triggers` reactively does nothing. No
  consumer varies it today. Making it reactive means a `computed` for the handler map and
  moving the click-outside binding behind it.
- **`triggerClass ?? 'w-fit'`** falls back only on `undefined`, so an empty string produces an
  unsized wrapper.
- **`whileElementsMounted: autoUpdate`** attaches scroll and resize listeners for as long as
  the popover is mounted. Fine at current usage; worth revisiting if a page ever shows many
  open popovers at once.

## Out of scope

- **Focus trapping.** The popover is not a modal; Tab leaves it, which is correct for a menu.
  A dialog needs `ConfirmDialog`, not this.
- **Submenus.** No nested popover support; no consumer has needed one.
- **Arrow / caret pointing at the trigger.** Floating UI supports it; nothing has asked.
- **Virtualized popover content.** `.popover-list` caps height and scrolls, which is enough at
  current list sizes.
