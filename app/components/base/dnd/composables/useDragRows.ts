/** one rendered row of a drag list: an item of it, or the placeholder */
export interface DragRow<T> {
  kind: 'item' | 'placeholder'
  key: PropertyKey
  /** position in the list, -1 for the placeholder which is not in it */
  index: number
  item?: T
  /** the dragged item, kept mounted out of flow while scrolled out of view */
  pinned?: boolean
}

interface DragRowsParams<T> {
  /** the whole list, however much of it is rendered */
  list: () => T[]
  /** func to get the v-for key of an item */
  itemKey: (item: T) => PropertyKey
  /**
   * which slice of `list` a virtualizer renders: `offset` is the position of the
   * first rendered item, `count` how many follow it. Undefined renders all of it
   */
  visible: () => { offset: number, count: number } | undefined
  /** where in `list` the placeholder holds a slot */
  placeholderIndex: () => number
  /**
   * whether a row is held for the landing spot at all. The caller may follow a
   * spot without one: a drop that would leave the dragged item where it already
   * sits has a `placeholderIndex` and nothing to render for it
   */
  showPlaceholder: () => boolean
  /**
   * where the list's own dragged item currently sits, -1 while the dragged item
   * is not one of its own
   */
  draggingAtIndex: () => number
}

function placeholderRow<T>(): DragRow<T> {
  return {
    kind: 'placeholder',
    key: 'drag-item--placeholder',
    index: -1,
  }
}

/**
 * Projects a list into the rows a drag list renders: the visible slice of it,
 * the slot the placeholder holds, and the dragged item kept mounted while it is
 * scrolled out of view. Pure derivation, the caller owns the drag state.
 *
 * Every index stays a position in the whole list, so items reorder and land
 * across the parts that are not rendered.
 *
 * `renderStart` and `renderEnd` are the window it settled on, and `windowKey`
 * names it: two updates sharing one key are two renders of the same rows, which
 * is what tells a reorder worth animating from a scroll step that is not.
 */
export function useDragRows<T>({
  list,
  itemKey,
  visible,
  placeholderIndex,
  showPlaceholder,
  draggingAtIndex,
}: DragRowsParams<T>) {
  /** true while a virtualizer decides which part of the list is rendered */
  const isWindowed = computed(() => !!visible())
  /** position of the first rendered item */
  const renderStart = computed(() => {
    const window = visible()
    if (!window) return 0
    return clamp(window.offset, 0, list().length)
  })
  /** position right after the last rendered item */
  const renderEnd = computed(() => {
    const window = visible()
    if (!window) return list().length
    // never above the start, so a negative count renders nothing
    return clamp(
      renderStart.value + window.count,
      renderStart.value,
      list().length,
    )
  })

  /**
   * The placeholder holds a slot, but only a rendered one: its insertion index
   * may sit outside the window.
   */
  const placeholderRendered = computed(
    () =>
      showPlaceholder()
      && placeholderIndex() >= renderStart.value
      && placeholderIndex() <= renderEnd.value,
  )

  /**
   * The dragged item while it is scrolled out of the window. Its element has to
   * survive the whole drag: unmounting the source of a native drag ends the drag
   * session, and no `dragend` would be left to clean up after it.
   */
  const pinnedRow = computed<DragRow<T> | null>(() => {
    const index = draggingAtIndex()
    // a negative index is no item of ours, and an item in view needs no pinning
    if (!isWindowed.value || index < 0) return null
    if (index >= renderStart.value && index < renderEnd.value) return null
    const item = list()[index]
    if (item === undefined) return null
    return {
      kind: 'item',
      key: itemKey(item),
      item,
      index,
      pinned: true,
    }
  })

  /**
   * Every rendered row, in document order, as a single keyed sequence: an item
   * that crosses the placeholder or gets pinned keeps its element that way, and
   * remounting the dragged one would end the drag.
   *
   * Every `index` is a position in the whole list, whatever slot the row happens
   * to be rendered in, which is what the placeholder holding one does not change.
   */
  const rows = computed<DragRow<T>[]>(() => {
    const items = list()
    const rendered = placeholderRendered.value
    const placeholderAt = placeholderIndex()
    const out: DragRow<T>[] = []
    for (let index = renderStart.value; index < renderEnd.value; index++) {
      if (rendered && index === placeholderAt) out.push(placeholderRow())
      const item = items[index] as T
      out.push({ kind: 'item', key: itemKey(item), item, index })
    }
    // the window may end above the insertion index, or right on it
    if (rendered && placeholderAt >= renderEnd.value) out.push(placeholderRow())
    if (pinnedRow.value) out.push(pinnedRow.value)
    return out
  })

  /** which window the rows belong to, see above */
  const windowKey = computed(() => `${renderStart.value}:${renderEnd.value}`)

  return {
    rows,
    placeholderRendered,
    isWindowed,
    renderStart,
    renderEnd,
    windowKey,
  }
}
