# ContextMenu — design

Why this component is built the way it is. For how to *use* it, see
[README.md](./README.md). The Menu it hosts has its own
[DESIGN.md](../menu/DESIGN.md), and the decision behind both is
[ADR-0009](../../../../docs/adr/0009-menus-are-menus-not-listboxes.md).

## Shaped like Tooltip, not like Dropdown

`Dropdown` provides teleport, floating-ui, click-outside and focus restore, so reusing it
was the obvious move. It fails on two structural points:

- **It positions against a trigger element.** A context menu opens at a point.
- **It requires a trigger.** `Dropdown` renders its default slot through `Slot` and binds
  click handlers to it. A context menu has no element to wrap; it is summoned by
  `contextmenu` on an arbitrary Anchor.

`Tooltip.client.vue` already solves exactly this shape: it renders no element of its own,
resolves its Anchor from the element it was written inside, and owns its floating and
teleport. So `ContextMenu` follows Tooltip, and the repo gains no second mode on `Dropdown`.

The alternative — giving `Dropdown` an optional virtual anchor and a trigger-less mode — was
considered. It keeps dismissal and focus restore in one place, at the cost of a second shape
inside a component every popover in the app depends on.

## The Anchor resolver is copied, not shared

`resolveAnchor` is a near-copy of `Tooltip.client.vue`'s. There is a composable that looks
like it does this job, `app/composables/useAnchor.ts`, and it is **not** used here.

Its only consumer is `Tooltip2.vue`, the superseded tooltip. It reads `props.target`
untyped off `getCurrentInstance()`, and resolves `$el.parentNode`, which is a `Node` and not
always an element. The newer `Tooltip.client.vue` deliberately rolls its own with
`parentElement`. Following the newer one is the right call; unifying the two is a separate
piece of work on `Tooltip2`'s retirement.

## The cursor point is frozen

`useCursorAnchor` exists for Tooltip's `followCursor`, and it subscribes to `mousemove` to
*track* the pointer. A context menu must do the opposite: it freezes where the right-click
happened and stays there.

`getCursorRect` is exported separately from that composable, and with `follow: true` it
collapses to a zero-size rect at a point — exactly what floating-ui wants as a virtual
reference. So this component uses the function and not the composable around it, and no
`mousemove` listener is attached.

The virtual element's identity is stable, so `autoUpdate` keeps one subscription. Its
`contextElement` getter still points at the Anchor, which is what lets `autoUpdate` observe
scroll ancestors and resizes.

That stable identity has a catch worth knowing. `useFloating` watches
`[middleware, placement, strategy, open]` and `[reference, floating]` — never the point
itself, which is read only inside `getBoundingClientRect`. So a second right-click on an
Anchor whose Menu is already open changes nothing it is watching, and the Menu would stay
where it was. `open()` calls `update()` by hand for exactly that case.

## It focuses itself on open

ADR-0005 states the opposite rule for `Calendar`: "opening a popover over a control is not a
request for focus." `DatePicker` opens with focus still in its text field, because someone
who clicked a field to type a date is still typing.

A context menu has no competing input to protect, and a right-click *is* the request. A
keyboard user who pressed the context-menu key has nowhere else to go. So the Menu is
focused on open, through the `focus()` it exposes.

Focus restore on close mirrors `Dropdown`'s: the element focused at open time is remembered,
and restored only when focus is still inside the popover, on `<body>`, or gone. Restoring
unconditionally would steal focus the user had deliberately moved.

## The keyboard gesture needs cancelling twice

`Shift`+`F10` and the context-menu key are handled on the Anchor's keydown, which cancels
the gesture and opens the Menu against the Anchor's box. That is the whole story in Chrome,
which sends no `contextmenu` event once the keydown is cancelled.

Firefox sends one anyway, and shows its own menu — so the user sees both. The
`contextmenu` handler therefore has to cancel it as well, and it has to know not to treat
it as a right-click: re-opening at that event's coordinates would yank the Menu to the
corner, because a keyboard summon reports none worth having.

A flag set by the keydown marks it. The flag is cleared by a pointer press on the Anchor
rather than by a timer, because a timer would be a race against however long a browser
takes to turn the keydown into a `contextmenu` — and Chrome, which never sends one, would
leave it set until something else cleared it.

An already-open Menu is a separate hole with the same symptom, and `Menu` closes it: focus
is then on a row inside the teleported popover, which no Anchor handler can see. See
`base/menu/DESIGN.md`.

## Closing on an outside right-click

`v-click-outside` listens on `click`, and a secondary mouse button never fires one. Without
more, right-clicking a second row would open its menu while the first stayed open.

So there is also a `contextmenu` listener on `document`, which closes this Menu unless the
event landed inside its own Anchor or its own popover. The other row's Anchor handler then
opens its own Menu from the same event. Right-clicking the *same* Anchor again is excluded
by that check, so the existing Menu simply re-points at the new cursor position.

## One instance per Anchor

The PrimeVue version was a single `<ContextMenu ref="menu">` outside the tree, shown
imperatively with `menu.value?.show(event)` while a `contextItem` ref recorded which row was
meant.

Anchoring to the parent makes that indirection unnecessary: the menu is written inside the
row, so it already knows its row. The cost is one component instance per row. It is small —
the floating element only mounts while open — and `Tooltip` already pays it everywhere in
this app.

`pages/group.vue` kept a `contextItem` ref for a while, set from the row's `@contextmenu`
and read by `addItem` and `deleteItem`. That was a bug, and it is worth recording rather
than just removing.

The keyboard summon opens the Menu from a `keydown`, and Chrome sends no `contextmenu`
after it — the `keyboardSummon` flag above exists precisely because any event that does
follow must *not* be read as the gesture. So the ref never updated on that path: `Shift`
+`F10` on a row and then "Add" added at the root, and "Delete" deleted the row that was
last right-clicked, skipping the `hasLiveDescendant` guard, which is computed on the
menu's own row.

The row is now passed straight to the handler, from the slot scope that already has it.
Anchoring to the parent is what makes that possible, and it removes the shared state the
PrimeVue shape needed rather than re-syncing it.

## Known limitations

- **No `aria-haspopup` on the Anchor.** The Anchor is an element this component does not
  render, so setting attributes on it would be a side effect on foreign markup. A `Dropdown`
  trigger gets `aria-haspopup` for free through `Slot`, and a `Tooltip` has to do the same
  kind of mutation for `aria-describedby`. Worth revisiting together.
- **Keyboard summoning needs a focusable Anchor.** `Shift`+`F10` and the context-menu key
  are bound on the Anchor, so they only fire when it or a descendant holds focus. The tree
  rows in `pages/group.vue` carry a `tabindex` for exactly that reason. A row list long
  enough for one tab stop each to be tiresome wants a roving tabindex and `role="tree"`
  instead, which is the tree's job rather than this component's.
