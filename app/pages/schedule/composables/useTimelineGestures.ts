import type { Dayjs } from 'dayjs/esm'
import type { CalendarItem } from '~/services/schedule'
import dayjs from 'dayjs/esm'

/** An event placed on the timeline: its clamped minute range plus its lane. */
export interface TimelineDragItem<TEvent> {
  event: TEvent
  startMin: number
  endMin: number
  lane: number
}

/** Which part of a bar the pointer grabbed. */
export type TimelineDragEdge = 'start' | 'end' | 'move'

/** An in-flight resize/move, mirrored live so the view can preview it. */
export interface TimelineDragPreview<TEvent> {
  item: TimelineDragItem<TEvent>
  edge: TimelineDragEdge
  startMin: number
  endMin: number
}

/** An in-flight drag-to-create selection, tagged with the row it started on. */
export interface TimelineCreateDrag {
  calendarId: CalendarItem['calendarId']
  startMin: number
  endMin: number
}

interface UseTimelineGesturesOptions<TEvent> {
  /** The day being displayed; minute values are resolved against its midnight. */
  selectedDay: MaybeRefOrGetter<Dayjs>
  /** Width of one hour on the timeline, in px. */
  hourWidth: number
  /** First hour shown on the timeline (0-23). */
  startHour: number
  /** Last hour shown on the timeline (0-23). */
  endHour: number
  /** Snap granularity in minutes, also the minimum bar length. Defaults to `15`. */
  snapMinutes?: number
  /** Length given to a plain click on empty space. Defaults to `30`. */
  defaultCreateMinutes?: number
  /** Pointer travel before a press on a bar counts as a move, not a click. Defaults to `4`. */
  moveThresholdPx?: number
  /** Called when a resize or move settles on a changed range. */
  onCommit: (payload: { event: TEvent, start: number, end: number }) => void
  /** Called when a drag (or click) on empty space defines a new range. */
  onCreate: (payload: { start: number, end: number, calendarId: CalendarItem['calendarId'], alldayFlg: string }) => void
  /** Called when a bar is clicked without being dragged. */
  onEdit: (event: TEvent) => void
}

/**
 * Owns every pointer interaction on the timeline: resizing a bar by its edge,
 * moving a bar along its row, and dragging empty space to create an event.
 *
 * All three share one drag state — only one gesture can be in flight at a
 * time — which is why they live together rather than in three composables.
 * The returned state is raw (minute ranges); turning it into styles is the
 * view's job, since that needs the layout model the view owns.
 *
 * @typeParam TEvent - The event shape; only `start`/`end`/`scheduleId` are read.
 * @param options - Timeline geometry, snap behavior, and the commit callbacks.
 * @returns Drag state plus the handlers to bind to the relevant elements.
 */
