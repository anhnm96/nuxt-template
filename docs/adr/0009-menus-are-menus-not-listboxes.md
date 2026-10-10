# Menus are menus, not listboxes

Command popovers and one-of-N property popovers are built as `role="menu"` with roving
`tabindex` and real DOM focus. They are not built on `base/select`'s listbox, and the
PrimeVue-shaped `Listbox` component they replace is not reproduced. A `role="listbox"`
component is deferred until a consumer genuinely owns a value.

We examined the eight popover lists in `Tiptap.vue` and `InsertTableToolbar.vue`, plus the
`ContextMenu` in `pages/group.vue`. Three are pure commands. Five report a value the editor
owns — font family, font size, alignment, ordered-list style, unordered-list style — and
apply it on activation; the list never stores it. `role="listbox"` promises that the widget
owns the value, so `aria-selected` on those rows is a false claim to a screen reader. The
correct role is `menuitemradio` with `aria-checked`. No call site owns a value, so no call
site is a listbox.

## Considered options

- **Reuse `SelectPopup`** — the shape PrimeVue ships and the shape the current code imitates.
  Rejected: it conflates two ARIA widgets, and the existing code already admits the mismatch
  by binding `:model-value` one-way and hanging the real behaviour off a `@click` inside the
  `#option` slot.
- **One component with a `role` mode prop** — rejected: the two focus models cannot coexist.
  `aria-activedescendant` parks DOM focus outside the list (ADR-0001); roving `tabindex` puts
  it on the item. A mode prop branches every keyboard handler, which is the smell ADR-0002
  recorded when it split on far less.
- **Build both widgets now** — rejected: `Listbox` would have no consumer to keep it honest.
  `base/select/DESIGN.md` sets the rule that call sites fix the ceiling.

## Consequences

- The repo now has three navigable widgets across two focus models, each with a record.
  [ADR-0001](0001-select-uses-aria-activedescendant.md) governs the listbox;
  [ADR-0005](0005-calendar-uses-roving-tabindex.md) governs the calendar grid; this ADR
  governs the menu. Neither model is the house default, and ADR-0005 already set the test:
  virtual focus exists to protect a competing text input, and a menu has none.
- ADR-0005 anticipated this component in as many words: a menu "has no competing input to
  protect and keeps `Dropdown`'s default". `Menu` therefore leaves `manageKeyboard` and
  `focusOnOpen` alone, where `Select` and `DatePicker` both switch them off. It does not
  depend on them either: `focusOnOpen` fires only from `Dropdown`'s `ArrowDown` branch, so
  a Menu opened by a click would keep focus on the trigger and — the popover being
  teleported — never see a keystroke. A Menu takes focus itself when it mounts inside a
  Host, which is the APG menu-button contract.
- `Dropdown`'s blanket `aria-haspopup="true"` announces a menu. That is wrong for
  `DatePicker`, which overrides it, and correct here for free.
- What `Menu` and `Select` share is the navigation *algorithm*, not a data model: next/prev,
  Home/End, Page, seek-past-disabled, and typeahead. `Menu` reads its items from the DOM;
  `Select` reads them from the `items` array. A shared composable owns the algorithm only.
- Disabled-skipping over a linear list was already written twice when this was decided — as
  `seekEnabled` in `useSelect.ts` and as `moveSelection` in
  `app/components/tab/TabList.vue`. The shared composable exists so a menu does not make it
  three. `calendar/utils.ts`'s `nextEnabledIndex` is **not** a third copy and does not fold
  in: it steps a 2D grid and *refuses* a step that leaves the panel, where this one clamps
  into range and then seeks outwards. Two algorithms, not one written three times.
- `Menu` wraps at the ends and `Select` clamps. Both follow their own APG pattern. Calendar
  broke the same rule first, for its own reason (ADR-0005), so "clamp, don't wrap" is a
  listbox rule rather than a repo rule.
- `Menu` owns no positioning. `Dropdown` hosts it where a trigger exists; a Tooltip-shaped
  `ContextMenu` hosts it where only a point exists.
- Because roving `tabindex` gives real focus, the browser scrolls the Focused Item into view
  and no id scheme is needed. The two problems ADR-0001 accepted for the listbox do not
  arise here.
