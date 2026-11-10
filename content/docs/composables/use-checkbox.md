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
function useCheckbox<T, F extends (item: T) => any>(options: UseCheckboxOptions<T, F>): UseCheckboxReturn<T, ReturnType<F>>
```

### Options

| Option | Type | Default | What it does |
| --- | --- | --- | --- |
| `items` | `Ref<T[]>` | required | The rows, in the order they appear. Read as `.value`, so pass a ref or a `computed`, not a getter. |
| `valueAdapter` | `keyof T \| (item: T) => V` | the item itself | How a checked value is read from a row. A string reads that property. |
| `canSelectItemFn` | `(item: T) => boolean` | `item => !!item` | Which rows can be checked by select-all and by a shift range. |
| `initialItem` | `T[]` | `[]` | Rows that start checked. Despite the singular name it takes an array, and each row goes through `valueAdapter`. |

### Return value

| Name | Type | What it is |
| --- | --- | --- |
| `selectedItems` | `Ref<V[]>` | The checked values, not the rows. |
| `hasSelectedItem` | `ComputedRef<boolean>` | At least one value is checked. |
| `isAllSelected` | `ComputedRef<boolean>` | Every selectable row is checked. `false` when no row is selectable. |
| `canSelectAllItems` | `ComputedRef<boolean>` | At least one row is selectable. |
| `toggleSelectAll` | `() => void` | Checks every selectable row, or unchecks them when all are already checked. |
| `isItemChecked` | `(item: T) => boolean` | Whether a row's value is checked. |
| `selectItem` | `(item: T, index?: number, event?: MouseEvent) => void` | Toggles a row, or applies a shift range. |
| `removeSelectedItem` | `(item: T) => void` | Unchecks a row. |
| `clearSelectedItems` | `() => void` | Unchecks rows. See the notes for which ones. |

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
    :model-value="isAllSelected"
    :disabled="!canSelectAllItems"
    @change="toggleSelectAll"
  >

  <tr v-for="(row, index) in rows" :key="row.id">
    <td>
      <input
        type="checkbox"
        :model-value="isItemChecked(row)"
        :disabled="row.locked"
        @click="selectItem(row, index, $event)"
      >
    </td>
  </tr>
</template>
```

Pass the row's `index` and the click `event`. The event carries `shiftKey`, which is what turns a click into a range.

## Behaviour

- **A click toggles one row.** `selectItem` adds the row's value, or removes it when it is already checked.
- **Shift and click checks a range.** The range runs from the previous click to this one, both rows included. Every selectable row in it is set to the opposite of the clicked row's current state. Rows that `canSelectItemFn` rejects are skipped. The first click, or a shift click on the same row, is a plain toggle.
- **Select all** checks every selectable row when something is still unchecked, and unchecks every selectable row when all are checked. Unselectable rows keep whatever state they had.
- **Matching uses strict equality on values.** With no adapter and object rows, two rows are the same only when they are the same object.

## Notes

- `selectItem` on a single row does not call `canSelectItemFn`. Only select-all and shift ranges do. Disable the checkbox for a row that must not be checked, as the example does.
- `clearSelectedItems` takes an optional `force` argument in the implementation, but the declared type is `() => void`, so TypeScript callers cannot pass it. Without `force` it drops every checked value whose row is selectable or no longer in `items`. It keeps the value of a row that is still present but unselectable. With `force` it empties the list.
- The remembered position for shift ranges is an index. It is not reset when `items` changes, so after a filter or a page change the first shift click can span rows that were not on screen at the previous click.
- `selectedItems` is changed in place, with `push` and `splice`. `clearSelectedItems` replaces it. Read it through the ref and do not keep a copy of the array.
