import { useCheckbox } from './useCheckbox'

interface Row { id: number, name: string, locked?: boolean }

function rows(): Row[] {
  return [
    { id: 1, name: 'a' },
    { id: 2, name: 'b', locked: true },
    { id: 3, name: 'c' },
    { id: 4, name: 'd' },
  ]
}

describe('useCheckbox types', () => {
  it('infers the value type from the adapter', () => {
    const items = ref(rows())
    expectTypeOf(useCheckbox({ items }).selectedItems.value).toEqualTypeOf<Row[]>()
    expectTypeOf(useCheckbox({ items, valueAdapter: 'name' }).selectedItems.value).toEqualTypeOf<string[]>()
    expectTypeOf(useCheckbox({ items, valueAdapter: r => r.id }).selectedItems.value).toEqualTypeOf<number[]>()
    expectTypeOf(useCheckbox({ items: () => items.value, canSelectItemFn: r => !r.locked }).isItemChecked).parameter(0).toEqualTypeOf<Row>()
    // @ts-expect-error 'nope' is not a key of Row.
    useCheckbox({ items, valueAdapter: 'nope' })
  })
})

describe('useCheckbox', () => {
  function setup() {
    const items = ref(rows())
    const box = useCheckbox({ items, valueAdapter: r => r.id, canSelectItemFn: r => !r.locked })
    return { items, ...box }
  }

  it('toggles a single row', () => {
    const { items, selectItem, selectedItems } = setup()
    selectItem(items.value[0]!)
    expect(selectedItems.value).toEqual([1])
    selectItem(items.value[0]!)
    expect(selectedItems.value).toEqual([])
  })

  it('does not check a row that canSelectItemFn rejects', () => {
    const { items, selectItem, selectedItems } = setup()
    selectItem(items.value[1]!)
    expect(selectedItems.value).toEqual([])
  })

  it('sets a shift range and skips locked rows', () => {
    const { items, selectItem, selectedItems } = setup()
    selectItem(items.value[0]!)
    selectItem(items.value[3]!, { shiftKey: true })
    expect(selectedItems.value).toEqual([1, 3, 4])
  })

  it('keeps the shift anchor on its row after the list is reordered', () => {
    const { items, selectItem, selectedItems } = setup()
    selectItem(items.value[2]!) // id 3
    items.value = [...items.value].reverse() // 4, 3, 2, 1
    selectItem(items.value[0]!, { shiftKey: true }) // id 4
    expect(selectedItems.value).toEqual([4, 3])
  })

  it('selects all, then clears all, leaving locked rows alone', () => {
    const items = ref(rows())
    const { toggleSelectAll, isAllSelected, selectedItems } = useCheckbox({
      items,
      valueAdapter: 'id',
      canSelectItemFn: r => !r.locked,
      initialItems: [items.value[1]!],
    })
    toggleSelectAll()
    expect(isAllSelected.value).toBe(true)
    expect(selectedItems.value).toEqual([2, 1, 3, 4])
    toggleSelectAll()
    expect(selectedItems.value).toEqual([2])
  })

  it('matches object rows by identity without an adapter', () => {
    const items = shallowRef(rows())
    const { toggleSelectAll, isAllSelected, isItemChecked } = useCheckbox({ items })
    toggleSelectAll()
    expect(isAllSelected.value).toBe(true)
    expect(isItemChecked(items.value[0]!)).toBe(true)
  })

  it('clears selectable values and orphans, but keeps locked ones unless forced', () => {
    const items = ref(rows())
    const { clearSelectedItems, selectedItems } = useCheckbox({
      items,
      valueAdapter: 'id',
      canSelectItemFn: r => !r.locked,
    })
    selectedItems.value = [1, 2, 99]
    clearSelectedItems()
    expect(selectedItems.value).toEqual([2])
    clearSelectedItems(true)
    expect(selectedItems.value).toEqual([])
  })
})
