---
status: accepted
---

# An Interactive Tooltip is a mode of Tooltip, not a separate component

Schedule events need a preview with Edit / Delete buttons that works with a mouse (hover,
then click a button), on touch (Tap the event, then tap a button) and from the keyboard
(ArrowDown on the event, then Tab to a button). That is not a tooltip in ARIA terms:
`role="tooltip"` is a non-interactive description, and a surface holding buttons is closer
to a hover card or popover. We still ship it as `Tooltip` with an `interactive` prop.

## Why

- **The shared part is most of the component.** Placement, arrow geometry, show/hide
  delays, the hover bridge between Anchor and Surface, Escape and the show/hide lifecycle
  are identical. The modes differ only in ARIA (description vs. preview), in what a touch
  does (peek vs. Tap) and in keyboard entry.
- **The keyboard contract is small and stays inside the Surface.** ArrowDown on a focused
  Anchor shows the tooltip and focuses the Surface. Tab moves through the content in DOM
  order. Forward Tab at the last action resumes the page tab order after the Anchor.
  Shift+Tab at the first action and Escape return focus to the Anchor. The tooltip hides
  when focus leaves. Enter and Space still activate the Anchor, and consumers explain the
  shortcut on the Anchor. This is the contract of a non-modal widget, so the Surface uses no
  tooltip role and the Anchor gets no automatic description.
- **Hover is unchanged for the mouse.** A mouse click can focus the Surface, because it has
  `tabindex="-1"`. Only focus that keyboard entry moved into the Surface keeps the tooltip
  shown when the pointer leaves.

## Alternatives rejected

- **A separate `HoverCard` sharing a composable** would make `followCursor` on an
  interactive Surface impossible to express, and would keep ARIA policy per component. We
  rejected it as more files and a second name for what users experience as the same thing.
  "Hover card" is now an _Avoid_ term in `CONTEXT.md`.
- **Using `Dropdown` with a hover trigger** brings focus management and `aria-expanded` we
  don't want on an event block. It also has no Tap-vs-drag handling, and the blocks are drag
  handles. `Dropdown` had a `triggers` prop for this when the decision was made;
  [ADR-0017](0017-dropdown-opens-on-click-only.md) removed it.
- **Mouse and touch only, with every action reachable through the Anchor.** We chose this
  first, because an event's Anchor is a focusable `<button>` whose own activation opens the
  edit dialog. We reversed it before release. It made every host duplicate each action
  (for example Delete) behind the Anchor, and it hid the preview from keyboard users.
- **A proper popover contract for keyboard access.** This would move the keyboard case out of
  `Tooltip`. We kept it in `Tooltip`, because the focus logic is small and the placement,
  hover and touch handling stay shared.

## Consequences

- `followCursor` and `interactive` are allowed together at the type level. The component
  ignores `followCursor` and warns in dev.
- One component carries two a11y contracts, selected by a prop. A reviewer must check which
  mode a usage is in before judging its ARIA.
- Forward Tab out of the tooltip needs a focusable Anchor. An Anchor that cannot take focus
  loses its place in the page tab order.
