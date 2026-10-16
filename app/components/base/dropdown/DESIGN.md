# Dropdown — design

Why this component is built the way it is. For how to *use* it — props, slots, keyboard — see
[README.md](./README.md).

Dropdown is the trigger merge and nothing else. It renders a [`Popover`](../popover/README.md)
and adds what a trigger needs: a click handler, `aria-haspopup` / `aria-expanded`, and
`ArrowDown`. Everything underneath — the reference element, `--trigger-width`, the surface,
`Escape`, placement, focus restore — belongs to `Popover` and `usePopover`.

That split is [ADR-0013](../../../../docs/adr/0013-popover-mechanism-is-separate-from-dropdown.md),
and the short version is: a host that fights the trigger behaviour does not configure Dropdown,
it renders a bare `Popover` instead. Every prop here now serves a host that actually wants a
trigger, and most of them are forwarded straight through.

## The trigger is the consumer's element, not a wrapper

`Slot` (`base/primitive/Slot.ts`) renders the default slot's single root child and merges
Dropdown's attributes onto it, the way reka-ui's `asChild` does. There is no wrapper `<div>`.

The wrapper had to go because it owned two things it had no business owning. It carried the
click handler, so a consumer that sized its own control left an invisible clickable strip
wherever the two disagreed. And it carried `inline-flex` plus a `triggerClass` prop, which meant
Dropdown was deciding the display and width of markup it did not own. Both problems disappear
when the consumer's element *is* the trigger, which is why `triggerClass` was removed rather
than kept as an escape hatch.

Consequences worth knowing:

- **The consumer's own props win.** `Slot` does `mergeProps(attrs, child.props)`, deliberately
  in that order, so a `data-slot`, `class` or `aria-*` the consumer sets overrides Dropdown's.
- **Handlers chain rather than replace.** `mergeProps` composes `onClick`, so the consumer's
  handler and Dropdown's toggle both run.
- **One root element only.** Extra roots render but receive nothing, so only the first can open
  the Popover. Comment nodes are skipped, so a `v-if` that is currently false is safe.

The outer `<div class="contents">` remains, because it is what carries `handleKeydown` and keeps
the trigger and the teleport under one root. It is `display: contents`, so it has no box and no
effect on layout — but `inheritAttrs` is left at its default, so attributes written on
`<Dropdown>` land on that wrapper rather than on the trigger. Applied, but rarely useful:
styling a boxless element does nothing, and a `display` utility overrides `contents` and gives
it a box.

## `handleKeydown` needs no "is focus inside?" guard

It runs on `Popover`'s root, whose only child that stays in the document is the trigger — the
surface is teleported away, leaving comment anchors. So a keystroke arriving there came from
the trigger, and the `contains(document.activeElement)` check this handler used to carry was
always true.

`Escape` is not handled here at all. `Popover` wires it on both sides, because a keystroke
inside the teleported surface never reaches the trigger's wrapper.

## The keyboard contract

Dropdown's model is roving focus: `ArrowDown` moves DOM focus into the Popover. That is the only
keyboard route in, because `Tab` from the trigger skips the teleported content entirely.

It is also the reason `Select` and the three Field Popovers render a bare `Popover` instead. Select's
model is `aria-activedescendant` — DOM focus stays on the trigger for the whole interaction and
only a highlight moves ([ADR-0001](../../../../docs/adr/0001-select-uses-aria-activedescendant.md)).
If both ran, `ArrowDown` would move the highlight *and* throw focus into the list. A text input
has the same problem for a different reason: `ArrowDown` means something else in a field.

These used to be `manageKeyboard` and `focusOnOpen`, two props whose only job was to switch this
component off. They are gone. The hosts that set them now render a bare `Popover`, which merges
nothing and therefore has no keyboard to disable.

`Menu` leaves the default alone, but it does not rely on it: it moves focus onto its own tab
stop when it mounts. It has to. A Popover opened by *clicking* leaves focus on the trigger, and
keystrokes there never reach the teleported content. A Menu opened by mouse silently ignored
Typeahead until the user pressed an arrow.

That is worth knowing for any Popover content with its own keyboard handling: **Dropdown does
not move focus into the Popover when it opens**, only on `ArrowDown`. Content that needs focus
takes it itself, the way `Menu` and `ContextMenu` do.

## Click-outside is derived here, resolved below

`usePopover` takes `dismissOnClickOutside` as a plain boolean. The derivation —
`?? triggers.includes('click')` — stays in this component, because it is a statement about
triggers, and a host with no trigger has none to derive from.

The `default: undefined` on the prop is load-bearing and stays load-bearing. A `boolean` prop
compiles to `type: Boolean`, and Vue casts an *absent* one to `false` unless the props object
carries a `default` key — which would make the `??` unreachable and silently switch
click-outside off for every consumer. `Dropdown.spec.ts` guards exactly this.

## Dismissal from inside the Popover

Dropdown provides a `HostContext` carrying `dismiss()`. It exists because a `Menu` owns no
placement and cannot name its host, yet activating a Menu Item has to close whatever that host
is — `Dropdown` here, `ContextMenu` elsewhere. The `toggleShow` slot prop cannot serve:
`ContextMenu` has no `#popover` slot to hand it through.

The alternative was leaving every call site to write `toggleShow(false)` next to its own
handler, which is what the PrimeVue-era code did at all eight toolbar popovers. One site
forgetting leaves a menu open over the thing it just changed.

## The double-toggle hazard

Dropdown's toggle is merged onto the consumer's element and chained with any `@click` already
there. A host that *also* toggles closes the Popover the instant it opens — the two handlers run
in sequence on one element.

What makes this worth a section: **it does not reproduce under test.** A scripted `click()`
dispatches both listeners within one synchronous task, so Vue has not flushed and the second
handler reads stale state. A real mouse gesture runs a microtask checkpoint between the two
listeners, Vue flushes, and the second handler reads the already-open state and flips it back.
The bug is only visible to a human with a mouse.

The hazard is specific to the merge, so it does not arise for a bare `Popover` host, which
writes its one `@click` explicitly, taking `toggleShow` from the default slot. `Select` used to carry a comment about this and no `toggle` emit;
since it left this component it simply owns the single handler.

## CSS variables over props

`--trigger-width` is published on the Popover element rather than exposed as a prop or slot
prop, so a consumer sizes its popup in CSS:

```css
min-width: max(var(--trigger-width, 0px), 200px);
```

`Popover` measures the reference and publishes it, because it is the one custom property that
needs a measured element — `usePopover` publishes `--trigger-origin` itself but cannot publish
a width for a reference that may be a point.

It measures the consumer's own element rather than a wrapper that merely contained it.

## Known limitations

- **`triggers` is read once at setup.** `hasClickOutside` and the `triggerEvents` object are
  plain values computed during setup, so changing `triggers` reactively does nothing. No
  consumer varies it today. Making it reactive means a `computed` for the handler map and moving
  the click-outside binding behind it.

## Out of scope

- **Focus trapping.** The Popover is not a modal; `Tab` leaves it, which is correct for a menu.
  A host that needs a trap applies one to its own content, as `DatePicker` does.
- **Submenus.** No nested Popover support; no consumer has needed one.
- **Arrow / caret pointing at the trigger.** Floating UI supports it; nothing has asked.
- **Virtualized Popover content.** `.popover-list` caps height and scrolls, which is enough at
  current list sizes.
