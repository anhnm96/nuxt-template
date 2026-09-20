# Select uses aria-activedescendant, not roving tabindex

`base/select` decouples visual focus from DOM focus: while the popup is open, DOM focus
stays on a single element (the trigger, or the search input when `searchable`), each option
carries a derived id, and the focused element points at the Active Option via
`aria-activedescendant`. Highlighting is a CSS class, never `:focus`.

We chose this because Select must support an in-popup search field, and a text input only
receives typed characters while it holds DOM focus — yet arrow keys must still move the
highlight through the list. Roving tabindex cannot satisfy both at once, so it would have
forced a second keyboard model that activates whenever a search field is present, and every
keyboard behaviour would have to be implemented twice.

## Consequences

- Options must be `role="option"` elements, **not** `<Button>`. Nested interactive elements
  inside a listbox option are invalid and will be "fixed" by anyone who doesn't know this
  was deliberate.
- Each option needs a stable unique DOM id, derived as `` `${id}-opt-${key}` `` from the
  Select's `id` (defaulting to `useId()`, which is SSR-safe) and the option's Key.
- Scrolling the Active Option into view is our job. The browser will not do it, because
  nothing is focused.
- `Dropdown`'s own keyboard handling (`focusOnOpen`, its `ArrowDown` branch) is a competing
  roving-tabindex model and must not run when Dropdown is hosting a Select.
- Virtualization stays possible later: the highlight is state, so unmounting a scrolled-away
  option cannot destroy focus.