export default function useTimelineGestures<TEvent extends { start: number, end: number, scheduleId?: number }>(
  options: UseTimelineGesturesOptions<TEvent>,
) {
  const {
    selectedDay,
    hourWidth,
    startHour,
    endHour,
    snapMinutes = 15,
    defaultCreateMinutes = 30,
    moveThresholdPx = 4,
    onCommit,
    onCreate,
    onEdit,
  } = options

  // Non-null only while a resize/move is in flight.
  const dragPreview = ref<TimelineDragPreview<TEvent> | null>(null)
  // Non-null only while a create selection is in flight.
  const createDrag = ref<TimelineCreateDrag | null>(null)

  // Timeline row elements used to convert coordinates during a gesture.
  let resizeEl: HTMLElement | null = null
  let createDragEl: HTMLElement | null = null

  /** True while any gesture is running; the view uses it to suppress tooltips. */
  const isDragging = computed(() => !!dragPreview.value || !!createDrag.value)

  // Convert a client X coordinate to a minute of the day (snapped, clamped to the displayed range).
  function clientXToMinutes(clientX: number, el: HTMLElement) {
    const rect = el.getBoundingClientRect()
    const raw = startHour * 60 + ((clientX - rect.left) / hourWidth) * 60
    const snapped = Math.round(raw / snapMinutes) * snapMinutes
    return Math.min(Math.max(snapped, startHour * 60), (endHour + 1) * 60)
  }

  // Convert a minute of the day to a timestamp (ms).
  function minutesToTimestamp(minutes: number) {
    return toValue(selectedDay).startOf('day').add(minutes, 'minute').valueOf()
  }

  /**
   * Whether an item is the current drag target, compared by scheduleId:
   * layout recomputation replaces item references, so object identity would
   * never match.
   */
  function isDragTarget(item: TimelineDragItem<TEvent>) {
    return dragPreview.value?.item.event.scheduleId === item.event.scheduleId
  }

  // Swallows the click that follows a drag: a fast drag can land its pointerup
  // on the bar, which would otherwise wrongly open the edit dialog.
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

  // ─── Resize: drag an edge handle to change one end ───────────────────────
  const resizeGesture = usePointerDrag({ onMove: onResizeMove, onEnd: onResizeEnd })

  function startResize(nativeEvent: PointerEvent, item: TimelineDragItem<TEvent>, edge: 'start' | 'end') {
    if (nativeEvent.button !== 0) return // Primary button/contact only.
    nativeEvent.preventDefault()
    nativeEvent.stopPropagation()
    // Use the timeline row (the handle's ancestor) as the coordinate reference.
    resizeEl = (nativeEvent.currentTarget as HTMLElement).closest('[data-timeline-row]') as HTMLElement
    dragPreview.value = { item, edge, startMin: item.startMin, endMin: item.endMin }
    resizeGesture.start(nativeEvent)
  }

  function onResizeMove(nativeEvent: PointerEvent) {
    const drag = dragPreview.value
    if (!drag || !resizeEl) return
    const min = clientXToMinutes(nativeEvent.clientX, resizeEl)
    // Only the dragged edge moves; keep one snap unit clear of the other edge.
    if (drag.edge === 'start')
      dragPreview.value = { ...drag, startMin: Math.min(min, drag.endMin - snapMinutes) }
    else
      dragPreview.value = { ...drag, endMin: Math.max(min, drag.startMin + snapMinutes) }
  }

  function onResizeEnd() {
    const drag = dragPreview.value
    dragPreview.value = null
    resizeEl = null
    suppressNextClick()
    if (!drag) return
    // No change → ignore (a plain click on the handle).
    if (drag.startMin === drag.item.startMin && drag.endMin === drag.item.endMin) return
    // Only the dragged edge takes a new time; the other keeps its original
    // timestamp, so a cross-day event's untouched edge isn't broken.
    const payload = { event: drag.item.event as TEvent, start: drag.item.event.start, end: drag.item.event.end }
    if (drag.edge === 'start') payload.start = minutesToTimestamp(drag.startMin)
    else payload.end = minutesToTimestamp(drag.endMin)
    onCommit(payload)
  }

  // ─── Move: drag the bar body, shifting both ends and keeping the duration ─
  let moveItem: TimelineDragItem<TEvent> | null = null
  let moveOriginX = 0
  let moveStartMin = 0
  let moveDurationMin = 0
  let moved = false

  const moveGesture = usePointerDrag({ onMove: onMoveMove, onEnd: onMoveEnd })

  function startMove(nativeEvent: PointerEvent, item: TimelineDragItem<TEvent>) {
    if (nativeEvent.button !== 0) return // Primary button/contact only.
    // Cross-day events are already clamped to the displayed range, so moving
    // them is disabled (it would corrupt both edges).
    const day = toValue(selectedDay)
    if (dayjs(item.event.start).isBefore(day, 'day') || dayjs(item.event.end).isAfter(day, 'day'))
      return
    nativeEvent.preventDefault()
    moveItem = item
    moveOriginX = nativeEvent.clientX
    moveStartMin = item.startMin
    moveDurationMin = item.endMin - item.startMin
    moved = false
    moveGesture.start(nativeEvent)
  }

  function onMoveMove(nativeEvent: PointerEvent) {
    if (!moveItem) return
    // Below the threshold it could still be a click, so do nothing yet.
    if (!moved && Math.abs(nativeEvent.clientX - moveOriginX) < moveThresholdPx) return
    moved = true
    const deltaMin = ((nativeEvent.clientX - moveOriginX) / hourWidth) * 60
    // Snap the new start, then clamp into the displayed range without
    // changing the duration.
    let newStart = Math.round((moveStartMin + deltaMin) / snapMinutes) * snapMinutes
    newStart = Math.min(Math.max(newStart, startHour * 60), (endHour + 1) * 60 - moveDurationMin)
    dragPreview.value = { item: moveItem, edge: 'move', startMin: newStart, endMin: newStart + moveDurationMin }
  }

  function onMoveEnd() {
    const drag = dragPreview.value
    const didMove = moved
    dragPreview.value = null
    moveItem = null
    moved = false
    if (!didMove) return // Plain click → let the edit dialog open as usual.
    suppressNextClick()
    // Don't save if the position didn't change.
    if (!drag || drag.startMin === drag.item.startMin) return
    onCommit({
      event: drag.item.event as TEvent,
      start: minutesToTimestamp(drag.startMin),
      end: minutesToTimestamp(drag.endMin),
    })
  }

  // ─── Create: drag empty track space to define a new range ────────────────
  const createGesture = usePointerDrag({ onMove: onCreateMove, onEnd: onCreateEnd })

  function startCreate(nativeEvent: PointerEvent, calendarId: CalendarItem['calendarId']) {
    if (nativeEvent.button !== 0) return // Primary button/contact only.
    nativeEvent.preventDefault() // Prevent text selection while dragging.
    createDragEl = nativeEvent.currentTarget as HTMLElement
    const min = clientXToMinutes(nativeEvent.clientX, createDragEl)
    createDrag.value = { calendarId, startMin: min, endMin: min }
    createGesture.start(nativeEvent)
  }

  function onCreateMove(nativeEvent: PointerEvent) {
    if (!createDrag.value || !createDragEl) return
    createDrag.value = { ...createDrag.value, endMin: clientXToMinutes(nativeEvent.clientX, createDragEl) }
  }

  function onCreateEnd() {
    if (!createDrag.value) return
    const { calendarId } = createDrag.value
    const lo = Math.min(createDrag.value.startMin, createDrag.value.endMin)
    let hi = Math.max(createDrag.value.startMin, createDrag.value.endMin)
    // A plain click (no range) uses the default length.
    if (hi <= lo) hi = lo + defaultCreateMinutes
    onCreate({ start: minutesToTimestamp(lo), end: minutesToTimestamp(hi), calendarId, alldayFlg: '0' })
    createDrag.value = null
    createDragEl = null
  }

  return {
    dragPreview,
    createDrag,
    isDragging,
    isDragTarget,
    startResize,
    startMove,
    startCreate,
    onEventClick,
  }
}
