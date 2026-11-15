<script lang="ts" setup>
import { provideCarouselContext } from './context'

interface CarouselSlotProps {
  /** index of the item at the leading edge */
  activeIndex: number
  hasPrev: boolean
  hasNext: boolean
  prev: () => void
  next: () => void
  /** scrolls to an item. The carousel limits the index to the positions it has */
  scrollTo: (index: number) => void
}
const props = withDefaults(
  defineProps<{
    /** index of the item at the leading edge when the carousel mounts */
    initialIndex?: number
    /**
     * `next` at the last position goes to the first one, and `prev` at the
     * first position goes to the last one
     */
    repeat?: boolean
    /**
     * time between two automatic steps, in milliseconds. The carousel reads it
     * one time, at setup. Without a value, or with `0`, there is no autoplay.
     */
    autoplay?: number
    /** classes for the element that scrolls, which is the parent of the items */
    itemsClass?: string
    /**
     * how many items `prev` and `next` move. The default is the number of
     * items that fit in the carousel.
     */
    itemsToScroll?: number
  }>(),
  { initialIndex: 0, repeat: true },
)

defineSlots<{
  /** above the items */
  header: (props: CarouselSlotProps) => any
  /** the `CarouselItem`s */
  default: (props: CarouselSlotProps) => any
  /** below the items */
  footer: (props: CarouselSlotProps) => any
}>()

/** a press must move this many pixels before the click that follows it is ignored */
const DRAG_THRESHOLD = 3
/**
 * Part of an item that a drag must cross to go to the next item. Without it the
 * carousel goes to the closest item, and a drag shorter than half an item
 * returns to its start.
 */
const DRAG_BIAS = 0.15
/** time without a `scroll` event after which a scroll has stopped, in milliseconds */
const SETTLE_DELAY = 100

const scroller = ref<HTMLElement>()
const items = shallowRef<HTMLElement[]>([])
provideCarouselContext({
  addItem(item) {
    items.value = [...items.value, item]
  },
  removeItem(item) {
    items.value = items.value.filter(other => other !== item)
  },
})

const activeIndex = ref(props.initialIndex)
const dragging = ref(false)
/** distance between the leading edges of two neighbouring items. All items have one width */
const stride = ref(0)
const itemsToShow = ref(1)
/** the last position: the last item is then at the trailing edge */
const lastIndex = computed(() => Math.max(0, items.value.length - itemsToShow.value))
const hasPrev = computed(() => activeIndex.value > 0)
const hasNext = computed(() => activeIndex.value < lastIndex.value)

/** 1, or -1 in a right-to-left carousel, where `scrollLeft` goes from 0 to a negative value */
let sign = 1
/** how far the element is scrolled from its start */
function offsetNow(el: HTMLElement) {
  return sign * el.scrollLeft
}
/** the last offset the element can scroll to */
function maxOffset(el: HTMLElement) {
  return el.scrollWidth - el.clientWidth
}
/**
 * Offset of a position. The last position is at the end of the scroll, which
 * can be less than one stride after the position before it.
 */
function offsetOf(el: HTMLElement, index: number) {
  return Math.min(index * stride.value, maxOffset(el))
}
/**
 * Position at the current offset, the reverse of `offsetOf`.
 * @param bias part of a stride to add before the offset is rounded to a position
 */
function indexAt(el: HTMLElement, bias = 0) {
  const offset = offsetNow(el)
  if (offset >= maxOffset(el) - 1) return lastIndex.value
  if (!stride.value) return activeIndex.value
  return clamp(Math.round(offset / stride.value + bias), 0, lastIndex.value)
}

function measure() {
  const el = scroller.value
  const first = items.value[0]
  if (!el || !first) return
  const style = getComputedStyle(el)
  sign = style.direction === 'rtl' ? -1 : 1
  const gap = pixels(style.columnGap)
  const itemWidth = first.getBoundingClientRect().width
  // a carousel that is not rendered has no size
  if (!itemWidth) return
  stride.value = itemWidth + gap
  const usableWidth = el.clientWidth - pixels(style.paddingLeft) - pixels(style.paddingRight)
  // Only whole items count: an item that shows in part is the last item at no
  // position. The small addition is for a width that is not a whole number.
  itemsToShow.value = Math.max(1, Math.floor((usableWidth + gap) / stride.value + 0.01))
  // Also corrects the index when fewer positions are left. Not during a drag:
  // the drag owns the offset, and its end reads the new measurements.
  if (!dragging.value) scrollTo(activeIndex.value, 'instant')
}
useResizeObserver(scroller, measure)
// items can come after the carousel mounts, and they do not change its size
watch(() => items.value.length, (count) => {
  // `measure` has no item to read. Not at mount: `initialIndex` is for items that come later
  if (!count) activeIndex.value = 0
  measure()
}, { flush: 'post' })

/**
 * False from the start of a drag until the scroll after it stops. Mandatory
 * snap moves the element to an item immediately, which stops both the drag and
 * the smooth scroll to the item the drag ends on.
 */
const snap = ref(true)
/**
 * Runs when a scroll has stopped. The user can also scroll the element with a
 * touch, a trackpad or the keyboard, so the index comes from the scroll
 * position.
 */
