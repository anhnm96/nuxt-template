---
status: accepted
refines: ADR-0005
---

# A popover over a control does not take focus when it opens

`DatePicker` opens its Calendar with DOM focus still in the text field. Focus enters the grid
only when the user presses `ArrowDown` or `ArrowUp`. This refines one consequence of
[ADR-0005](0005-calendar-uses-roving-tabindex.md), which said a popover wrapper calls
`Calendar.focus()` "when it opens". The hand-off mechanism that ADR describes is unchanged:
`Calendar` still exposes `focus()`, and it still moves focus to the roving cell.

## What changed

ADR-0005 was written against a `DatePicker` whose only way in was `ArrowDown` on the trigger,
where "when the popover opens" and "when the user asked to enter the grid" were the same
moment. They are not the same moment once the trigger is a text field you can click into and
type in.

The field is the primary control. Someone who clicks it to type a date is still typing; moving
focus to the grid sends their keystrokes somewhere they did not aim them, and the mask stops
receiving input mid-value. A screen-reader user is moved off the input they just reached with
no gesture of their own. So opening is not by itself a request for focus.

This is the combobox contract: the popup is visible, DOM focus stays on the input, and an
explicit arrow key moves focus into the popup.

## Consequences

- **The wrapper owns the arrow keys.** `manageKeyboard: false` switches off `Dropdown`'s own
  `ArrowDown` handler and nothing else, so `Escape`-to-dismiss keeps working. This is the
  seam [ADR-0001](0001-select-uses-aria-activedescendant.md) opened for `Select`. `DatePicker`
  is the second host to need it, which suggests the default suits a menu rather than any
  popover over a control.

- **One keypress both opens and enters.** `ArrowDown` on a shut field opens the popover and
  lands on the selected day in the same press, so nothing is lost against the old behaviour.

- **`aria-expanded` is not enough on its own.** A field that owns a popup has to say so:
  `role="combobox"`, `aria-haspopup="grid"` for a Calendar rather than `Dropdown`'s blanket
  `aria-haspopup="true"`, and `aria-controls` while the popup exists. Without the combobox
  role the attribute is unsupported on the implicit `textbox` role and screen readers drop
  it, which is what shipped first and is covered by a test now.

- **`v-trap-focus` needs a `.manual` modifier.** The directive focuses its element on mount,
  which is right for a modal dialog and wrong here. `.manual` keeps the tab ring and leaves
  the entry gesture to the host.

- **A popover that is not over a control keeps the old behaviour.** A menu, or any popover
  whose trigger is a button, has no competing input to protect, so `Dropdown`'s default
  stands. This ADR is about popovers over controls, not about every popover.
