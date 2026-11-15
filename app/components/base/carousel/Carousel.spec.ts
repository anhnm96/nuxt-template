import { mount } from '@vue/test-utils'
import Carousel from './Carousel.vue'
import CarouselItem from './CarouselItem.vue'

const ITEM_WIDTH = 100
const CAROUSEL_WIDTH = 300

const realScrollTo = HTMLElement.prototype.scrollTo

// The test DOM has no layout: three items of 100px fit in a carousel of 300px.
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    () => ({ width: ITEM_WIDTH }) as DOMRect,
  )
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(CAROUSEL_WIDTH)
  // the items are the content of the element that scrolls
  Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
    configurable: true,
    get(this: HTMLElement) {
      return this.children.length * ITEM_WIDTH
    },
  })
  HTMLElement.prototype.scrollTo = function (this: HTMLElement, options?: ScrollToOptions | number) {
    this.scrollLeft = (options as ScrollToOptions).left ?? 0
  } as typeof HTMLElement.prototype.scrollTo
})

afterEach(() => {
  HTMLElement.prototype.scrollTo = realScrollTo
  delete (HTMLElement.prototype as { scrollWidth?: number }).scrollWidth
  vi.restoreAllMocks()
  vi.useRealTimers()
})

async function mountCarousel(props: Record<string, unknown> = {}, count = 7) {
  const wrapper = mount({
    components: { Carousel, CarouselItem },
    data: () => ({ count, props }),
    template: `
      <Carousel v-bind="props">
        <CarouselItem v-for="n in count" :key="n"><a href="#" class="link">{{ n }}</a></CarouselItem>
        <template #footer="{ activeIndex, hasPrev, hasNext, prev, next, scrollTo }">
          <output>{{ activeIndex }}|{{ hasPrev }}|{{ hasNext }}</output>
          <button class="prev" @click="prev()" />
          <button class="next" @click="next()" />
          <button class="far" @click="scrollTo(99)" />
        </template>
      </Carousel>`,
  }, { attachTo: document.body })
  await nextTick()
  await nextTick()
  return wrapper
}

function pointer(type: string, clientX: number, pointerType = 'mouse') {
  const event = new MouseEvent(type, { clientX, button: 0, buttons: type === 'pointerup' ? 0 : 1, bubbles: true })
  Object.defineProperty(event, 'pointerType', { value: pointerType })
  return event
}

