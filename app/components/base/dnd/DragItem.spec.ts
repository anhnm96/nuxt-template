import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useDnDStore } from '~/stores/dnd'
import DragItem from './DragItem.vue'

describe('dragItem.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('locks dragging back when the button is released away from the handle', async () => {
    const wrapper = mount(DragItem, {
      props: { handle: '.handle' },
      slots: { default: '<button class="handle">::</button>' },
    })
    expect(wrapper.attributes('draggable')).toBe('false')

    await wrapper.get('.handle').trigger('mousedown')
    expect(wrapper.attributes('draggable')).toBe('true')

    // released somewhere else: the item must not stay draggable from anywhere
    document.dispatchEvent(new MouseEvent('mouseup'))
    await wrapper.vm.$nextTick()
    expect(wrapper.attributes('draggable')).toBe('false')
  })

  it('stays draggable without a handle', () => {
    const wrapper = mount(DragItem, { slots: { default: 'x' } })
    expect(wrapper.attributes('draggable')).toBe('true')

    document.dispatchEvent(new MouseEvent('mouseup'))
    expect(wrapper.attributes('draggable')).toBe('true')
  })

  it('sets dropEffect while dragged over, where the spec honours it', async () => {
    const store = useDnDStore()
    const wrapper = mount(DragItem, {
      props: { dropEffect: 'copy' },
      slots: { default: 'x' },
    })
    store.startDrag({
      itemId: 'other-item',
      sourceListId: '',
      payload: { value: 1 },
      el: null,
    })

    // happy-dom has no DragEvent payload, shadow the readonly getter instead
    const event = new Event('dragover', { bubbles: true, cancelable: true })
    const dataTransfer = { dropEffect: 'none' }
    Object.defineProperty(event, 'dataTransfer', { value: dataTransfer })
    wrapper.element.dispatchEvent(event)
    await wrapper.vm.$nextTick()

    expect(dataTransfer.dropEffect).toBe('copy')
  })

  it('leaves dropEffect alone when it refuses the payload', async () => {
    const store = useDnDStore()
    const wrapper = mount(DragItem, {
      props: { dropEffect: 'copy', acceptData: () => false },
      slots: { default: 'x' },
    })
    store.startDrag({
      itemId: 'other-item',
      sourceListId: '',
      payload: { value: 1 },
      el: null,
    })

    const event = new Event('dragover', { bubbles: true, cancelable: true })
    const dataTransfer = { dropEffect: 'none' }
    Object.defineProperty(event, 'dataTransfer', { value: dataTransfer })
    wrapper.element.dispatchEvent(event)
    await wrapper.vm.$nextTick()

    expect(dataTransfer.dropEffect).toBe('none')
  })
})
