import type { Dayjs } from 'dayjs/esm'
import type { DayColumn } from '~/utils/schedule'
import dayjs from 'dayjs/esm'
import { MINUTES_PER_DAY } from '../utils/week'

/** Which part of a block the pointer grabbed. */
export type WeekDragEdge = 'start' | 'end' | 'move'

export const WEEK_SURFACE = {
  /** The scrollable time grid; positions are minutes. */
  GRID: 'grid',
  /** The all-day row; positions are day indices. */
  ALL_DAY: 'allDay',
} as const
export type WeekSurface = ValueOf<typeof WEEK_SURFACE>

/**
 * An in-flight move or resize, mirrored live so the view can preview it.
 *
 * `start`/`end` are in the surface's own unit: minutes from midnight of the
 * first displayed day on the grid, day indices in the all-day row.
 */
export interface WeekDragPreview<TEvent> {
  event: TEvent
  surface: WeekSurface
  edge: WeekDragEdge
  start: number
  end: number
}

/** An in-flight drag-to-create selection, in its surface's unit. */
export interface WeekCreateDrag {
  surface: WeekSurface
  /** Day column the selection belongs to (the grid locks a create to one day). */
  dayIndex: number
  start: number
  end: number
}

interface UseWeekGridGesturesOptions<TEvent> {
  /** The displayed day columns; column count and the minute origin come from here. */
  days: MaybeRefOrGetter<DayColumn[]>
  /** Pixel height of one hour row at the current zoom. */
  hourHeight: MaybeRefOrGetter<number>
  /** First hour displayed, counted from midnight. */
  startHour: MaybeRefOrGetter<number>
  /** Last hour displayed, counted from midnight. */
  endHour: MaybeRefOrGetter<number>
  /** Element whose box spans the grid's day columns — the coordinate reference. */
  gridEl: MaybeRefOrGetter<HTMLElement | null | undefined>
  /** Element whose box spans the all-day row's day columns. */
  allDayEl: MaybeRefOrGetter<HTMLElement | null | undefined>
  /** Scroll container edge-scrolled while a grid gesture runs near its edges. */
  scrollEl: MaybeRefOrGetter<HTMLElement | null | undefined>
  /** Snap granularity in minutes, also the minimum event length. Defaults to `15`. */
  snapMinutes?: number
  /** Length of an event created without a range being drawn. Defaults to `30`. */
  defaultCreateMinutes?: number
  /**
   * Pointer travel before a press counts as a drag rather than a click — for
   * moving a block and for creating alike, since it describes the hand and the
   * pointing device, not the thing being pointed at. Defaults to `4`.
   */
  dragThresholdPx?: number
  /** Called when a move or resize settles on a changed range. */
  onCommit: (payload: { event: TEvent, start: number, end: number }) => void
  /** Called when a drag (or click) on empty space defines a new range. */
  onCreate: (payload: { start: number, end: number, allDay: boolean }) => void
  /** Called when a block is clicked without being dragged. */
  onEdit: (event: TEvent) => void
}

interface EventLike {
  id: string
  start: number
  end: number
}

/**
 * Owns every pointer and keyboard interaction in the week view: creating by
 * dragging empty space, moving a block in two dimensions, and resizing it by
 * an edge — on the time grid and on the all-day row alike.
 *
 * Both surfaces share one drag state, for the same reason the timeline's three
 * gestures do: only one can be in flight at a time, and a single state makes
 * that structural rather than a convention. What differs is only the unit —
 * the grid works in minutes from the first displayed day's midnight (so a day
 * change is just ±1440), the all-day row in whole day indices.
 *
 * The state returned is raw positions; turning it into styles is the view's
 * job, since that needs the layout model the view owns.
 *
 * @typeParam TEvent - The event shape; only `id`/`start`/`end` are read.
 * @param options - Geometry sources, snap behavior, and the commit callbacks.
 * @returns Drag state, the pointer handlers to bind, and the keyboard editing API.
 */
