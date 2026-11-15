import type { MaybeRefOrGetter, ShallowRef } from 'vue'
import type { ListGroup, ListOption } from '~/composables/useOptionList'

/**
 * The Rows that `Listbox` draws. In a Virtual List these are the Rendered Rows; in any other
 * list they are all Rows. Terms in Title Case are defined in CONTEXT.md. DESIGN.md has the
 * reasons for fixed heights and for an engine of our own.
 */

export interface RowHeights {
  /** Height of each Option, in pixels. */
  optionHeight: number
  /** Height of each Group label, in pixels. */
  groupHeight: number
}

/** The `virtual` prop of a host. `true` uses `DEFAULT_HEIGHTS`. */
export type VirtualProp = boolean | Partial<RowHeights>

/** The heights that `assets/css/components/select.css` gives a one-line Option and a Group label. */
export const DEFAULT_HEIGHTS: RowHeights = { optionHeight: 32, groupHeight: 28 }

/** Rows that are rendered outside the view on each side, so a scroll does not show a gap. */
const OVERSCAN = 4
/** `max-h-64` of `.select-list`. Used until the element has a height, and where no layout exists. */
const FALLBACK_VIEW_HEIGHT = 256

export function toRowHeights(virtual: VirtualProp | undefined): RowHeights | undefined {
  if (!virtual) return undefined
  return virtual === true ? DEFAULT_HEIGHTS : { ...DEFAULT_HEIGHTS, ...virtual }
}

/** One Group with the Options of it that are rendered. */
export interface RenderedGroup<T> {
  group: ListGroup<T>
  /** Index within Visible Options of the first rendered Option. */
  firstIndex: number
  /** Position within the Group of the first rendered Option, from 0. */
  start: number
  options: ListOption<T>[]
  /** Height of the Options of this Group before the rendered ones, in pixels. */
  before: number
  /** Height of the Options of this Group after the rendered ones, in pixels. */
  after: number
}

export interface RenderedRows<T> {
  groups: RenderedGroup<T>[]
  /** Height of the Groups before the rendered ones, in pixels. */
  before: number
  /** Height of the Groups after the rendered ones, in pixels. */
  after: number
}

export interface RowLayout {
  /** Index within Visible Options of each Group's first Option. */
  offsets: number[]
  /** Distance from the start of the list to each Group, in pixels. Empty without heights. */
  tops: number[]
  /** Height of all Rows, in pixels. */
  total: number
}

export function layoutRows(groups: ListGroup<any>[], heights?: RowHeights): RowLayout {
  const offsets: number[] = []
  const tops: number[] = []
  let offset = 0
  let top = 0
  for (const group of groups) {
    offsets.push(offset)
    offset += group.options.length
    if (!heights) continue
    tops.push(top)
    top += (group.label ? heights.groupHeight : 0) + group.options.length * heights.optionHeight
  }
  return { offsets, tops, total: top }
}

/** Index of the last entry of an ascending list that is not more than `value`. At least 0. */
function lastAtMost(sorted: number[], value: number) {
  let low = 0
  let high = sorted.length - 1
  while (low < high) {
    const middle = Math.ceil((low + high) / 2)
    if (sorted[middle]! <= value) low = middle
    else high = middle - 1
  }
  return low
}

/**
 * The Rows between two distances from the start of the list.
 *
 * A Group that has a Row in that range is rendered with its label, also when the label is
 * outside the range. The label is `position: sticky`, and it names the Group for
 * `aria-labelledby`.
 */
