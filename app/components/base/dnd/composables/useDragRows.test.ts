import { useDragRows } from './useDragRows'

function setup(items = ['a', 'b', 'c', 'd', 'e']) {
  const list = ref(items)
  const visible = ref<{ offset: number, count: number }>()
  const placeholderIndex = ref(0)
  const showPlaceholder = ref(false)
  const draggingAtIndex = ref(-1)

  const projection = useDragRows<string>({
    list: () => list.value,
    itemKey: item => item,
    visible: () => visible.value,
    placeholderIndex: () => placeholderIndex.value,
    showPlaceholder: () => showPlaceholder.value,
    draggingAtIndex: () => draggingAtIndex.value,
  })

  /** `item:index/slotIndex` per row, `[slotIndex]` for the placeholder */
  const shape = () =>
    projection.rows.value.map(row =>
      row.kind === 'placeholder'
        ? `[${row.slotIndex}]`
        : `${row.item}:${row.index}/${row.slotIndex}${row.pinned ? '*' : ''}`,
    )

  return {
    list,
    visible,
    placeholderIndex,
    showPlaceholder,
    draggingAtIndex,
    shape,
    ...projection,
  }
}

it('renders every item in list order when no window is given', () => {
  const { shape, isWindowed } = setup()

  expect(isWindowed.value).toBe(false)
  expect(shape()).toEqual(['a:0/0', 'b:1/1', 'c:2/2', 'd:3/3', 'e:4/4'])
})

it('shifts the slots below the placeholder by one', () => {
  const { shape, showPlaceholder, placeholderIndex, placeholderRendered } = setup()

  showPlaceholder.value = true
  placeholderIndex.value = 2

  expect(placeholderRendered.value).toBe(true)
  // the indexes handed to consumers stay positions in the list, only the slots move
  expect(shape()).toEqual(['a:0/0', 'b:1/1', '[2]', 'c:2/3', 'd:3/4', 'e:4/5'])
})

it('renders the window only, in whole-list positions', () => {
  const { shape, visible } = setup()

  visible.value = { offset: 2, count: 2 }

  expect(shape()).toEqual(['c:2/2', 'd:3/3'])
})

it('clamps a window reaching past the end of the list', () => {
  const { shape, visible } = setup()

  visible.value = { offset: 3, count: 99 }

  expect(shape()).toEqual(['d:3/3', 'e:4/4'])
})

it('renders nothing for a window past the end, or a negative count', () => {
  const { shape, visible } = setup()

  visible.value = { offset: 9, count: 3 }
  expect(shape()).toEqual([])

  visible.value = { offset: 1, count: -2 }
  expect(shape()).toEqual([])
})

it('previews nothing while the landing spot is out of the window', () => {
  const { shape, visible, showPlaceholder, placeholderIndex, placeholderRendered }
    = setup()

  visible.value = { offset: 3, count: 2 }
  showPlaceholder.value = true
  placeholderIndex.value = 0

  // the insertion index still stands, it is simply nowhere on screen
  expect(placeholderRendered.value).toBe(false)
  expect(shape()).toEqual(['d:3/3', 'e:4/4'])
})

it('holds the last slot when the window ends on the insertion index', () => {
  const { shape, visible, showPlaceholder, placeholderIndex, placeholderRendered }
    = setup()

  visible.value = { offset: 1, count: 2 }
  showPlaceholder.value = true
  placeholderIndex.value = 3

  expect(placeholderRendered.value).toBe(true)
  expect(shape()).toEqual(['b:1/1', 'c:2/2', '[3]'])
})

it('pins the dragged item while it is scrolled out of the window', () => {
  const { shape, visible, draggingAtIndex, topRow } = setup()

  visible.value = { offset: 3, count: 2 }
  draggingAtIndex.value = 0

  // last, and marked: it is rendered out of flow only to stay mounted
  expect(shape()).toEqual(['d:3/3', 'e:4/4', 'a:0/0*'])
  // the pinned row is no candidate for the distance math
  expect(topRow.value?.item).toBe('d')
})

it('pins nothing for an item in view, or without a window', () => {
  const { shape, visible, draggingAtIndex } = setup()

  draggingAtIndex.value = 0
  visible.value = { offset: 0, count: 2 }
  expect(shape()).toEqual(['a:0/0', 'b:1/1'])

  visible.value = undefined
  expect(shape()).toEqual(['a:0/0', 'b:1/1', 'c:2/2', 'd:3/3', 'e:4/4'])
})

it('reports the placeholder on top, and the item below it as the top row', () => {
  const { visible, showPlaceholder, placeholderIndex, topRow, placeholderOnTop }
    = setup()

  visible.value = { offset: 2, count: 2 }
  showPlaceholder.value = true
  placeholderIndex.value = 2

  expect(placeholderOnTop.value).toBe(true)
  expect(topRow.value).toMatchObject({ item: 'c', index: 2, slotIndex: 3 })
})