export default function useWeekGridGestures<TEvent extends EventLike>(
  options: UseWeekGridGesturesOptions<TEvent>,
) {
  const {
    days,
    hourHeight,
    startHour,
    endHour,
    gridEl,
    allDayEl,
    scrollEl,
    snapMinutes = 15,
    defaultCreateMinutes = 30,
    dragThresholdPx = 4,
    onCommit,
    onCreate,
    onEdit,
  } = options

  // Non-null only while a move/resize is in flight. Shallow because the state
  // is always replaced wholesale, and because `ref` would rewrite the event as
  // `UnwrapRef<TEvent>` — a different type from the one the caller passed in.
  const dragPreview = shallowRef<WeekDragPreview<TEvent> | null>(null)
  // Non-null only while a create selection is in flight.
  const createDrag = shallowRef<WeekCreateDrag | null>(null)

  /** True while any gesture is running; the view uses it to suppress tooltips. */
  const isDragging = computed(() => !!dragPreview.value || !!createDrag.value)

  const autoScroll = useDragAutoScroll(() => toValue(scrollEl) ?? null)

  // ─── Coordinate space ────────────────────────────────────────────────────

  const dayCount = () => toValue(days).length
  const rangeStartMin = () => toValue(startHour) * 60
  const rangeEndMin = () => (toValue(endHour) + 1) * 60

  /** Midnight of the first displayed day — the origin every minute is measured from. */
  function origin(): Dayjs {
    return toValue(days)[0]!.dayjs.startOf('day')
  }

  function toTimestamp(absMinutes: number) {
    return origin().add(absMinutes, 'minute').valueOf()
  }

  function toAbsMinutes(timestamp: number) {
    return dayjs(timestamp).diff(origin(), 'minute')
  }

  /** Alt held during a gesture drops snapping to the minute. */
  function snapFor(nativeEvent: { altKey: boolean }) {
    return nativeEvent.altKey ? 1 : snapMinutes
  }

  function columnFromX(clientX: number, el: HTMLElement) {
    const rect = el.getBoundingClientRect()
    const count = dayCount()
    if (!count || rect.width <= 0) return 0
    const index = Math.floor(((clientX - rect.left) / rect.width) * count)
    return clamp(index, 0, count - 1)
  }

  /** Minute of the day under the pointer, snapped and clamped to the visible hours. */
  function minuteFromY(clientY: number, el: HTMLElement, snap: number) {
    const rect = el.getBoundingClientRect()
    const raw = rangeStartMin() + ((clientY - rect.top) / toValue(hourHeight)) * 60
    return clamp(Math.round(raw / snap) * snap, rangeStartMin(), rangeEndMin())
  }

  /** Unsnapped minute of the day, for deltas that snap on the result instead. */
  function rawMinuteFromY(clientY: number, el: HTMLElement) {
    const rect = el.getBoundingClientRect()
    return rangeStartMin() + ((clientY - rect.top) / toValue(hourHeight)) * 60
  }

  /** Whether a press has travelled far enough to be a drag rather than a click. */
  function clearedThreshold(nativeEvent: PointerEvent, origin: { x: number, y: number }) {
    return Math.abs(nativeEvent.clientX - origin.x) >= dragThresholdPx
      || Math.abs(nativeEvent.clientY - origin.y) >= dragThresholdPx
  }

  /**
   * Whether an event is the current drag target, compared by id: layout
   * recomputation replaces item references, so identity would never match.
   */
  function isDragTarget(event: EventLike) {
    return dragPreview.value?.event.id === event.id
  }

  // Swallows the click that follows a drag: a fast drag can land its pointerup
  // on the block, which would otherwise wrongly open the edit dialog.
  let suppressEventClick = false
  function suppressNextClick() {
    suppressEventClick = true
    setTimeout(() => {
      suppressEventClick = false
    })
  }

  function onEventClick(event: TEvent) {
    if (suppressEventClick) return
    onEdit(event)
  }

  /**
   * Moves focus onto the element a gesture started from.
   *
   * Every gesture calls `preventDefault` on its pointerdown to stop the browser
   * selecting text mid-drag, and that suppresses its focus handling too. Left
   * alone, clicking the calendar leaves focus wherever it was — usually the
   * document — so the next Tab starts at the top of the page and walks the
   * whole chrome before it reaches the grid. Focusing here also moves the
   * roving tabindex to what was clicked, so arrow keys carry on from there.
   *
   * `preventScroll` because the target is already under the pointer; letting
   * the browser scroll it into view would shift the grid mid-gesture.
   *
   * `focusVisible: false` because focus moved by script matches `:focus-visible`
   * — the browser reads a scripted move as intentional navigation, and the
   * `preventDefault` above has already erased the evidence that a pointer
   * started this. Without the flag a click lights the focus indicator up, which
   * is noise: the user knows where they just clicked. The keyboard paths call
   * `focus` without it, so arrows and Tab still light it up. A browser that
   * ignores the option simply shows the indicator, as it did before.
   */
  function focusGestureTarget(nativeEvent: PointerEvent) {
    const el = nativeEvent.currentTarget as HTMLElement | null
    el?.closest<HTMLElement>('[tabindex]')?.focus({ preventScroll: true, focusVisible: false })
  }

  // ─── Create: drag empty space to define a new range ──────────────────────

  /**
   * A press on empty space, watched to see whether it becomes a create.
   *
   * Deliberately not reactive: until the pointer clears the drag threshold the
   * gesture is still just a click, and nothing on screen may react to it. Only
   * once it is armed does `createDrag` appear — so that ref means exactly one
   * thing, a range being drawn.
   */
  interface WatchedPress {
    surface: WeekSurface
    /** The coordinate reference the press was measured against. */
    el: HTMLElement
    origin: { x: number, y: number }
    dayIndex: number
    /** Where the range starts, in the surface's unit. */
    start: number
  }
  let watchedPress: WatchedPress | null = null

  const createGesture = usePointerDrag({ onMove: onCreateMove, onEnd: onCreateEnd })

  /** Press on empty grid space; a create stays in the column it started in. */
  function startGridCreate(nativeEvent: PointerEvent) {
    if (nativeEvent.button !== 0) return // Primary button/contact only.
    const el = toValue(gridEl)
    if (!el) return
    nativeEvent.preventDefault() // Prevent text selection while dragging.
    focusGestureTarget(nativeEvent)
    watchedPress = {
      surface: WEEK_SURFACE.GRID,
      el,
      origin: { x: nativeEvent.clientX, y: nativeEvent.clientY },
      dayIndex: columnFromX(nativeEvent.clientX, el),
      start: minuteFromY(nativeEvent.clientY, el, snapFor(nativeEvent)),
    }
    createGesture.start(nativeEvent)
  }

  /** Press on empty all-day space; a create grows by whole day columns. */
  function startAllDayCreate(nativeEvent: PointerEvent) {
    if (nativeEvent.button !== 0) return
    const el = toValue(allDayEl)
    if (!el) return
    nativeEvent.preventDefault()
    focusGestureTarget(nativeEvent)
    const index = columnFromX(nativeEvent.clientX, el)
    watchedPress = {
      surface: WEEK_SURFACE.ALL_DAY,
      el,
      origin: { x: nativeEvent.clientX, y: nativeEvent.clientY },
      dayIndex: index,
      start: index,
    }
    createGesture.start(nativeEvent)
  }

  function onCreateMove(nativeEvent: PointerEvent) {
    const press = watchedPress
    if (!press) return
    // Below the threshold it is still a click, and a click creates nothing.
    if (!createDrag.value && !clearedThreshold(nativeEvent, press.origin)) return

    if (press.surface === WEEK_SURFACE.GRID) {
      autoScroll.updateFromPointer(nativeEvent.clientY)
      createDrag.value = {
        surface: press.surface,
        dayIndex: press.dayIndex,
        start: press.start,
        end: minuteFromY(nativeEvent.clientY, press.el, snapFor(nativeEvent)),
      }
      return
    }
    createDrag.value = {
      surface: press.surface,
      dayIndex: press.dayIndex,
      start: press.start,
      end: columnFromX(nativeEvent.clientX, press.el),
    }
  }

  function onCreateEnd() {
    const drag = createDrag.value
    createDrag.value = null
    watchedPress = null
    autoScroll.endDrag()
    // Never armed: the press was a click, and a click creates nothing.
    if (!drag) return

    const lo = Math.min(drag.start, drag.end)
    const hi = Math.max(drag.start, drag.end)

    if (drag.surface === WEEK_SURFACE.GRID) {
      // Cleared the threshold in pixels but not in time — a few pixels at a
      // coarse snap round to the same minute, and a zero-length event is not
      // something the user asked for.
      if (hi <= lo) return
      const base = drag.dayIndex * MINUTES_PER_DAY
      onCreate({ start: toTimestamp(base + lo), end: toTimestamp(base + hi), allDay: false })
      return
    }
    // All-day: the range is inclusive of both end columns, so a drag inside a
    // single column is a valid one-day event rather than an empty range.
    onCreate({
      start: toTimestamp(lo * MINUTES_PER_DAY),
      end: toTimestamp(hi * MINUTES_PER_DAY),
      allDay: true,
    })
  }

  // ─── Create: double-click for an event of the default length ─────────────

  /**
   * Double-click on empty grid space: an event of the default length starting
   * at the snapped minute under the pointer, so both pointer gestures agree
   * about where a click lands.
   */
  function createAtGrid(nativeEvent: MouseEvent) {
    const el = toValue(gridEl)
    if (!el) return
    const base = columnFromX(nativeEvent.clientX, el) * MINUTES_PER_DAY
    // Pull a click near the bottom back inside the visible hours, so the last
    // slot of the day still yields a full-length event.
    const start = Math.min(
      minuteFromY(nativeEvent.clientY, el, snapFor(nativeEvent)),
      rangeEndMin() - defaultCreateMinutes,
    )
    onCreate({
      start: toTimestamp(base + start),
      end: toTimestamp(base + start + defaultCreateMinutes),
      allDay: false,
    })
  }

  /** Double-click on empty all-day space: a one-day event in the column clicked. */
  function createAtAllDay(nativeEvent: MouseEvent) {
    const el = toValue(allDayEl)
    if (!el) return
    const base = columnFromX(nativeEvent.clientX, el) * MINUTES_PER_DAY
    onCreate({ start: toTimestamp(base), end: toTimestamp(base), allDay: true })
  }

  // ─── Move: drag the body, keeping the duration ───────────────────────────
  let moveEvent: TEvent | null = null
  let moveSurface: WeekSurface = WEEK_SURFACE.GRID
  let moveOrigin = { x: 0, y: 0 }
  /** Pointer position when the press started, in the surface's unit. */
  let moveGrab = 0
  let moveStart = 0
  let moveLength = 0

  const moveGesture = usePointerDrag({ onMove: onMoveMove, onEnd: onMoveEnd })

  /**
   * Press on a block's body. `fullyVisible` guards the same case the timeline
   * refuses: an event clipped by the displayed window has no true edges to
   * shift, so moving it would corrupt both.
   */
  function startGridMove(nativeEvent: PointerEvent, event: TEvent, fullyVisible: boolean) {
    if (nativeEvent.button !== 0 || !fullyVisible) return
    const el = toValue(gridEl)
    if (!el) return
    nativeEvent.preventDefault()
    focusGestureTarget(nativeEvent)
    moveEvent = event
    moveSurface = WEEK_SURFACE.GRID
    moveOrigin = { x: nativeEvent.clientX, y: nativeEvent.clientY }
    moveGrab = columnFromX(nativeEvent.clientX, el) * MINUTES_PER_DAY + rawMinuteFromY(nativeEvent.clientY, el)
    moveStart = toAbsMinutes(event.start)
    moveLength = toAbsMinutes(event.end) - moveStart
    moveGesture.start(nativeEvent)
  }

  /** Press on an all-day bar's body; it slides by whole columns. */
  function startAllDayMove(nativeEvent: PointerEvent, event: TEvent, startIndex: number, endIndex: number, fullyVisible: boolean) {
    if (nativeEvent.button !== 0 || !fullyVisible) return
    const el = toValue(allDayEl)
    if (!el) return
    nativeEvent.preventDefault()
    focusGestureTarget(nativeEvent)
    moveEvent = event
    moveSurface = WEEK_SURFACE.ALL_DAY
    moveOrigin = { x: nativeEvent.clientX, y: nativeEvent.clientY }
    moveGrab = columnFromX(nativeEvent.clientX, el)
    moveStart = startIndex
    moveLength = endIndex - startIndex
    moveGesture.start(nativeEvent)
  }

  function onMoveMove(nativeEvent: PointerEvent) {
    if (!moveEvent) return
    // Below the threshold it could still be a click, so do nothing yet. Once
    // the preview exists the gesture is a move and the test is behind us.
    if (!dragPreview.value && !clearedThreshold(nativeEvent, moveOrigin)) return

    if (moveSurface === WEEK_SURFACE.GRID) {
      const el = toValue(gridEl)
      if (!el) return
      autoScroll.updateFromPointer(nativeEvent.clientY)
      const pointer = columnFromX(nativeEvent.clientX, el) * MINUTES_PER_DAY + rawMinuteFromY(nativeEvent.clientY, el)
      const snap = snapFor(nativeEvent)
      // Snap the resulting start rather than the delta, so a block dragged
      // back to where it began lands exactly there.
      let start = Math.round((moveStart + pointer - moveGrab) / snap) * snap
      // Keep the whole event inside the displayed window. Minute-of-day is
      // deliberately not clamped per column: that would forbid an overnight
      // event from being moved across midnight.
      start = clamp(start, rangeStartMin(), (dayCount() - 1) * MINUTES_PER_DAY + rangeEndMin() - moveLength)
      dragPreview.value = { event: moveEvent, surface: moveSurface, edge: 'move', start, end: start + moveLength }
      return
    }

    const el = toValue(allDayEl)
    if (!el) return
    const start = clamp(
      moveStart + columnFromX(nativeEvent.clientX, el) - moveGrab,
      0,
      dayCount() - 1 - moveLength,
    )
    dragPreview.value = { event: moveEvent, surface: moveSurface, edge: 'move', start, end: start + moveLength }
  }

  function onMoveEnd() {
    const drag = dragPreview.value
    dragPreview.value = null
    moveEvent = null
    autoScroll.endDrag()
    // Never previewed: the press never cleared the threshold, so it was a
    // click — let the edit handler open it as usual.
    if (!drag) return
    suppressNextClick()
    if (drag.start === moveStart) return // Back where it started.

    if (drag.surface === WEEK_SURFACE.GRID) {
      onCommit({ event: drag.event, start: toTimestamp(drag.start), end: toTimestamp(drag.end) })
      return
    }
    // All-day: shift both timestamps by whole days, which preserves the clock
    // time of a promoted (timed) event rather than flattening it to midnight.
    const shift = drag.start - moveStart
    onCommit({
      event: drag.event,
      start: dayjs(drag.event.start).add(shift, 'day').valueOf(),
      end: dayjs(drag.event.end).add(shift, 'day').valueOf(),
    })
  }

  // ─── Resize: drag an edge, moving only that end ──────────────────────────
  let resizeEvent: TEvent | null = null
  let resizeSurface: WeekSurface = WEEK_SURFACE.GRID
  let resizeEdge: Exclude<WeekDragEdge, 'move'> = 'end'
  /** The bar's original span, in the surface's unit. */
  let resizeSpan = { start: 0, end: 0 }

  const resizeGesture = usePointerDrag({ onMove: onResizeMove, onEnd: onResizeEnd })

  function startGridResize(nativeEvent: PointerEvent, event: TEvent, edge: Exclude<WeekDragEdge, 'move'>) {
    if (nativeEvent.button !== 0) return
    const el = toValue(gridEl)
    if (!el) return
    nativeEvent.preventDefault()
    nativeEvent.stopPropagation()
    focusGestureTarget(nativeEvent)
    resizeEvent = event
    resizeSurface = WEEK_SURFACE.GRID
    resizeEdge = edge
    resizeSpan = { start: toAbsMinutes(event.start), end: toAbsMinutes(event.end) }
    dragPreview.value = { event, surface: resizeSurface, edge, ...resizeSpan }
    resizeGesture.start(nativeEvent)
  }

  function startAllDayResize(
    nativeEvent: PointerEvent,
    event: TEvent,
    edge: Exclude<WeekDragEdge, 'move'>,
    startIndex: number,
    endIndex: number,
  ) {
    if (nativeEvent.button !== 0) return
    const el = toValue(allDayEl)
    if (!el) return
    nativeEvent.preventDefault()
    nativeEvent.stopPropagation()
    focusGestureTarget(nativeEvent)
    resizeEvent = event
    resizeSurface = WEEK_SURFACE.ALL_DAY
    resizeEdge = edge
    resizeSpan = { start: startIndex, end: endIndex }
    dragPreview.value = { event, surface: resizeSurface, edge, ...resizeSpan }
    resizeGesture.start(nativeEvent)
  }

  function onResizeMove(nativeEvent: PointerEvent) {
    const drag = dragPreview.value
    if (!drag || !resizeEvent) return

    if (resizeSurface === WEEK_SURFACE.GRID) {
      const el = toValue(gridEl)
      if (!el) return
      autoScroll.updateFromPointer(nativeEvent.clientY)
      const snap = snapFor(nativeEvent)
      const position = columnFromX(nativeEvent.clientX, el) * MINUTES_PER_DAY
        + minuteFromY(nativeEvent.clientY, el, snap)
      // Only the dragged edge moves; keep one snap unit clear of the other.
      dragPreview.value = resizeEdge === 'start'
        ? { ...drag, start: Math.min(position, resizeSpan.end - snap) }
        : { ...drag, end: Math.max(position, resizeSpan.start + snap) }
      return
    }

    const el = toValue(allDayEl)
    if (!el) return
    const index = columnFromX(nativeEvent.clientX, el)
    dragPreview.value = resizeEdge === 'start'
      ? { ...drag, start: Math.min(index, resizeSpan.end) }
      : { ...drag, end: Math.max(index, resizeSpan.start) }
  }

  function onResizeEnd() {
    const drag = dragPreview.value
    const event = resizeEvent
    dragPreview.value = null
    resizeEvent = null
    autoScroll.endDrag()
    suppressNextClick()
    if (!drag || !event) return
    // No change → a plain click on the handle.
    if (drag.start === resizeSpan.start && drag.end === resizeSpan.end) return

    if (drag.surface === WEEK_SURFACE.GRID) {
      // The untouched edge keeps its original timestamp, so a cross-day
      // event's other end isn't rounded into the displayed window.
      onCommit({
        event,
        start: resizeEdge === 'start' ? toTimestamp(drag.start) : event.start,
        end: resizeEdge === 'end' ? toTimestamp(drag.end) : event.end,
      })
      return
    }
    // All-day: shift the dragged end by whole days, preserving its clock time.
    const shift = resizeEdge === 'start' ? drag.start - resizeSpan.start : drag.end - resizeSpan.end
    onCommit({
      event,
      start: resizeEdge === 'start' ? dayjs(event.start).add(shift, 'day').valueOf() : event.start,
      end: resizeEdge === 'end' ? dayjs(event.end).add(shift, 'day').valueOf() : event.end,
    })
  }

  // ─── Keyboard editing ────────────────────────────────────────────────────

  interface Delta {
    /** Minutes to shift by; defaults to one snap unit's worth when omitted. */
    minutes?: number
    /** Whole days to shift by. */
    days?: number
    /**
     * The event is measured in whole days, so a resize may shrink it to one day
     * but no further — the moved edge stops at its own day's boundary.
     *
     * True only for genuine all-day events. A promoted event is a timed one
     * that happens to be drawn in the all-day row; it keeps clock times, its
     * floor is a snap unit, and shrinking it under 24h is how it returns to the
     * grid.
     */
    wholeDays?: boolean
  }

  function shift(timestamp: number, { minutes = 0, days: dayDelta = 0 }: Delta) {
    return dayjs(timestamp).add(dayDelta, 'day').add(minutes, 'minute').valueOf()
  }

  /**
   * Move an event by keyboard, keeping its duration.
   *
   * @returns The committed range, so the caller can announce what actually happened.
   */
  function nudgeEvent(event: TEvent, delta: Delta) {
    const range = { start: shift(event.start, delta), end: shift(event.end, delta) }
    onCommit({ event, ...range })
    return range
  }

  /**
   * Resize an event by keyboard. The opposite edge is untouched, and the moved
   * edge stops at a floor: one snap unit for a timed event, or the far end of
   * its own day for one measured in whole days — see `wholeDays`.
   *
   * The day floor is the whole point: without it, shrinking a one-day all-day
   * event once more lands its end on its start, leaving an event of no duration
   * still drawn across a full column, which reads as "nothing happened".
   *
   * @returns The committed range, or `null` when the edge could not move.
   */
  function resizeEventBy(event: TEvent, edge: Exclude<WeekDragEdge, 'move'>, delta: Delta) {
    const shifted = shift(edge === 'start' ? event.start : event.end, delta)
    // A whole-day event is refused outright once the moved edge would cross the
    // other one's day, rather than being clamped to that day's last instant:
    // clamping rewrites the timestamp to 23:59:59.999, the store keeps whole
    // seconds, and every further press then "moves" the event by a millisecond
    // and announces it.
    // The snap floor is itself held back to the edge's current position, so an
    // event already shorter than one snap unit — reachable by an Alt-held
    // pointer resize, which snaps to the minute — cannot be "shortened" into
    // growing: without this, asking a 1-minute event's start to move 15 minutes
    // later moves it 14 minutes earlier instead.
    const minLength = snapMinutes * 60_000

    /**
     * Stops the moved edge at the snap floor.
     *
     * `limit` is the furthest it may travel toward the opposite edge; `stay`
     * is its current position, returned when the move is refused outright.
     *
     * Overshooting the floor clamps for a minute-sized delta, so holding an
     * arrow walks the edge down and parks it there. A delta measured in days
     * is refused instead, because a day overshoots a snap unit by so much that
     * clamping invents a length nobody asked for: a promoted 24-hour event
     * asked to shrink by one day would come back fifteen minutes long. Same
     * reasoning as the `wholeDays` refusal below, one floor further in.
     */
    const applyFloor = (limit: number, stay: number) => {
      const clamped = edge === 'start' ? Math.min(shifted, limit) : Math.max(shifted, limit)
      return delta.days && clamped !== shifted ? stay : clamped
    }

    const range = edge === 'start'
      ? {
          start: delta.wholeDays
            ? (dayjs(shifted).isAfter(event.end, 'day') ? event.start : shifted)
            : applyFloor(Math.max(event.end - minLength, event.start), event.start),
          end: event.end,
        }
      : {
          start: event.start,
          end: delta.wholeDays
            ? (dayjs(shifted).isBefore(event.start, 'day') ? event.end : shifted)
            : applyFloor(Math.min(event.start + minLength, event.end), event.end),
        }
    if (range.start === event.start && range.end === event.end) return null
    onCommit({ event, ...range })
    return range
  }

  /** Create a range from the keyboard, bypassing the pointer path. */
  function createRange(payload: { start: number, end: number, allDay: boolean }) {
    onCreate(payload)
  }

  // ─── Escape cancels whatever is in flight ────────────────────────────────
  function cancel() {
    createGesture.stop()
    moveGesture.stop()
    resizeGesture.stop()
    createDrag.value = null
    dragPreview.value = null
    moveEvent = null
    resizeEvent = null
    watchedPress = null
    autoScroll.endDrag()
  }

  useEventListener(document, 'keydown', (nativeEvent: KeyboardEvent) => {
    if (nativeEvent.key === 'Escape' && isDragging.value) cancel()
  })

  return {
    dragPreview,
    createDrag,
    isDragging,
    isDragTarget,
    onEventClick,
    startGridCreate,
    startGridMove,
    startGridResize,
    startAllDayCreate,
    startAllDayMove,
    startAllDayResize,
    createAtGrid,
    createAtAllDay,
    nudgeEvent,
    resizeEventBy,
    createRange,
    cancel,
    /** Minutes one keyboard step moves or resizes by. */
    snapMinutes,
    /** Length of an event created without a range being drawn. */
    defaultCreateMinutes,
  }
}
