# Listbox — design

`Listbox.vue` and `ListboxOption.vue` are the listbox that `Select` and `Autocomplete` show in
their Popover. An application does not compose with them; only a host does. For how a host
uses them — the props, the slots, `provideListbox` — see [README.md](./README.md).

They exist because the two hosts drew the same thing twice: the Group loop, the option row, the
flat index, the empty state and the first-load state.
[ADR-0012](../../../../docs/adr/0012-autocomplete-is-separate-from-select.md) keeps the two
hosts separate in policy. This folder shares the view, which holds no policy.

## What it draws arrives as props, and the live state arrives as context

The two halves are separate on purpose.

- **Props on `Listbox`:** `state`, `groups`, `query`, the ids and the texts. These decide what
  is on screen.
- **`ListboxContext` for `ListboxOption`:** `activeKey`, `isSelected`, `setActiveIndex` and
  `onOptionSelect`. These decide how a row that is already on screen looks and what a click on
  it does.
- **`ListboxContext` for `Listbox`:** `virtual` and `setScrollToIndex`. `virtual` is a mode and
  not content, so no host freezes it, and the context saves a prop through each host's popup.

`AutocompletePopup` is the reason. It freezes what it draws from the moment the popup starts to
close, because Abandon writes both models during the leave transition, and a live list would
change from "No results" to every Option while it fades. A `Listbox` that read `groups` from
the list itself could not be frozen from outside. A `Listbox` that takes `groups` as a prop
draws whatever snapshot its host passes.

The rows keep reading live state. Nothing is navigable while the popup closes, so a live
highlight on a frozen list is not visible.

## The three states are ordered by the host

`state` is `loading`, `options` or `empty`. `Listbox` does not compute it. The two hosts mean
different things by a first load: `Select` refuses to open at all while it loads with nothing
to show, and `Autocomplete` opens and shows the spinner, because the keystroke that starts the
request is the one that opens the popup.

While `state` is `loading`, no element carries the listbox `id`. A host must then remove
`aria-controls` from its control. Each host takes both answers from one condition:
`isBlocked` in `useSelect`, and `isLoadingFirstPage` in `useAutocomplete`.

## The flat index is computed here

Options render per Group and navigate as one flat list of Visible Options. `layoutRows` in
`useVirtualRows.ts` computes each Group's offset one time for each list, and each row receives
its index within Visible Options. Pointer hover passes that index to `setActiveIndex`.

## `Listbox` scrolls, and the model does not

Nothing in the list has DOM focus
([ADR-0001](../../../../docs/adr/0001-select-uses-aria-activedescendant.md)), so the browser
does not show the Active Option by itself. `Listbox` gives `useOptionList` a `scrollToIndex`
function through `setScrollToIndex`, and `navigate` calls it. The model does not read the
document.

The reason is the Virtual List: the Active Option can be a Row that is not in the document
(`End`, `PageDown`, Typeahead, the Selected Option when the popup opens), and only `Listbox`
knows where that Row is. One owner for both modes is simpler than a model that knows two.

Only keyboard navigation scrolls. Pointer hover calls `setActiveIndex`, which does not; the
comment on `scrollActiveIntoView` in `useOptionList.ts` has the reason.

The label of a Group is `position: sticky`, and `scrollIntoView` does not count it: an Option
can be in view and under the label. A list that renders every Row therefore measures how much
of the Option the label covers and scrolls by that amount. A Virtual List subtracts the height
of the label in its arithmetic. The first form has no spec, because the test DOM has no
layout, and it can leave 1px on the last Option of a Group.

## The Virtual List

`virtual` on a host makes its listbox a Virtual List: only the Rendered Rows are in the
document. `useVirtualRows.ts` is the engine. The target is a list of about 10,000 Options
whose Items are all in memory. Only the rendering changes; `useOptionList` still makes an
Option from every Item and the default filter still reads every Label.

### Fixed heights

