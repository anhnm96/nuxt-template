---
status: accepted
---

# An Interactive Tooltip is a mode of Tooltip, not a separate component

Schedule events need a preview with Edit / Delete buttons that works with a mouse (hover,
then click a button) and on touch (Tap the event, then tap a button). That is not a tooltip
in ARIA terms: `role="tooltip"` is a non-interactive description, and a surface holding
buttons is closer to a hover card or popover. We still ship it as `Tooltip` with an
`interactive` prop.

## Why

- **The shared part is most of the component.** Placement, arrow geometry, show/hide
  delays, the hover bridge between Anchor and surface, Escape and the open/close lifecycle
  are identical. The modes differ only in ARIA (description vs. preview) and in what a touch
  does (peek vs. Tap).
- **Keyboard and screen-reader users are served by the Anchor.** Every event's Anchor is a
  focusable `<button>` whose own activation opens the edit dialog. The preview adds no
  action they can't already reach, so we don't need a separate, fully accessible
  popover contract. We accepted that the Interactive Tooltip is mouse and touch only.

## Alternatives rejected

- **A separate `HoverCard` sharing a composable** would make `followCursor` on an
  interactive surface impossible to express, and would keep ARIA policy per component. We
  rejected it as more files and a second name for what users experience as the same thing.
  "Hover card" is now an _Avoid_ term in `CONTEXT.md`.
- **Using `Dropdown` with `triggers: ['hover', 'click']`** brings focus management and
  `aria-expanded` we don't want on an event block. It also has no Tap-vs-drag handling, and
  the blocks are drag handles.

## Consequences

- `followCursor` and `interactive` are allowed together at the type level. The component
  ignores `followCursor` and warns in dev.
- One component carries two a11y contracts, selected by a prop. A reviewer must check which
  mode a usage is in before judging its ARIA.
- If an Interactive Tooltip ever needs keyboard access, the right move is a new ADR moving
  it to a proper popover contract, not bolting focus management onto `Tooltip`.
