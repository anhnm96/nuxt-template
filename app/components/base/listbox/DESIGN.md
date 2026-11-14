# Listbox — design

`Listbox.vue` and `ListboxOption.vue` are the listbox that `Select` and `Autocomplete` show in
their Popover. They are internal to those two hosts. They have no README, because a consumer
does not compose with them.

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

Options render per Group and navigate as one flat list of Visible Options. `Listbox` computes
each Group's offset one time for each render, and each row receives its index within Visible
Options. Pointer hover passes that index to `setActiveIndex`.

## The CSS classes still say `select`

The rows and the list use `.select-list`, `.select-option` and `.select-group-label` from
`assets/css/components/select.css`. `Autocomplete` already used those classes before this
folder existed. The stable hook for both hosts is `data-slot="listbox"`.

## Out of scope

- **`TimePicker`'s columns.** Its selection follows the arrow keys, it has two lists for one
  field, and its mask is the source of truth. See `base/time-picker/DESIGN.md`.
- **`Menu`.** A menu is not a listbox
  ([ADR-0009](../../../../docs/adr/0009-menus-are-menus-not-listboxes.md)).
