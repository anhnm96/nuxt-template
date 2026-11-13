import type { ComputedRef, MaybeRefOrGetter, ShallowRef } from 'vue'

/** Reads the checked value from a row: a key of the row, or a function of it. */
type CheckboxValueAdapter<T> = keyof T | ((item: T) => unknown)

export interface UseCheckboxOptions<T, A = undefined> {
  /** The rows, in the order they appear. A shift range uses the order of this list. */
  items: MaybeRefOrGetter<readonly T[]>
  /** No adapter means `selectedItems` holds the rows themselves. */
  valueAdapter?: A
  /** `selectItem` does not check a row this rejects. Select-all and shift ranges do not change the row. */
  canSelectItemFn?: (item: T) => boolean
  /** Rows that start checked. */
  initialItems?: readonly T[]
}

export interface UseCheckboxReturn<T, V> {
  /** The checked values, not the rows. Assign a new array to change it; Vue does not track a `push`. */
  selectedItems: ShallowRef<V[]>
  hasSelectedItem: ComputedRef<boolean>
  isAllSelected: ComputedRef<boolean>
  canSelectAllItems: ComputedRef<boolean>
  toggleSelectAll: () => void
  isItemChecked: (item: T) => boolean
  /**
   * Toggles a row. With `event.shiftKey`, it checks every selectable row from the previous click
   * to this one, or unchecks them when this row is checked.
   */
  selectItem: (item: T, event?: { shiftKey: boolean }) => void
  removeSelectedItem: (item: T) => void
  /** Unchecks every selectable row and drops values whose row is gone. `force` empties the list. */
  clearSelectedItems: (force?: boolean) => void
}

// Overloads, not one generic adapter parameter: a bare `i => i.id` gets no contextual type when the
// adapter is a type parameter constrained to `keyof T | function`. The adapter then uses its default.
export function useCheckbox<T>(options: UseCheckboxOptions<T>): UseCheckboxReturn<T, T>
export function useCheckbox<T, K extends keyof T>(options: UseCheckboxOptions<T, K>): UseCheckboxReturn<T, T[K]>
export function useCheckbox<T, R>(options: UseCheckboxOptions<T, (item: T) => R>): UseCheckboxReturn<T, R>
export function useCheckbox<T>(options: UseCheckboxOptions<T, CheckboxValueAdapter<T> | undefined>): UseCheckboxReturn<T, any> {
  const { valueAdapter, canSelectItemFn = () => true } = options

  const items = computed(() => toValue(options.items))
  // Shallow, so object values stay raw. A deep ref stores proxies, and `Set#has(row)` then fails.
  const selectedItems = shallowRef<unknown[]>(options.initialItems?.map(getValue) ?? [])
  const selectedSet = computed(() => new Set(selectedItems.value))
  const selectableItems = computed(() => items.value.filter(canSelectItemFn))

  const hasSelectedItem = computed(() => selectedItems.value.length > 0)
  const canSelectAllItems = computed(() => selectableItems.value.length > 0)
  const isAllSelected = computed(() => canSelectAllItems.value && selectableItems.value.every(isItemChecked))

  // The shift anchor is a value, not an index, so a refetch or a filter cannot move it to another row.
  let anchor: { value: unknown } | undefined

  function getValue(item: T) {
    if (valueAdapter === undefined) return item
    return typeof valueAdapter === 'function' ? valueAdapter(item) : item[valueAdapter]
  }

  function isItemChecked(item: T) {
    return selectedSet.value.has(getValue(item))
  }

  function setChecked(rows: readonly T[], checked: boolean) {
    const values = new Set(rows.map(getValue))
    const rest = selectedItems.value.filter(v => !values.has(v))
    selectedItems.value = checked ? [...rest, ...values] : rest
  }

  function toggleSelectAll() {
    setChecked(selectableItems.value, !isAllSelected.value)
  }

  function selectItem(item: T, event?: { shiftKey: boolean }) {
    const list = items.value
    const from = event?.shiftKey && anchor ? list.findIndex(i => getValue(i) === anchor!.value) : -1
    const to = list.indexOf(item)
    const checked = !isItemChecked(item)
    anchor = { value: getValue(item) }

    if (from !== -1 && to !== -1 && from !== to) {
      const range = list.slice(Math.min(from, to), Math.max(from, to) + 1)
      setChecked(range.filter(canSelectItemFn), checked)
    } else if (!checked || canSelectItemFn(item)) {
      setChecked([item], checked)
    }
  }

  function removeSelectedItem(item: T) {
    setChecked([item], false)
  }

  function clearSelectedItems(force = false) {
    anchor = undefined
    if (force) {
      selectedItems.value = []
      return
    }
    const locked = new Set(items.value.filter(i => !canSelectItemFn(i)).map(getValue))
    selectedItems.value = selectedItems.value.filter(v => locked.has(v))
  }

  return {
    selectedItems,
    hasSelectedItem,
    isAllSelected,
    canSelectAllItems,
    toggleSelectAll,
    isItemChecked,
    selectItem,
    removeSelectedItem,
    clearSelectedItems,
  }
}
