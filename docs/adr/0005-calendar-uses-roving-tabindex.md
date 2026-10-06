---
status: accepted
---

# Calendar uses a roving tabindex, not `aria-activedescendant`

`Calendar`'s day grid moves **real DOM focus** between cells: exactly one cell carries
`tabindex="0"` and arrow keys move it. This is the opposite of the choice
[ADR-0001](0001-select-uses-aria-activedescendant.md) made for `Select`, so it needs a record.

## Why Select's reasoning does not transfer

ADR-0001's argument is specific: when a `Select` is `searchable`, a text input must keep real
DOM focus while the user arrows through options, so options can only ever hold *virtual*
focus. There is exactly one `combobox` at a time, and it owns `aria-activedescendant`.

**Calendar contains no text input.** Text entry lives in the future `DatePicker` wrapper,
outside the grid. The condition that forced virtual focus is simply absent.

## Why roving tabindex is the better fit here

- It is what APG's Date Picker Dialog reference implementation uses, and this component's
  keymap is APG's.
- Grid position announcements — "row 3, column 5" — are derived from real focus and are
  reliable with a roving tabindex. With `aria-activedescendant` they depend on support that is
  measurably patchier in `role="grid"` than in `role="listbox"`.
- Only one cell sits in the tab order either way, so `Tab` leaves the grid rather than walking
  42 cells.
- **It maps the disabled/unavailable split onto platform primitives.** A native `<button>`
  with the `disabled` attribute is unfocusable for free; `aria-disabled` on one that is not
  disabled stays focusable and announced for free. Under virtual focus both behaviours are
  hand-maintained in an index calculation, and both fail silently.
- Focus survives the in-place view swap without bookkeeping: the panels are ordinary buttons
  in the same container.

The precedent for not reaching for the pattern a sibling used is already in
`base/select/DESIGN.md`, which is explicit that `SelectOption` is `role="option"` and
deliberately **not** a `<Button>`. Role follows structure, not habit.

## Consequences

- ~~**Dropdown's `focusOnOpen` has to come back.**~~ **Superseded — it never left, but it
  aims at the wrong element.** `Dropdown` still has the prop, defaulting to `true`, so
  nothing had to be restored, and `ArrowDown` on the trigger does open the popover.

  What it cannot do is land focus in the right place: it focuses the *first focusable
  element* in the popover, which for a Calendar is the header's « button, not the grid. And
  the Calendar must not focus itself on mount, because it is also used inline, where
  stealing the page's focus on render is wrong.

  So the hand-off is explicit: `Calendar` exposes `focus()`, which moves focus to the roving
  cell, and a popover wrapper calls it when it opens. Verified in the browser against
  `DatePicker`: one `ArrowDown` opens the popover *and* focuses the selected day, arrows then
  navigate days, and `Escape` restores focus to the field.

  **When the wrapper calls `focus()` is revised by
  [ADR-0009](0009-a-popover-over-a-control-does-not-take-focus-on-open.md): on the user's
  `ArrowDown`, not on open.** The mechanism described here is unchanged.
- **Arrow keys page across month boundaries**, breaking `Select`'s "clamp, don't wrap" rule.
  A calendar's arrows navigate a continuous timeline drawn a month at a time; clamping at the
  month edge would leave keyboard users unable to reach any date outside it.
- **That makes the disabled-skip scan unbounded in principle**, which `Select`'s equivalent is
  not — a list ends, a timeline does not. Two bounds are therefore load-bearing: movement never
  crosses `minDate`/`maxDate`, and `MAX_SKIP_SCAN_DAYS` caps the scan within them.
  `CalendarKeyboard.spec.ts` mounts a calendar with `isDateDisabled: () => true` purely to
  prove a keypress terminates. That test is not decorative.
- **A panel must not take focus just because it mounted.** `period` makes a panel the
  initial view, so the `{ immediate: true }` focus watcher that was safe for a
  user-initiated drill-down turned into an inline `<Calendar period="quarter">` grabbing the
  page's focus on render. Panels now use the same one-shot claim token as the day cells:
  focus on mount only when a request is outstanding.
- **A panel that consumes `Escape` must also stop it propagating.** `Dropdown` closes on
  `Escape` anywhere in its popover, so a navigational panel stepping back to the terminal
  view would *also* shut the popup — one keypress doing two things. Only found by composing
  the two in `QuarterPicker`; a Calendar-only test cannot see it.
- `role="row"`, `role="columnheader"` and `role="rowheader"` must be **explicit**:
  `role="grid"` on the `<table>` overrides native table semantics and strips the implicit
  roles. This is invisible in the rendered DOM and is covered by a spec.
- Cells are `<td role="gridcell">` wrapping a native `<button>`, so `aria-selected` — invalid
  on `role="button"` — is hoisted to the `td`, and the state is also appended to the button's
  `aria-label` since focus sits on the child.

## Not yet verified

iOS VoiceOver's announcement of native buttons inside `role="grid"` is the likeliest reason
react-aria uses `<div role="button">` instead. If it misbehaves, swapping the element while
keeping the roving tabindex is a two-line change and does not invalidate this decision.