function settle() {
  const el = scroller.value
  if (dragging.value || !el) return
  activeIndex.value = indexAt(el)
  snap.value = true
}
let settleTimer: ReturnType<typeof setTimeout> | undefined
function settleLater() {
  clearTimeout(settleTimer)
  settleTimer = setTimeout(settle, SETTLE_DELAY)
}
useEventListener(scroller, 'scroll', settleLater)
onBeforeUnmount(() => clearTimeout(settleTimer))

function scrollTo(index: number, behavior: ScrollBehavior = 'smooth') {
  index = clamp(index, 0, lastIndex.value)
  activeIndex.value = index
  const el = scroller.value
  if (!el) return
  const offset = offsetOf(el, index)
  // A timer from an earlier scroll would read the index before this scroll starts.
  clearTimeout(settleTimer)
  // a call that does not move the element sends no `scroll` event
  if (Math.abs(offsetNow(el) - offset) < 1) settleLater()
  el.scrollTo({ left: sign * offset, behavior })
}

function step(by: number, wrap: boolean) {
  if (!by) return
  const atEdge = by > 0 ? !hasNext.value : !hasPrev.value
  if (!atEdge) scrollTo(activeIndex.value + by)
  else if (wrap) scrollTo(by > 0 ? 0 : lastIndex.value)
}
function prev() {
  step(-(props.itemsToScroll ?? itemsToShow.value), props.repeat)
}
function next() {
  step(props.itemsToScroll ?? itemsToShow.value, props.repeat)
}

// Drag with a mouse. The listeners are on `window` because the pointer can leave
// the carousel. They do not capture the pointer as `usePointerDrag` does: the
// click after a captured press goes to the carousel and not to the link below
// the pointer. The template cancels `dragstart`: the native drag of a link or an
// image would end the pointer drag.
let dragged = false
let startX = 0
let startScroll = 0

function pointerDown(e: PointerEvent) {
  // a touch and a pen scroll the element themselves
  if (e.pointerType !== 'mouse' || e.button !== 0) return
  const el = scroller.value!
  dragging.value = true
  dragged = false
  snap.value = false
  // a write stops a smooth scroll that is in progress
  // eslint-disable-next-line no-self-assign
  el.scrollLeft = el.scrollLeft
  startX = e.clientX
  startScroll = el.scrollLeft
  window.addEventListener('pointermove', pointerMove)
  window.addEventListener('pointerup', pointerUp)
  window.addEventListener('pointercancel', pointerUp)
}

function pointerMove(e: PointerEvent) {
  // the button went up where `window` got no `pointerup`, for example above an iframe
  if (!e.buttons) return pointerUp()
  const delta = startX - e.clientX
  if (Math.abs(delta) > DRAG_THRESHOLD) dragged = true
  scroller.value!.scrollLeft = startScroll + delta
}

function pointerUp() {
  stopDragListeners()
  dragging.value = false
  const el = scroller.value!
  const direction = Math.sign(offsetNow(el) - sign * startScroll)
  scrollTo(indexAt(el, direction * DRAG_BIAS))
  // `click` is in the same task as `pointerup`, before the timer. Without the
  // timer, a drag that ends outside the carousel sends no `click` here, and the
  // flag would stop the next click, which can come from the keyboard.
  if (dragged) setTimeout(() => (dragged = false))
}

function stopDragListeners() {
  window.removeEventListener('pointermove', pointerMove)
  window.removeEventListener('pointerup', pointerUp)
  window.removeEventListener('pointercancel', pointerUp)
}
// the carousel can go during a drag
onBeforeUnmount(stopDragListeners)

/** a drag that starts on a link or a button must not activate it */
function click(e: MouseEvent) {
  if (!dragged) return
  e.preventDefault()
  e.stopPropagation()
}

const autoplayTimer = props.autoplay
  ? useIntervalFn(() => {
      // `mouseleave` starts the timer again when a drag leaves the carousel
      if (!dragging.value) step(1, true)
    }, props.autoplay)
  : undefined

const slotProps = reactive({ activeIndex, hasPrev, hasNext, prev, next, scrollTo })
</script>

<template>
  <div @mouseenter="autoplayTimer?.pause()" @mouseleave="autoplayTimer?.resume()">
    <slot name="header" v-bind="slotProps" />
    <!-- scroller -->
    <div
      ref="scroller"
      class="carousel"
      :class="[itemsClass, { 'scroll-snap': snap }]"
      @pointerdown="pointerDown"
      @click.capture="click"
      @dragstart.prevent
    >
      <slot v-bind="slotProps" />
    </div>
    <slot name="footer" v-bind="slotProps" />
  </div>
</template>

<style scoped>
.carousel {
  overflow-x: auto;
  /* stops the back and forward navigation of the browser on a horizontal swipe */
  overscroll-behavior-x: none;
  width: 100%;
  display: flex;
  scrollbar-width: none;
}

.carousel::-webkit-scrollbar {
  display: none;
}

.scroll-snap {
  scroll-snap-type: x mandatory;
}
</style>