export function rowsBetween<T>(
  groups: ListGroup<T>[],
  layout: RowLayout,
  heights: RowHeights,
  from: number,
  to: number,
): RenderedRows<T> {
  const rendered: RenderedGroup<T>[] = []
  if (!groups.length) return { groups: rendered, before: 0, after: 0 }

  const { optionHeight, groupHeight } = heights
  const first = lastAtMost(layout.tops, from)
  let index = first
  for (; index < groups.length && layout.tops[index]! < to; index++) {
    const group = groups[index]!
    const count = group.options.length
    // distance from the start of the list to the first Option of the Group
    const optionsTop = layout.tops[index]! + (group.label ? groupHeight : 0)
    const start = clamp(Math.floor((from - optionsTop) / optionHeight), 0, count)
    const end = clamp(Math.ceil((to - optionsTop) / optionHeight), start, count)
    rendered.push({
      group,
      firstIndex: layout.offsets[index]! + start,
      start,
      options: group.options.slice(start, end),
      before: start * optionHeight,
      after: (count - end) * optionHeight,
    })
  }
  return {
    groups: rendered,
    before: layout.tops[first]!,
    after: index < groups.length ? layout.total - layout.tops[index]! : 0,
  }
}

export function useVirtualRows<T>(options: {
  groups: MaybeRefOrGetter<ListGroup<T>[]>
  /** No heights: the list is not a Virtual List, and all Rows are rendered. */
  heights: MaybeRefOrGetter<RowHeights | undefined>
  /** The element that scrolls. */
  scroller: Readonly<ShallowRef<HTMLElement | null>>
}) {
  const { scroller } = options
  const layout = computed(() => layoutRows(toValue(options.groups), toValue(options.heights)))

  const scrollTop = ref(0)
  const viewHeight = ref(FALLBACK_VIEW_HEIGHT)
  function readScroller() {
    const el = scroller.value
    if (!el) return
    scrollTop.value = el.scrollTop
    viewHeight.value = el.clientHeight || FALLBACK_VIEW_HEIGHT
  }
  useEventListener(scroller, 'scroll', readScroller, { passive: true })
  useResizeObserver(scroller, readScroller)
  // A list of another length, or another element, has another offset, and the browser
  // does not always send a `scroll` event for it.
  watch([() => layout.value.total, scroller], readScroller, { flush: 'post' })

  const rendered = computed<RenderedRows<T>>(() => {
    const groups = toValue(options.groups)
    const heights = toValue(options.heights)
    if (!heights) {
      return {
        groups: groups.map((group, index) => ({
          group,
          firstIndex: layout.value.offsets[index]!,
          start: 0,
          options: group.options,
          before: 0,
          after: 0,
        })),
        before: 0,
        after: 0,
      }
    }
    // A shorter list makes the browser decrease `scrollTop`, and the `scroll` event for
    // that comes after this render.
    const top = Math.min(scrollTop.value, Math.max(0, layout.value.total - viewHeight.value))
    const overscan = OVERSCAN * heights.optionHeight
    return rowsBetween(groups, layout.value, heights, top - overscan, top + viewHeight.value + overscan)
  })

  /**
   * Scrolls the smallest distance that shows the Option, as `scrollIntoView({ block: 'nearest' })`
   * does. The Option can be a Row that is not rendered, so the position is from the layout.
   * @param index index within Visible Options
   */
  function scrollToIndex(index: number) {
    const el = scroller.value
    const heights = toValue(options.heights)
    if (!el || !heights) return
    const groups = toValue(options.groups)
    const { offsets, tops } = layout.value
    const groupIndex = lastAtMost(offsets, index)
    if (!groups[groupIndex]) return
    // the sticky label of the Group is above its Options
    const labelHeight = groups[groupIndex].label ? heights.groupHeight : 0
    const top = tops[groupIndex]! + labelHeight + (index - offsets[groupIndex]!) * heights.optionHeight
    // the Rows start after the padding of the element
    const style = getComputedStyle(el)
    const paddingTop = pixels(style.paddingTop)
    // a sticky label is at the padding and not at the edge, so it covers the two
    const covered = labelHeight ? labelHeight + paddingTop : 0
    // the element can have no height yet when the popup opens
    const height = el.clientHeight || FALLBACK_VIEW_HEIGHT
    if (top + paddingTop - covered < el.scrollTop) el.scrollTop = top - labelHeight
    else if (top + paddingTop + heights.optionHeight > el.scrollTop + height)
      el.scrollTop = top + paddingTop + heights.optionHeight + pixels(style.paddingBottom) - height
    // the `scroll` event is later than the render that follows this call
    readScroller()
  }

  return { rendered, scrollToIndex }
}
