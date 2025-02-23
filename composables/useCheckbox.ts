export function useCheckbox<T>(
  items: Ref<T[]>,
  valueAdapter?: keyof T | ((item: T) => any),
  canSelectItemFn = (item: T) => !!item,
) {
  const selectedItems = ref<any[]>([])
  const hasSelectedItem = computed(() => selectedItems.value.length > 0)

  function getValue(item: T): any {
    if (typeof valueAdapter === 'string') {
      return item[valueAdapter]
    }
    if (typeof valueAdapter === 'function') {
      return valueAdapter(item)
    }
    return item
  }

  const lastCheckedRowIndex = ref(-1)
  const filteredItems = computed(() => items.value.filter(canSelectItemFn))
  const canSelectAllItems = computed(() => filteredItems.value.length > 0)
  const isAllSelected = computed(() => {
    return selectedItems.value.length === filteredItems.value.length
  })

  function toggleSelectAll() {
    const _isAllSelected = isAllSelected.value
    for (const item of items.value) {
      if (!canSelectItemFn(item)) continue
      removeSelectedItem(item)
      if (!_isAllSelected) selectedItems.value.push(getValue(item))
    }
  }

  function isItemChecked(item: T) {
    return selectedItems.value.includes(getValue(item))
  }

  function selectItem(item: T, index: number, event: MouseEvent) {
    const lastIndex = lastCheckedRowIndex.value
    lastCheckedRowIndex.value = index
    if (event.shiftKey && lastIndex !== -1 && index !== lastIndex)
      shiftSelectItem(item, index, lastIndex)
    else if (!isItemChecked(item)) selectedItems.value.push(getValue(item))
    else removeSelectedItem(item)
  }

  function shiftSelectItem(item: T, index: number, lastCheckedRowIndex: number) {
    // Get the subset of the list between the two indicies
    const subset = items.value.slice(
      Math.min(index, lastCheckedRowIndex),
      Math.max(index, lastCheckedRowIndex) + 1,
    )
    // Determine the operation based on the state of the clicked checkbox
    const shouldCheck = !isItemChecked(item)
    subset.forEach((i: T) => {
      removeSelectedItem(i)
      if (shouldCheck) selectedItems.value.push(getValue(i))
    })
  }

  function removeSelectedItem(item: T) {
    const index = selectedItems.value.indexOf(getValue(item))
    if (index >= 0) selectedItems.value.splice(index, 1)
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
  }
}