Every Option has one height and every Group label has one height. The position of a Row is
then arithmetic, the scrollbar has its final length from the first render, and a jump to a
far Option (`End`, the Selected Option on open) is exact.

Measured heights accept any slot content. Their cost is a scrollbar that changes length while
Rows are measured, a far jump that goes to an estimate and then corrects, and behaviour that
the test DOM cannot cover, because it has no layout. `virtual` is opt-in, so a list with rows
of different heights keeps the mode that renders every Row.

`Listbox` writes the height on each Row as an inline style. The number that the layout counts
with and the height that the browser draws then cannot differ. The space above a Group label
(`mt-1` without `virtual`) is removed in a Virtual List for the same reason: every label Row
must have one height.

### An engine of our own

With fixed heights the engine is small: the top of each Group, a binary search for the first
Group in the range, and a division for the first Option in that Group.

- **VueUse `useVirtualList`** needs `itemHeight` as a function for two heights, and it then
  adds the heights from index 0 on each scroll event. Its `scrollTo` always puts the Row at
  the top edge. The keyboard needs the smallest scroll that shows the Row, so the offsets
  would be computed here in any case.
- **`@tanstack/vue-virtual`** is a new dependency, and most of it is for measured heights.

### One template, and the Groups keep their wrappers

`rendered` in `useVirtualRows` gives Groups with their rendered Options. Without `virtual`
that is every Group with every Option, so `Listbox` has one template for both modes.

A Group that has a Rendered Row is rendered with its label and with its full height: a spacer
before and after its rendered Options holds the height of the others. Two things follow.

- The label stays `position: sticky` over its Group, as without `virtual`.
- The label is always in the document when one of its Options is, so `aria-labelledby` on
  the Group wrapper always resolves.

Groups that have no Rendered Row are one spacer before the rendered Groups and one after.

### The width is fixed

Without `virtual` the list follows the widest Label, between the width of the trigger and
`25rem`. With only some Rows in the document that width changes during a scroll. A Virtual
List has the width of the trigger, with the same 180px minimum, by one CSS rule on
`data-virtual`.

### `aria-posinset` and `aria-setsize`

A screen reader counts the Options that are in the document. A Virtual List sets both
attributes on each Option. The values count within the Group, because the set of an Option in
a `role="group"` is that Group. A list that renders every Option does not set them; the
browser computes the same values.

### Known limitations

- **Screen readers are not tested.** The attributes follow the ARIA definition of the set.
  How NVDA, JAWS and VoiceOver announce the count in a grouped listbox is not verified.
- **`aria-activedescendant` can name an Option that is not in the document.** Two cases.
  After a jump to a far Option the attribute changes in one flush and the Row renders in the
  next. After a scroll with the wheel or the scrollbar, the Active Option can leave the
  Rendered Rows, and the attribute names it until the next key or the next hover. No effect
  was seen in Chromium; a screen reader is not tested. A fix is to keep the Active Option
  rendered when it is outside the range.
- **Content that is higher than the Row is cut.** A consumer with a higher Option passes
  `optionHeight`.
- **Chromium only.** The scroll and the keyboard were checked in Chromium. Safari, Firefox
  and a touch device are not checked.
- **The size of the overscan is a constant**, `OVERSCAN` in `useVirtualRows.ts`. A fast drag
  of the scrollbar can show a gap for one frame.

## The CSS classes still say `select`

The rows and the list use `.select-list`, `.select-option` and `.select-group-label` from
`assets/css/components/select.css`. `Autocomplete` already used those classes before this
folder existed. The stable hook for both hosts is `data-slot="listbox"`.

## Out of scope

- **`TimePicker`'s columns.** Its selection follows the arrow keys, it has two lists for one
  field, and its mask is the source of truth. See `base/time-picker/DESIGN.md`.
- **`Menu`.** A menu is not a listbox
  ([ADR-0009](../../../../docs/adr/0009-menus-are-menus-not-listboxes.md)).