describe('carousel.vue', () => {
  it('moves by the number of items that fit, and stops at the last position', async () => {
    const wrapper = await mountCarousel({ repeat: false })
    const state = wrapper.get('output')
    expect(state.text()).toBe('0|false|true')

    await wrapper.get('.next').trigger('click')
    expect(state.text()).toBe('3|true|true')
    // 7 items, 3 fit: the last position is 4
    await wrapper.get('.next').trigger('click')
    expect(state.text()).toBe('4|true|false')
    await wrapper.get('.next').trigger('click')
    expect(state.text()).toBe('4|true|false')
    expect(wrapper.get('.carousel').element.scrollLeft).toBe(4 * ITEM_WIDTH)
  })

  it('goes round with `repeat`', async () => {
    const wrapper = await mountCarousel()
    const state = wrapper.get('output')

    await wrapper.get('.prev').trigger('click')
    expect(state.text()).toBe('4|true|false')
    await wrapper.get('.next').trigger('click')
    expect(state.text()).toBe('0|false|true')
  })

  it('moves `itemsToScroll` items', async () => {
    const wrapper = await mountCarousel({ itemsToScroll: 1 })
    await wrapper.get('.next').trigger('click')
    expect(wrapper.get('output').text()).toBe('1|true|true')
  })

  it('limits `scrollTo` to the last position', async () => {
    const wrapper = await mountCarousel()
    await wrapper.get('.far').trigger('click')
    expect(wrapper.get('output').text()).toBe('4|true|false')
  })

  it('has a position that shows the last item when an item fits in part', async () => {
    // two items and a half fit: 7 items, 2 whole ones, so the last position is 5
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(250)
    const wrapper = await mountCarousel()
    await wrapper.get('.far').trigger('click')
    expect(wrapper.get('output').text()).toBe('5|true|false')
  })

  it('reads the index from the scroll position when a scroll stops', async () => {
    vi.useFakeTimers()
    const wrapper = await mountCarousel()
    const scroller = wrapper.get('.carousel').element

    scroller.scrollLeft = 190
    scroller.dispatchEvent(new Event('scroll'))
    vi.advanceTimersByTime(100)
    await nextTick()
    expect(wrapper.get('output').text()).toBe('2|true|true')
  })

  it('reads the end of the scroll as the last position', async () => {
    vi.useFakeTimers()
    // two items and a half fit: the last position is 5, at offset 450 and not 500
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(250)
    const wrapper = await mountCarousel()
    const scroller = wrapper.get('.carousel').element

    await wrapper.get('.far').trigger('click')
    expect(scroller.scrollLeft).toBe(450)
    scroller.dispatchEvent(new Event('scroll'))
    vi.advanceTimersByTime(100)
    await nextTick()
    expect(wrapper.get('output').text()).toBe('5|true|false')

    // a press that does not move stays at the end
    scroller.dispatchEvent(pointer('pointerdown', 200))
    window.dispatchEvent(pointer('pointerup', 200))
    await nextTick()
    expect(scroller.scrollLeft).toBe(450)
    expect(wrapper.get('output').text()).toBe('5|true|false')
  })

  it('puts snap back when the scroll after a drag stops', async () => {
    vi.useFakeTimers()
    const wrapper = await mountCarousel()
    const scroller = wrapper.get('.carousel')

    scroller.element.dispatchEvent(pointer('pointerdown', 200))
    await nextTick()
    expect(scroller.classes()).not.toContain('scroll-snap')
    window.dispatchEvent(pointer('pointermove', 160))
    window.dispatchEvent(pointer('pointerup', 160))
    scroller.element.dispatchEvent(new Event('scroll'))
    vi.advanceTimersByTime(100)
    await nextTick()
    expect(scroller.classes()).toContain('scroll-snap')
  })

  it('starts at `initialIndex`', async () => {
    const wrapper = await mountCarousel({ initialIndex: 2 })
    expect(wrapper.get('.carousel').element.scrollLeft).toBe(2 * ITEM_WIDTH)
  })

  it('brings the index back when items are removed', async () => {
    const wrapper = await mountCarousel({ initialIndex: 4 })
    await wrapper.setData({ count: 5 })
    await nextTick()
    // 5 items, 3 fit: the last position is 2
    expect(wrapper.get('output').text()).toBe('2|true|false')
  })

  it('goes to the next item after a drag of less than half an item', async () => {
    const wrapper = await mountCarousel()
    const scroller = wrapper.get('.carousel').element

    scroller.dispatchEvent(pointer('pointerdown', 200))
    window.dispatchEvent(pointer('pointermove', 160))
    expect(scroller.scrollLeft).toBe(40)
    window.dispatchEvent(pointer('pointerup', 160))
    await nextTick()

    expect(wrapper.get('output').text()).toBe('1|true|true')
  })

  it('does not drag with a touch', async () => {
    const wrapper = await mountCarousel()
    const scroller = wrapper.get('.carousel').element

    scroller.dispatchEvent(pointer('pointerdown', 200, 'touch'))
    window.dispatchEvent(pointer('pointermove', 160, 'touch'))
    expect(scroller.scrollLeft).toBe(0)
  })

  it('ignores the click that ends a drag, and no click after it', async () => {
    vi.useFakeTimers()
    const wrapper = await mountCarousel()
    const scroller = wrapper.get('.carousel').element
    const link = wrapper.get('.link')
    const clicked = vi.fn()
    link.element.addEventListener('click', clicked)

    scroller.dispatchEvent(pointer('pointerdown', 200))
    window.dispatchEvent(pointer('pointermove', 160))
    window.dispatchEvent(pointer('pointerup', 160))
    await link.trigger('click')
    expect(clicked).not.toHaveBeenCalled()

    // a drag that ends outside the carousel sends no click to it
    scroller.dispatchEvent(pointer('pointerdown', 200))
    window.dispatchEvent(pointer('pointermove', 160))
    window.dispatchEvent(pointer('pointerup', 160))
    vi.runAllTimers()
    await link.trigger('click')
    expect(clicked).toHaveBeenCalledTimes(1)
  })

  it('keeps the click of a press that does not move', async () => {
    const wrapper = await mountCarousel()
    const scroller = wrapper.get('.carousel').element
    const link = wrapper.get('.link')
    const clicked = vi.fn()
    link.element.addEventListener('click', clicked)

    scroller.dispatchEvent(pointer('pointerdown', 200))
    window.dispatchEvent(pointer('pointerup', 200))
    await link.trigger('click')
    expect(clicked).toHaveBeenCalledTimes(1)
  })
})
