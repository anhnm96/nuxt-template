# TimePicker — design

Why this component is built the way it is. For how to *use* it, see [README.md](./README.md).

## It does not use the shared listbox

`Select` and `Autocomplete` share `useOptionList`, `useListboxOpen` and `base/listbox/`. The two
columns here have `role="listbox"` too, and they share none of it. The model is different in
kind:

- **There is no Active Option.** `ArrowDown` changes the value. "Selected" and "highlighted"
  are one state here, and `useOptionList` exists to keep those two apart.
- **There is nothing to normalise.** The options are a fixed range of zero-padded strings. They
  have no accessors, Keys, Groups or filter.
- **Two lists belong to one field.** The active column follows the caret, and `Tab` moves
  between columns. `Listbox` has no sibling list.
- **The mask is the source of truth.** A pick goes into the mask as a keystroke does, and the
  mask then updates the model. The option-list model has no place for that.

To use the shared layer, `Listbox` would need a mode where the selection follows the cursor and
a mode with more than one column, both for this one caller.

`stepColumn` keeps its own arithmetic for the same reason. `useListNavigation` would add
Typeahead and a search past disabled rows, and this component wants neither: a printable key
must reach the mask, and no option is ever disabled.

## One loop renders both columns

The hour column and the minute column are the same markup. `columns` holds what differs: the
list, the selected value and the accessible name. `selectInColumn` replaces one column's slice
of the Masked Value, which is always five characters wide.
