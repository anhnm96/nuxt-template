interface UseCheckboxOptions<T, K = (item: T) => T> {
  items: Ref<T[]>
  valueAdapter?: K
  canSelectItemFn?: (item: T) => boolean
  initialItem?: T[]
}

interface UseCheckboxReturn<T, V> {
  selectedItems: Ref<V[]>
  hasSelectedItem: ComputedRef<boolean>
  isAllSelected: ComputedRef<boolean>
  canSelectAllItems: ComputedRef<boolean>
  toggleSelectAll: () => void
  isItemChecked: (item: T) => boolean
  selectItem: (item: T, index?: number, event?: MouseEvent) => void
  removeSelectedItem: (item: T) => void
  clearSelectedItems: () => void
}

export function useCheckbox<T>(options: UseCheckboxOptions<T>): UseCheckboxReturn<T, T>
export function useCheckbox<T, K extends keyof T>(options: UseCheckboxOptions<T, K>): UseCheckboxReturn<T, T[K]>
export function useCheckbox<T, F extends (item: T) => any>(options: UseCheckboxOptions<T, F>): UseCheckboxReturn<T, ReturnType<F>>
export function useCheckbox<T>(options: UseCheckboxOptions<T>) {
  const { items, valueAdapter, canSelectItemFn = (item: T) => !!item, initialItem } = options
  const selectedItems = ref<any[]>(initialItem?.map(getValue) ?? [])

  const hasSelectedItem = computed(() => selectedItems.value.length > 0)
  const lastCheckedIndex = ref(-1)
  const filteredItems = computed(() => items.value.filter(canSelectItemFn))
  const canSelectAllItems = computed(() => filteredItems.value.length > 0)
  const isAllSelected = computed(() => {
    if (filteredItems.value.length === 0) return false
    const selected = new Set(selectedItems.value)
    return filteredItems.value.every(item => selected.has(getValue(item)))
  })

  function getValue(item: T) {
    if (typeof valueAdapter === 'string') {
      return item[valueAdapter as keyof T]
    }
    if (typeof valueAdapter === 'function') {
      return valueAdapter(item)
    }
    return item
  }

  function removeSelectedItem(item: T) {
    const value = getValue(item)
    const index = selectedItems.value.indexOf(value)
    if (index >= 0) selectedItems.value.splice(index, 1)
  }

  function toggleSelectAll() {
    const _isAllSelected = isAllSelected.value
    for (const item of items.value) {
      if (!canSelectItemFn(item)) continue
      // remove current value to avoid duplicate entries
      removeSelectedItem(item)
      if (!_isAllSelected) selectedItems.value.push(getValue(item))
    }
  }

  function isItemChecked(item: T) {
    return selectedItems.value.includes(getValue(item))
  }

  function selectItem(item: T, index?: number, event?: MouseEvent) {
    const prevIndex = lastCheckedIndex.value
    lastCheckedIndex.value = index || items.value.indexOf(item)
    if (event?.shiftKey && prevIndex !== -1 && lastCheckedIndex.value !== prevIndex) {
      shiftSelectItem(lastCheckedIndex.value, prevIndex)
    } else {
      isItemChecked(item) ? removeSelectedItem(item) : selectedItems.value.push(getValue(item))
    }
  }

  function shiftSelectItem(currentIndex: number, previousIndex: number) {
    const start = Math.min(currentIndex, previousIndex)
    const end = Math.max(currentIndex, previousIndex) + 1
    const subset = items.value.slice(start, end)
    const shouldCheck = !isItemChecked(items.value[currentIndex]!)
    for (const item of subset) {
      if (!canSelectItemFn(item)) continue
      removeSelectedItem(item)
      if (shouldCheck) selectedItems.value.push(getValue(item))
    }
  }

  function clearSelectedItems(force?: boolean) {
    if (force) {
      selectedItems.value = []
      return
    }
    selectedItems.value = selectedItems.value.filter((value) => {
      const item = items.value.find(i => getValue(i) === value)
      return item ? !canSelectItemFn(item) : false
    })
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
