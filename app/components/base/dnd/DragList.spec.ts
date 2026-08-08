import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useDnDStore } from '~/stores/dnd'
import DragItem from './DragItem.vue'
import DragList from './DragList.vue'

describe('dragList.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // the placeholder slot is always given, only `reorder` decides whether the
  // list previews the landing spot or shifts its items right away
  function mountList(props: Record<string, any>) {
    return mount(DragList, {
      // spread props hide `list` from the checker, which cannot see a generic
      // component's required props behind a Record
      props: { transfer: 'cut', group: 'todo', ...props } as any,
      slots: {
        default: '<span>{{ params.item }}:{{ params.index }}</span>',
        placeholder: '<span>gap origin:{{ params.origin }} value:{{ params.data.value }}</span>',
      },
    })
  }

  it('registers every mounted list under its own id', () => {
    const store = useDnDStore()
    const first = mountList({ id: 'list-a', list: ['a1', 'a2'] })
    const second = mountList({ id: 'list-b', list: ['b1'] })
    const other = mountList({ id: 'list-c', list: [], group: 'other' })

    expect(store.listIds).toEqual(['list-a', 'list-b', 'list-c'])
    expect(store.getGroupLists('todo').map(list => list.id)).toEqual([
      'list-a',
      'list-b',
    ])

    second.unmount()
    expect(store.listIds).toEqual(['list-a', 'list-c'])

    first.unmount()
    other.unmount()
    expect(store.listIds).toEqual([])
  })

  it('keeps a single element root, every list event is bound to it', () => {
    const wrapper = mountList({ list: ['a1'] })

    // a stray root-level node (a comment counts in dev) turns the component
    // into a fragment, and drop/dragleave/dragover stop being reachable
    expect(wrapper.element.nodeType).toBe(1)
    expect(wrapper.classes()).toContain('drag-list')
  })

  it('hands the drag-image slot to the items and keeps the placeholder', async () => {
    const wrapper = mount(DragList, {
      props: { list: ['a1'] },
      slots: {
        'default': '<span>{{ params.item }}</span>',
        'placeholder': '<span>gap</span>',
        'drag-image': '<span>ghost</span>',
      },
    })

    await wrapper.findAll('.drag-container')[0]!.trigger('dragstart')
    await wrapper.vm.$nextTick()

    expect(wrapper.get('.drag-image').text()).toBe('ghost')
    // the placeholder is the list's own slot, the item never renders it
    expect(wrapper.get('.drag-container').text()).not.toContain('gap')
  })

  it('generates an id when none is given', () => {
    const store = useDnDStore()
    mountList({ list: ['a1'] })
    mountList({ list: ['b1'] })

    const [firstId, secondId] = store.listIds
    expect(firstId).toBeTruthy()
    expect(secondId).toBeTruthy()
    expect(firstId).not.toBe(secondId)
  })

  it('reports the source list of the dragging item', async () => {
    const store = useDnDStore()
    mountList({ id: 'list-a', list: ['a1', 'a2'] })
    const wrapper = mountList({ id: 'list-b', list: ['b1', 'b2'] })

    await wrapper.findAll('.drag-container')[1]!.trigger('dragstart')

    expect(store.isDragging).toBe(true)
    expect(store.isDraggingFrom('list-b')).toBe(true)
    expect(store.isDraggingFrom('list-a')).toBe(false)
    // index is the position in `list`, slotIndex counts the placeholder's slot
    expect(store.draggingPayload).toEqual({
      index: 1,
      slotIndex: 1,
      value: 'b2',
    })
  })

  it('cuts the dragged item when another list took it over', async () => {
    const store = useDnDStore()
    const wrapper = mountList({ id: 'list-a', list: ['a1', 'a2', 'a3'] })
    const item = wrapper.findAll('.drag-container')[0]!

    await item.trigger('dragstart')
    // list-b received the item, then the drag ends on the source list
    store.markDropped('list-b')
    await item.trigger('dragend')

    expect(wrapper.props('list')).toEqual(['a2', 'a3'])
    expect(wrapper.emitted('update:list')).toHaveLength(1)
  })

  it('keeps the dragged item when the drop was refused', async () => {
    const wrapper = mountList({ id: 'list-a', list: ['a1', 'a2'] })
    const item = wrapper.findAll('.drag-container')[0]!

    await item.trigger('dragstart')
    await item.trigger('dragend')

    expect(wrapper.props('list')).toEqual(['a1', 'a2'])
    expect(wrapper.emitted('update:list')).toBeUndefined()
  })

  it('shifts the items in between when moving on dragenter', async () => {
    const list = ['a', 'b', 'c', 'd']
    const wrapper = mountList({ id: 'list-a', list })
    const items = wrapper.findAll('.drag-container')

    await items[0]!.trigger('dragstart')
    await items[2]!.trigger('dragenter')

    // a moved to index 2, b and c shifted up. Swapping would give c, b, a, d
    expect(list).toEqual(['b', 'c', 'a', 'd'])
  })

  it('restores the original order when the item is dragged out', async () => {
    const list = ['a', 'b', 'c', 'd']
    const wrapper = mountList({ id: 'list-a', list })

    await wrapper.findAll('.drag-container')[0]!.trigger('dragstart')
    // two hops, a single one is its own inverse and would restore either way
    await wrapper.findAll('.drag-container')[1]!.trigger('dragenter')
    expect(list).toEqual(['b', 'a', 'c', 'd'])
    await wrapper.findAll('.drag-container')[2]!.trigger('dragenter')
    expect(list).toEqual(['b', 'c', 'a', 'd'])

    await wrapper.trigger('dragleave', { relatedTarget: document.body })

    expect(list).toEqual(['a', 'b', 'c', 'd'])
  })

  it('moves the item to the placeholder position on drop', async () => {
    const list = ['a', 'b', 'c', 'd']
    const wrapper = mountList({
      id: 'list-a',
      list,
      reorder: 'placeholder',
    })

    await wrapper.findAll('.drag-container')[0]!.trigger('dragstart')
    // the list only renders the placeholder once it is being dragged over
    await wrapper.findAll('.drag-container')[3]!.trigger('dragenter')
    // slot indexes shift by one while the placeholder holds a slot: this is
    // list[2], rendered in slot 3
    const target = wrapper.get('[data-slot-index="3"]')
    // dragover tracks which element the item entered from
    await target.trigger('dragover')
    await target.trigger('dragenter')
    await wrapper.trigger('drop')

    // dropped between c and d. Swapping would give c, b, a, d
    expect(list).toEqual(['b', 'c', 'a', 'd'])
  })

  it('keeps consumer indexes in list space while a placeholder holds a slot', async () => {
    const list = ['a', 'b', 'c']
    const wrapper = mountList({ id: 'list-a', list, reorder: 'placeholder' })

    await wrapper.findAll('.drag-container')[0]!.trigger('dragstart')
    await wrapper.findAll('.drag-container')[2]!.trigger('dragenter')

    const items = wrapper
      .findAll('.drag-container')
      .filter(item => !item.classes('drag-placeholder'))
    // the placeholder holds the first slot, so slots run 1..3 while the indexes
    // handed to the slot stay 0..2
    expect(items.map(item => item.text())).toEqual(['a:0', 'b:1', 'c:2'])
    expect(items.map(item => item.attributes('data-slot-index'))).toEqual([
      '1',
      '2',
      '3',
    ])
  })

  it('ignores transitions of the consumer content when restoring on drag out', async () => {
    const list = ['a', 'b', 'c', 'd']
    const wrapper = mountList({ id: 'list-a', list })

    await wrapper.findAll('.drag-container')[0]!.trigger('dragstart')
    await wrapper.findAll('.drag-container')[1]!.trigger('dragenter')
    expect(list).toEqual(['b', 'a', 'c', 'd'])

    // a hover transition inside an item must not read as the list's move
    // transition, which would block the restore below
    await wrapper
      .findAll('.drag-container')[0]!
      .get('span')
      .trigger('transitionstart', { propertyName: 'background-color' })
    await wrapper.trigger('dragleave', { relatedTarget: document.body })

    expect(list).toEqual(['a', 'b', 'c', 'd'])
  })

  it('previews an incoming item as origin "other", whatever the reorder mode', async () => {
    // both lists reorder immediately, an item of another list still needs the
    // placeholder because it is not part of this list yet
    const source = mountList({ id: 'list-a', list: ['a1'] })
    const target = mountList({ id: 'list-b', list: ['b1', 'b2'] })

    await source.findAll('.drag-container')[0]!.trigger('dragstart')
    await target.findAll('.drag-container')[0]!.trigger('dragenter')

    expect(target.html()).toContain('origin:other')
    expect(target.html()).toContain('value:a1')
    // the source list previews nothing, it is not being dragged over
    expect(source.html()).not.toContain('gap origin')
  })

  it('inserts an item of another list and cuts it from the source', async () => {
    const from = ['a1']
    const to = ['b1', 'b2']
    const source = mountList({ id: 'list-a', list: from })
    const target = mountList({ id: 'list-b', list: to })

    const item = source.findAll('.drag-container')[0]!
    await item.trigger('dragstart')
    await target.findAll('.drag-container')[0]!.trigger('dragenter')
    await target.trigger('drop')
    await item.trigger('dragend')

    expect(to).toEqual(['b1', 'b2', 'a1'])
    expect(from).toEqual([])
  })

  it('still has a payload for the placeholder once the session ends', async () => {
    const store = useDnDStore()
    const wrapper = mount(DragList, {
      props: { list: ['a', 'b'], group: 'todo', reorder: 'placeholder' },
      slots: {
        default: '<span>{{ params.item }}</span>',
        // `?.` so a missing payload shows up as a value, not as a render crash
        placeholder: '<span>gap {{ params.data?.value ?? "MISSING" }}</span>',
      },
    })

    await wrapper.findAll('.drag-container')[0]!.trigger('dragstart')
    await wrapper.findAll('.drag-container')[1]!.trigger('dragenter')
    expect(wrapper.html()).toContain('gap a')

    // the dragged item's dragend clears the session, and a flush can land before
    // this list's own dragend hides the placeholder
    store.endDrag()
    await wrapper.vm.$nextTick()

    expect(wrapper.html()).toContain('gap a')
  })

  it('accepts a standalone DragItem, which carries no list position', async () => {
    const to = ['b1', 'b2']
    const target = mountList({ id: 'list-b', list: to })
    const loose = mount(DragItem, {
      props: { group: 'todo', payload: { value: 'x' } },
      slots: { default: 'x' },
    })

    await loose.trigger('dragstart')
    await target.findAll('.drag-container')[0]!.trigger('dragenter')
    await target.trigger('drop')

    expect(to).toEqual(['b1', 'b2', 'x'])
  })

  it('previews nothing for a payload it could not insert', async () => {
    const to = ['b1', 'b2']
    const target = mountList({ id: 'list-b', list: to })
    // a DragItem payload is any object, `value` is what a list inserts and the
    // checker cannot demand it. Without one there is nothing to preview
    const loose = mount(DragItem, {
      props: { group: 'todo', payload: { id: 1 } },
      slots: { default: 'x' },
    })

    await loose.trigger('dragstart')
    await target.findAll('.drag-container')[0]!.trigger('dragenter')

    expect(target.find('.drag-placeholder').exists()).toBe(false)
    await target.trigger('drop')
    expect(to).toEqual(['b1', 'b2'])
  })

  it('warns when placeholder mode has no slot to render', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    mount(DragList, {
      props: { list: ['a1'], reorder: 'placeholder' },
      slots: { default: '<span>{{ params.item }}</span>' },
    })

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('#placeholder slot'),
    )
  })

  // a virtualizer renders a window of the list and owns the scrolling, the list
  // still holds every item so indexes stay positions in the whole list
  describe('windowed by a virtualizer', () => {
    function letters() {
      return ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']
    }

    it('renders the window only, in whole-list indexes', () => {
      const wrapper = mountList({
        list: letters(),
        visible: { offset: 2, count: 3 },
      })
      const items = wrapper.findAll('.drag-container')

      expect(items.map(item => item.text())).toEqual(['c:2', 'd:3', 'e:4'])
      expect(items.map(item => item.attributes('data-slot-index'))).toEqual([
        '2',
        '3',
        '4',
      ])
    })

    it('clamps a window reaching past the end of the list', () => {
      const wrapper = mountList({
        list: ['a', 'b'],
        visible: { offset: 1, count: 5 },
      })

      expect(wrapper.findAll('.drag-container').map(i => i.text())).toEqual([
        'b:1',
      ])
    })

    it('reports the position in the whole list when a drag starts', async () => {
      const store = useDnDStore()
      const wrapper = mountList({
        list: letters(),
        visible: { offset: 4, count: 2 },
      })

      await wrapper.findAll('.drag-container')[0]!.trigger('dragstart')

      expect(store.draggingPayload).toEqual({ index: 4, slotIndex: 4, value: 'e' })
    })

    it('keeps the dragged item mounted once it scrolls out of the window', async () => {
      const wrapper = mountList({
        list: letters(),
        visible: { offset: 0, count: 3 },
        reorder: 'placeholder',
      })
      const item = wrapper.findAll('.drag-container')[0]!
      const element = item.element

      await item.trigger('dragstart')
      // the window scrolled past the dragged item
      await wrapper.setProps({ visible: { offset: 5, count: 3 } } as any)

      const pinned = wrapper.get('.drag-list__pinned')
      // the very same element: remounting the source ends the native drag, and
      // no dragend would be left to clean up after it
      expect(pinned.element).toBe(element)
      expect(pinned.text()).toContain('a:0')
      // it holds no room among the rendered rows
      expect(
        wrapper
          .findAll('.drag-container')
          .filter(row => !row.classes('drag-list__pinned'))
          .map(row => row.text()),
      ).toEqual(['f:5', 'g:6', 'h:7'])
    })

    it('drops across the part of the list that is not rendered', async () => {
      const list = letters()
      const wrapper = mountList({
        list,
        visible: { offset: 0, count: 3 },
        reorder: 'placeholder',
      })
      const item = wrapper.findAll('.drag-container')[0]!

      await item.trigger('dragstart')
      await wrapper.setProps({ visible: { offset: 5, count: 3 } } as any)
      // the insertion index is still the dragged item's own, which is out of the
      // window: nothing to preview until the item is dragged over a rendered row
      expect(wrapper.find('.drag-placeholder').exists()).toBe(false)

      const target = wrapper.get('[data-slot-index="6"]')
      await target.trigger('dragover')
      await target.trigger('dragenter')
      await wrapper.trigger('drop')

      // between f and g, where the placeholder was
      expect(list).toEqual(['b', 'c', 'd', 'e', 'f', 'a', 'g', 'h', 'i', 'j'])
    })

    it('previews the landing spot inside the window', async () => {
      const wrapper = mountList({
        list: letters(),
        visible: { offset: 3, count: 3 },
        reorder: 'placeholder',
      })

      await wrapper.findAll('.drag-container')[0]!.trigger('dragstart')
      const target = wrapper.findAll('.drag-container')[2]!
      // dragover tracks which element the item entered from
      await target.trigger('dragover')
      await target.trigger('dragenter')

      expect(wrapper.get('.drag-placeholder').text()).toContain('origin:self')
      // the placeholder holds slot 6, so the rows below it shift by one slot
      // while their indexes stay positions in the whole list
      const items = wrapper
        .findAll('.drag-container')
        .filter(row => !row.classes('drag-placeholder'))
      expect(items.map(row => row.text())).toEqual(['d:3', 'e:4', 'f:5'])
      expect(items.map(row => row.attributes('data-slot-index'))).toEqual([
        '3',
        '4',
        '6',
      ])
    })
  })

  it('leaves the list alone in copy mode', async () => {
    const store = useDnDStore()
    const wrapper = mountList({
      id: 'list-a',
      list: ['a1', 'a2'],
      transfer: 'copy',
    })
    const item = wrapper.findAll('.drag-container')[0]!

    await item.trigger('dragstart')
    store.markDropped('list-b')
    await item.trigger('dragend')

    expect(wrapper.props('list')).toEqual(['a1', 'a2'])
  })
})
