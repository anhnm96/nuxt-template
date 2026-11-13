# useCheckbox

Tracks which rows of a list are checked: single toggles, shift-click ranges and select-all. It keeps the *values* of the checked rows, read from each row through an adapter. Rendering, labels and the checkbox markup stay with the host.

## Signature

`useCheckbox` has three overloads. They differ only in what `selectedItems` holds.

```ts
// No adapter: selectedItems holds the items themselves.
function useCheckbox<T>(options: UseCheckboxOptions<T>): UseCheckboxReturn<T, T>

// A key of T: selectedItems holds that property of each item.
function useCheckbox<T, K extends keyof T>(options: UseCheckboxOptions<T, K>): UseCheckboxReturn<T, T[K]>

// A function: selectedItems holds whatever it returns.
function useCheckbox<T, R>(options: UseCheckboxOptions<T, (item: T) => R>): UseCheckboxReturn<T, R>
```

The overloads are deliberate. One generic adapter parameter constrained to `keyof T | ((item: T) => unknown)` reads better, but TypeScript then gives a bare `row => row.id` no contextual type. TypeScript reports the parameter as implicit `any`, and the value type uses its default.

### Options

| Option | Type | Default | What it does |
| --- | --- | --- | --- |
| `items` | `MaybeRefOrGetter<readonly T[]>` | required | The rows, in the order they appear. A shift range uses the order of this list. |
| `valueAdapter` | `keyof T \| (item: T) => R` | the item itself | Reads the checked value from a row. A string reads that property. |
| `canSelectItemFn` | `(item: T) => boolean` | `() => true` | Which rows a click, select-all and a shift range can check. |
| `initialItems` | `readonly T[]` | `[]` | Rows that start checked. Each row goes through `valueAdapter`. |

### Return value

| Name | Type | What it is |
| --- | --- | --- |
| `selectedItems` | `ShallowRef<V[]>` | The checked values, not the rows. |
| `hasSelectedItem` | `ComputedRef<boolean>` | At least one value is checked. |
| `isAllSelected` | `ComputedRef<boolean>` | Every selectable row is checked. `false` when no row is selectable. |
| `canSelectAllItems` | `ComputedRef<boolean>` | At least one row is selectable. |
| `toggleSelectAll` | `() => void` | Checks every selectable row, or unchecks them when all are already checked. |
| `isItemChecked` | `(item: T) => boolean` | Whether a row's value is checked. |
| `selectItem` | `(item: T, event?: { shiftKey: boolean }) => void` | Toggles a row, or checks or unchecks a shift range. |
| `removeSelectedItem` | `(item: T) => void` | Unchecks a row. |
| `clearSelectedItems` | `(force?: boolean) => void` | Unchecks rows. See the notes for which ones. |

## Usage

```ts
const rows = computed(() => data.value?.list ?? [])

const {
  selectedItems,
  isAllSelected,
  canSelectAllItems,
  hasSelectedItem,
  toggleSelectAll,
  isItemChecked,
  selectItem,
} = useCheckbox({
  items: rows,
  valueAdapter: row => row.id, // selectedItems is then an array of ids
  canSelectItemFn: row => !row.locked,
})
```

```vue
<template>
  <input
    type="checkbox"
    :indeterminate="hasSelectedItem && !isAllSelected"
    :checked="isAllSelected"
    :disabled="!canSelectAllItems"
    @change="toggleSelectAll"
  >
  <!-- OR -->
  <Checkbox
    :indeterminate="hasSelectedItem && !isAllSelected"
    :model-value="isAllSelected"
    :disabled="!canSelectAllItems"
    @change="toggleSelectAll"
  />

  <tr v-for="row in rows" :key="row.id">
    <td>
      <input
        type="checkbox"
        :checked="isItemChecked(row)"
        :disabled="row.locked"
        @click="selectItem(row, $event)"
      >
    </td>
  </tr>
</template>
```

Pass the click `event`. It carries `shiftKey`, which is what turns a click into a range. Pass the list you render as `items`; a range over a filtered view needs the filtered list.

## Behaviour

- **A click toggles one row.** `selectItem` adds the row's value, or removes it when it is already checked. It does not check a row that `canSelectItemFn` rejects, but it can uncheck one.
- **Shift and click checks or unchecks a range.** The range runs from the previous click to this one, both rows included. Every selectable row in it gets the opposite of the clicked row's current state. The first click, or a shift click on the same row, is a plain toggle.
- **The range anchor is a value.** It follows its row through a refetch or a reorder. When the anchor row is no longer in `items`, a shift click is a plain toggle.
- **Select all** checks every selectable row when something is still unchecked, and unchecks every selectable row when all are checked. Unselectable rows keep whatever state they had.
- **Matching uses `Set` equality on values.** With no adapter and object rows, two rows are the same only when they are the same object.

## Notes

- `clearSelectedItems()` drops every checked value whose row is selectable or no longer in `items`. It keeps the value of a row that is still present but unselectable. `clearSelectedItems(true)` empties the list. Both reset the range anchor.
- `selectedItems` is a `shallowRef`, so object values stay raw and identity matching works. Assign a new array to change it from outside; Vue does not track a `push`.
