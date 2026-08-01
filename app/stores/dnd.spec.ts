import { createPinia, setActivePinia } from 'pinia'
import { useDnDStore } from './dnd'

describe('dnd store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('keeps one entry per registered list', () => {
    const store = useDnDStore()
    store.registerList({ id: 'a', group: 'todo' })
    store.registerList({ id: 'b', group: 'todo' })
    store.registerList({ id: 'c', group: 'other' })

    expect(store.listIds).toEqual(['a', 'b', 'c'])
    expect(store.getGroupLists('todo').map(list => list.id)).toEqual(['a', 'b'])
    expect(store.getList('b')?.group).toBe('todo')

    store.unregisterList('b')
    expect(store.getList('b')).toBeUndefined()
    expect(store.listIds).toEqual(['a', 'c'])
  })

  it('re-registering a list updates its group', () => {
    const store = useDnDStore()
    store.registerList({ id: 'a', group: 'todo' })
    store.registerList({ id: 'a', group: 'done' })

    expect(store.listIds).toEqual(['a'])
    expect(store.getList('a')?.group).toBe('done')
  })

  it('exposes the dragging item only while a drag runs', () => {
    const store = useDnDStore()
    expect(store.isDragging).toBe(false)

    store.startDrag({
      itemId: 'item-1',
      sourceListId: 'a',
      group: 'todo',
      payload: { index: 0, value: 'x' },
      el: null,
    })

    expect(store.isDragging).toBe(true)
    expect(store.draggingPayload).toEqual({ index: 0, value: 'x' })
    expect(store.draggingGroup).toBe('todo')
    expect(store.isGroupActive('todo')).toBe(true)
    expect(store.isGroupActive('other')).toBe(false)
    expect(store.isDraggingFrom('a')).toBe(true)
    expect(store.isDraggingFrom('b')).toBe(false)

    store.endDrag()
    expect(store.isDragging).toBe(false)
    expect(store.draggingPayload).toBeNull()
    expect(store.isGroupActive('todo')).toBe(false)
  })

  it('tells the source list whether the item landed somewhere else', () => {
    const store = useDnDStore()
    store.startDrag({
      itemId: 'item-1',
      sourceListId: 'a',
      group: 'todo',
      payload: { index: 0, value: 'x' },
      el: null,
    })

    // dropped on an item of list b, then handled by list b itself
    store.markDropped('item-2')
    store.markDropped('b')
    store.endDrag()

    expect(store.session?.dropTargetIds).toEqual(['item-2', 'b'])
    expect(store.hasDropTarget('b')).toBe(true)
    // list a must cut its item, list b must keep the one it received
    expect(store.droppedOutside('a')).toBe(true)
    expect(store.droppedOutside('b')).toBe(false)
  })

  it('does not cut the item when the drop was refused', () => {
    const store = useDnDStore()
    store.startDrag({
      itemId: 'item-1',
      sourceListId: 'a',
      group: 'todo',
      payload: { index: 0, value: 'x' },
      el: null,
    })

    store.markDropped('item-2')
    // the list under the item refused the drop position
    store.markDropFailed()
    store.endDrag()

    expect(store.droppedOutside('a')).toBe(false)
  })

  it('records a move handled without a drop', () => {
    const store = useDnDStore()
    store.startDrag({
      itemId: 'item-1',
      sourceListId: 'a',
      group: 'todo',
      payload: { index: 0, value: 'x' },
      el: null,
    })

    store.addDropTarget('a')
    store.addDropTarget('a')

    expect(store.session?.dropTargetIds).toEqual(['a'])
    // moving inside the list must not count as a successful drop on its own
    expect(store.session?.success).toBe(false)
    expect(store.droppedOutside('a')).toBe(false)
  })
})
