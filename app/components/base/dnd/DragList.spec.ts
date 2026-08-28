import type { DOMWrapper } from '@vue/test-utils'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useDnDStore } from '~/stores/dnd'
import DragItem from './DragItem.vue'
import DragList from './DragList.vue'
import { createScroller } from './utils'

describe('dragList.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // the placeholder slot is always given, only `reorder` decides whether the
  // list previews the landing spot or shifts its items right away
  function mountList(props: Record<string, any>, options: Record<string, any> = {}) {
    return mount(DragList, {
      // spread props hide `list` from the checker, which cannot see a generic
      // component's required props behind a Record
      props: { transfer: 'cut', group: 'todo', ...props } as any,
      slots: {
        default: '<span>{{ params.item }}:{{ params.index }}</span>',
        placeholder: '<span>gap origin:{{ params.origin }} value:{{ params.data.value }}</span>',
      },
      ...options,
    })
  }

  /** dragover is throttled, so a move inside a row needs the window to pass */
  const nextMove = () => new Promise(resolve => setTimeout(resolve, 15))

  /**
   * The landing spot is read from the cursor against the middle of the row it
   * hovers, and rows have no layout in this DOM. Gives that row a box and returns
   * a point on the half named: `before` lands the gap above the row, `after`
   * below it. Spread into the event that reads it.
   */
  function hover(row: DOMWrapper<Element>, half: 'before' | 'after') {
    const box = { top: 100, height: 40, bottom: 140, left: 0, width: 200, right: 200 }
    row.element.getBoundingClientRect = () => box as DOMRect
    return { clientX: 100, clientY: half === 'before' ? 110 : 130 }
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

    // in the body, not under the item: it follows the cursor in viewport
    // coordinates, which a transform on any ancestor would redefine
    const dragImage = document.body.querySelector('.drag-image')
    expect(dragImage?.textContent).toBe('ghost')
    expect(wrapper.element.contains(dragImage)).toBe(false)
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
    expect(store.draggingPayload).toEqual({ index: 1, value: 'b2' })
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
    // past the middle of c, so the gap sits between c and d
    const target = wrapper.get('[data-index="2"]')
    await target.trigger('dragenter', hover(target, 'after'))
    await wrapper.trigger('drop')

    // dropped between c and d. Swapping would give c, b, a, d
    expect(list).toEqual(['b', 'c', 'a', 'd'])
  })

  it('retires the gap in the same update as the move it previewed', async () => {
    const list = ['a', 'b', 'c', 'd']
    const wrapper = mountList({ list, reorder: 'placeholder' })

    // the last row up to the front, so the gap sits above where it lands
    await wrapper.findAll('.drag-container')[3]!.trigger('dragstart')
    const target = wrapper.get('[data-index="0"]')
    await target.trigger('dragenter', hover(target, 'before'))
    expect(wrapper.find('.drag-placeholder').exists()).toBe(true)

    await wrapper.trigger('drop')

    // gone with the drop, not with the dragend after it: a gap above the landing
    // spot shifts every row again on its way out, and that second update
    // force-finishes the moves the drop started, so the rows snap
    expect(list).toEqual(['d', 'a', 'b', 'c'])
    expect(wrapper.find('.drag-placeholder').exists()).toBe(false)
  })

  it('reads the landing spot from the half of the row under the cursor', async () => {
    const list = ['a', 'b', 'c', 'd']
    const wrapper = mountList({ list, reorder: 'placeholder' })
    const slots = () =>
      wrapper
        .findAll('.drag-container')
        .map(row =>
          row.classes('drag-placeholder') ? '[gap]' : row.text().slice(0, 1),
        )

    await wrapper.findAll('.drag-container')[3]!.trigger('dragstart')

    // upwards onto b: its leading half lands above it, no need to reach a
    const b = wrapper.get('[data-index="1"]')
    await b.trigger('dragenter', hover(b, 'before'))
    expect(slots()).toEqual(['a', '[gap]', 'b', 'c', 'd'])

    // the same row, past its middle: the gap moves to its other side
    await b.trigger('dragover', hover(b, 'after'))
    await nextMove()
    expect(slots()).toEqual(['a', 'b', '[gap]', 'c', 'd'])

    // and the leading half of the first row is the top of the list, which has
    // no row above it to enter
    const a = wrapper.get('[data-index="0"]')
    await a.trigger('dragover', hover(a, 'before'))
    await nextMove()
    expect(slots()).toEqual(['[gap]', 'a', 'b', 'c', 'd'])
  })

  it('reads the spot along x when its own layout runs that way', async () => {
    // the layout is what the platform resolves it to, and this DOM resolves
    // nothing: no stylesheets, and an unknown tag for the stubbed root
    const flexRow = vi
      .spyOn(window, 'getComputedStyle')
      .mockReturnValue({
        display: 'inline-flex',
        flexDirection: 'row',
      } as CSSStyleDeclaration)

    const list = ['a', 'b', 'c', 'd']
    const wrapper = mountList({ list, reorder: 'placeholder' })
    const slots = () =>
      wrapper
        .findAll('.drag-container')
        .map(row =>
          row.classes('drag-placeholder') ? '[gap]' : row.text().slice(0, 1),
        )

    // the first row, so neither half of the third is its own spot
    await wrapper.findAll('.drag-container')[0]!.trigger('dragstart')
    const c = wrapper.get('[data-index="2"]')
    // the same box, read on the other axis: x decides, y is beside the point
    c.element.getBoundingClientRect = () =>
      ({ top: 0, height: 200, bottom: 200, left: 100, width: 40, right: 140 }) as DOMRect

    await c.trigger('dragenter', { clientX: 110, clientY: 190 })
    expect(slots()).toEqual(['a', 'b', '[gap]', 'c', 'd'])

    await c.trigger('dragover', { clientX: 130, clientY: 10 })
    await nextMove()
    expect(slots()).toEqual(['a', 'b', 'c', '[gap]', 'd'])

    flexRow.mockRestore()
  })

  it('takes the axis from the prop when a layout implies none', async () => {
    const list = ['a', 'b', 'c', 'd']
    // a wrapping grid runs both ways, so only the consumer knows
    const wrapper = mountList({ list, reorder: 'placeholder', axis: 'horizontal' })

    await wrapper.findAll('.drag-container')[0]!.trigger('dragstart')
    const c = wrapper.get('[data-index="2"]')
    c.element.getBoundingClientRect = () =>
      ({ top: 0, height: 200, bottom: 200, left: 100, width: 40, right: 140 }) as DOMRect

    // past the middle on x, which a stacked reading would call before the row
    await c.trigger('dragenter', { clientX: 130, clientY: 10 })

    const gap = wrapper.findAll('.drag-container').findIndex(row =>
      row.classes('drag-placeholder'),
    )
    expect(gap).toBe(3)
  })

  it('leaves the spot alone over the gap itself', async () => {
    const list = ['a', 'b', 'c']
    const wrapper = mountList({ list, reorder: 'placeholder' })
    const slots = () =>
      wrapper
        .findAll('.drag-container')
        .map(row =>
          row.classes('drag-placeholder') ? '[gap]' : row.text().slice(0, 1),
        )

    await wrapper.findAll('.drag-container')[2]!.trigger('dragstart')
    const b = wrapper.get('[data-index="1"]')
    await b.trigger('dragenter', hover(b, 'before'))
    expect(slots()).toEqual(['a', '[gap]', 'b', 'c'])

    // the gap holds no position of its own to read one from, and chasing the gap
    // with the gap would never settle
    const gap = wrapper.get('.drag-placeholder')
    await gap.trigger('dragover', hover(gap, 'after'))
    await nextMove()

    expect(slots()).toEqual(['a', '[gap]', 'b', 'c'])
  })

  it('previews nothing while the spot is the one the item already holds', async () => {
    const list = ['a', 'b', 'c', 'd']
    const wrapper = mountList({ id: 'list-a', list, reorder: 'placeholder' })
    const gap = () => wrapper.find('.drag-placeholder').exists()

    const dragged = wrapper.get('[data-index="1"]')
    await dragged.trigger('dragstart')
    // a drag starts on the item's own spot: nothing to promise yet
    expect(gap()).toBe(false)

    // the slot above the row below it is that same spot
    const c = wrapper.get('[data-index="2"]')
    await c.trigger('dragenter', hover(c, 'before'))
    expect(gap()).toBe(false)

    // and so is the slot below the row above it
    const a = wrapper.get('[data-index="0"]')
    await a.trigger('dragover', hover(a, 'after'))
    await nextMove()
    expect(gap()).toBe(false)

    // one slot further along is a real move, and gets a gap
    await a.trigger('dragover', hover(a, 'before'))
    await nextMove()
    expect(gap()).toBe(true)

    // back onto its own row, both halves of which are its own spot
    await dragged.trigger('dragover', hover(dragged, 'after'))
    await nextMove()
    expect(gap()).toBe(false)

    // the drop is still this list's, it simply has nothing to move, and dragend
    // must not read it as an item some other list took over
    await wrapper.trigger('drop')
    await dragged.trigger('dragend')

    expect(list).toEqual(['a', 'b', 'c', 'd'])
    expect(wrapper.emitted('update:list')).toBeUndefined()
  })

  it('follows the cursor over a row still animating into its slot', async () => {
    const list = ['a', 'b', 'c', 'd']
    const wrapper = mountList({ list, reorder: 'placeholder' })
    const slots = () =>
      wrapper
        .findAll('.drag-container')
        .map(row =>
          row.classes('drag-placeholder') ? '[gap]' : row.text().slice(0, 1),
        )

    await wrapper.findAll('.drag-container')[3]!.trigger('dragstart')
    const b = wrapper.get('[data-index="1"]')
    await b.trigger('dragenter', hover(b, 'before'))
    expect(slots()).toEqual(['a', '[gap]', 'b', 'c', 'd'])

    // moving the gap sets every row it passed animating, and the row under the
    // cursor is one of them: a reading it refused would freeze the preview for
    // as long as the transition runs
    b.element.classList.add('drag-list--move')
    await b.trigger('dragover', hover(b, 'after'))
    await nextMove()

    expect(slots()).toEqual(['a', 'b', '[gap]', 'c', 'd'])
  })

  it('does not swap with a row that has not landed yet', async () => {
    const list = ['a', 'b', 'c', 'd']
    const wrapper = mountList({ id: 'list-a', list })
    const items = wrapper.findAll('.drag-container')

    await items[0]!.trigger('dragstart')
    // an immediate swap reads the row's position, and a row mid-transition is
    // not where it appears to be
    items[2]!.element.classList.add('drag-list--move')
    await items[2]!.trigger('dragenter')

    expect(list).toEqual(['a', 'b', 'c', 'd'])
  })

  it('ignores a DragItem a consumer nested inside a row', async () => {
    const store = useDnDStore()
    const list = ['a', 'b', 'c']
    const wrapper = mount(DragList, {
      props: { id: 'list-a', list, group: 'todo', transfer: 'cut' } as any,
      slots: {
        // a drag source of the consumer's own, inside the row. It reports to this
        // list all the same, and its payload happens to carry a position: the
        // shape of a payload must not pass it off as one of our rows
        default: `<DragItem :payload="{ value: 'nested', index: 0 }" group="todo">
          <span class="nested">{{ params.item }}</span>
        </DragItem>`,
        placeholder: '<span>gap</span>',
      },
      global: { components: { DragItem } },
    })

    const nested = wrapper.findAll('.nested')[2]!.element.parentElement!
    await nested.dispatchEvent(new Event('dragstart', { bubbles: true }))
    await wrapper.vm.$nextTick()

    // another list took the nested item over, and this one owns no part of it
    store.markDropped('list-b')
    nested.dispatchEvent(new Event('dragend', { bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(list).toEqual(['a', 'b', 'c'])
    expect(wrapper.emitted('update:list')).toBeUndefined()
  })

  it('keeps consumer indexes in list space while a placeholder holds a slot', async () => {
    const list = ['a', 'b', 'c']
    const wrapper = mountList({ id: 'list-a', list, reorder: 'placeholder' })

    await wrapper.findAll('.drag-container')[2]!.trigger('dragstart')
    // the leading half of the first row, so the gap takes the slot above it
    const first = wrapper.get('[data-index="0"]')
    await first.trigger('dragenter', hover(first, 'before'))

    // the gap holds the first row, and every index below it is untouched
    expect(wrapper.findAll('.drag-container')[0]!.classes()).toContain(
      'drag-placeholder',
    )
    const items = wrapper
      .findAll('.drag-container')
      .filter(item => !item.classes('drag-placeholder'))
    expect(items.map(item => item.text())).toEqual(['a:0', 'b:1', 'c:2'])
    expect(items.map(item => item.attributes('data-index'))).toEqual([
      '0',
      '1',
      '2',
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
    // past the middle of the last row of the target, so it lands after it
    const last = target.get('[data-index="1"]')
    await last.trigger('dragenter', hover(last, 'after'))
    await target.trigger('drop')
    await item.trigger('dragend')

    expect(to).toEqual(['b1', 'b2', 'a1'])
    expect(from).toEqual([])
  })

  it('takes a drag over its own background, past the last row', async () => {
    const from = ['a1']
    const to = ['b1', 'b2']
    const source = mountList({ id: 'list-a', list: from })
    const target = mountList({ id: 'list-b', list: to })

    const item = source.findAll('.drag-container')[0]!
    await item.trigger('dragstart')
    // the list root, not one of its rows: the space below the last one
    await target.trigger('dragenter')

    // nothing of this list is under the cursor, so the row lands at the end
    expect(target.findAll('.drag-container').at(-1)!.classes()).toContain(
      'drag-placeholder',
    )
    await target.trigger('drop')
    await item.trigger('dragend')

    expect(to).toEqual(['b1', 'b2', 'a1'])
    expect(from).toEqual([])
  })

  it('takes a drag over an empty list, which is all background', async () => {
    const from = ['a1']
    const to: string[] = []
    const source = mountList({ id: 'list-a', list: from })
    const target = mountList({ id: 'list-b', list: to })

    const item = source.findAll('.drag-container')[0]!
    await item.trigger('dragstart')
    await target.trigger('dragenter')

    expect(target.find('.drag-placeholder').exists()).toBe(true)
    await target.trigger('drop')
    await item.trigger('dragend')

    expect(to).toEqual(['a1'])
    expect(from).toEqual([])
  })

  it('still has a payload for the placeholder once the session ends', async () => {
    const store = useDnDStore()
    const wrapper = mount(DragList, {
      props: { list: ['a', 'b', 'c'], group: 'todo', reorder: 'placeholder' },
      slots: {
        default: '<span>{{ params.item }}</span>',
        // `?.` so a missing payload shows up as a value, not as a render crash
        placeholder: '<span>gap {{ params.data?.value ?? "MISSING" }}</span>',
      },
    })

    await wrapper.findAll('.drag-container')[0]!.trigger('dragstart')
    // two slots down, so the gap is a move and not the item's own spot
    await wrapper.get('[data-index="2"]').trigger('dragenter')
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
    const last = target.get('[data-index="1"]')
    await last.trigger('dragenter', hover(last, 'after'))
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
      expect(items.map(item => item.attributes('data-index'))).toEqual([
        '2',
        '3',
        '4',
      ])
    })

    // a windowed list has no transition-group and plays the moves itself, see
    // useRowMoves. Only these two tell the update it plays from the one it must
    // not: happy-dom lays nothing out, so a row's box comes from where it sits
    // among its siblings
    describe('playing the moves itself', () => {
      let animate: ReturnType<typeof vi.fn>
      // happy-dom has no `animate`, so it is put there rather than spied on,
      // which also means putting it back: a stubbed prototype leaks into every
      // test that follows
      const hadAnimate = 'animate' in Element.prototype
      const original = Element.prototype.animate

      beforeEach(() => {
        animate = vi.fn(() => ({ finished: Promise.resolve(), cancel: () => {} }))
        Element.prototype.animate = animate as never
      })

      afterEach(() => {
        if (hadAnimate) Element.prototype.animate = original
        else delete (Element.prototype as { animate?: unknown }).animate
      })

      function mountMeasured(props: Record<string, any>) {
        const wrapper = mountList(props)
        const root = wrapper.element
        root.getBoundingClientRect = () => ({ top: 0, left: 0 }) as DOMRect
        for (const child of [...root.children]) {
          const row = child as HTMLElement
          row.getBoundingClientRect = () =>
            ({
              top: [...root.children].indexOf(row) * 10,
              left: 0,
            }) as DOMRect
        }
        return wrapper
      }

      it('slides the rows through a reorder', async () => {
        const wrapper = mountMeasured({
          list: ['a', 'b', 'c'],
          visible: { offset: 0, count: 3 },
        })

        // the same window, so the update reordered rather than scrolled
        await wrapper.setProps({ list: ['c', 'a', 'b'] } as any)

        expect(animate).toHaveBeenCalled()
        const [frames] = animate.mock.calls[0]!
        expect(frames[0].transform).toMatch(/^translate\(/)
      })

      it('leaves an update handing over the same rows alone', async () => {
        const wrapper = mountMeasured({
          list: ['a', 'b', 'c'],
          visible: { offset: 0, count: 3 },
        })

        // the window it already renders, handed over again: a virtualizer does
        // this on every scroll step it takes inside one window, and a move in
        // flight must be left to finish rather than restarted from where it got
        await wrapper.setProps({ visible: { offset: 0, count: 3 } } as any)

        expect(animate).not.toHaveBeenCalled()
      })

      it('leaves a scroll step alone', async () => {
        const wrapper = mountMeasured({
          list: letters(),
          visible: { offset: 0, count: 3 },
        })

        // the virtualizer handing over a different set of rows
        await wrapper.setProps({ visible: { offset: 1, count: 3 } } as any)

        expect(animate).not.toHaveBeenCalled()
      })
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

      expect(store.draggingPayload).toEqual({ index: 4, value: 'e' })
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

      const target = wrapper.get('[data-index="6"]')
      await target.trigger('dragenter', hover(target, 'before'))
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
      // past the middle of the last rendered row, so the gap follows it
      const target = wrapper.get('[data-index="5"]')
      await target.trigger('dragenter', hover(target, 'after'))

      expect(wrapper.get('.drag-placeholder').text()).toContain('origin:self')
      // the window renders its own slice, in positions of the whole list, and
      // the gap sitting among them changes none of them
      const rows = wrapper.findAll('.drag-container')
      expect(rows.at(-1)!.classes()).toContain('drag-placeholder')
      const items = rows.filter(row => !row.classes('drag-placeholder'))
      expect(items.map(row => row.text())).toEqual(['d:3', 'e:4', 'f:5'])
      expect(items.map(row => row.attributes('data-index'))).toEqual([
        '3',
        '4',
        '5',
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

  /**
   * The gap coming and going changes how tall the list is, and a container
   * scrolled to its end answers that by scrolling to hold its anchor still,
   * which slides the rows across the cursor. So a drag turns anchoring off for
   * as long as it runs, see `suspendScrollAnchoring`.
   */
  describe('scroll anchoring', () => {
    /** a list in a container that scrolls it, which is what carries anchoring */
    function mountInScroller(props: Record<string, any>) {
      const scroller = createScroller()
      const wrapper = mountList(props, { attachTo: scroller })
      return { scroller, wrapper }
    }

    afterEach(() => {
      document.body.innerHTML = ''
    })

    it('stops the container anchoring while a drag of its own runs', async () => {
      const { scroller, wrapper } = mountInScroller({ list: ['a', 'b'] })
      const row = wrapper.findAll('.drag-container')[0]!
      expect(scroller.style.overflowAnchor).toBe('')

      await row.trigger('dragstart')
      expect(scroller.style.overflowAnchor).toBe('none')

      await row.trigger('dragend')
      expect(scroller.style.overflowAnchor).toBe('')
    })

    it('stops it for an item arriving from somewhere else', async () => {
      const store = useDnDStore()
      const { scroller, wrapper } = mountInScroller({
        list: ['a', 'b'],
        reorder: 'placeholder',
      })
      store.startDrag({
        itemId: 'item-elsewhere',
        sourceListId: 'list-elsewhere',
        group: 'todo',
        payload: { value: 'x' },
        el: null,
      })

      await wrapper.findAll('.drag-container')[0]!.trigger('dragenter')
      expect(scroller.style.overflowAnchor).toBe('none')

      document.dispatchEvent(new Event('dragend'))
      await nextMove()
      expect(scroller.style.overflowAnchor).toBe('')
    })

    it('hands the container back when the list goes mid-drag', async () => {
      const { scroller, wrapper } = mountInScroller({ list: ['a', 'b'] })

      await wrapper.findAll('.drag-container')[0]!.trigger('dragstart')
      expect(scroller.style.overflowAnchor).toBe('none')

      // the drag never ends here: the list is gone before its `dragend`, and
      // the container it borrowed outlives it
      wrapper.unmount()
      expect(scroller.style.overflowAnchor).toBe('')
    })
  })
})
