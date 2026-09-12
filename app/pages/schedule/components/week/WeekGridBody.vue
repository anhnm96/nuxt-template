<script setup lang="ts">
import type useWeekGridGestures from '../../composables/useWeekGridGestures'
import type { PlacedSegment } from '../../utils/week'
import type { ScheduleEventUI } from '~/services/schedule'
import type { DayColumn } from '~/utils/schedule'
import dayjs from 'dayjs/esm'
import { isPromotedToAllDay, MINUTES_PER_DAY } from '../../utils/week'
import WeekEventBlock from './WeekEventBlock.vue'

const props = defineProps<{
  days: DayColumn[]
  /** Placed segments per day index, from `placeSegments`. */
  placed: Map<number, PlacedSegment[]>
  hourHeight: number
  startHour: number
  endHour: number
  gestures: ReturnType<typeof useWeekGridGestures<ScheduleEventUI>>
  /** Key of the column that is today, or `''` before the clock has run. */
  todayKey: string
  /** Minutes from midnight of the current time, or `-1` before the clock has run. */
  nowMinutes: number
  /** Sends a message to the view's live region after a keyboard edit. */
  announce: (message: string) => void
  /** Returns focus to an event after an edit has re-rendered or re-homed it. */
  focusEvent: (id: string) => void
}>()

const cellsEl = useTemplateRef('cellsEl')
const eventsEl = useTemplateRef('eventsEl')
defineExpose({ eventsEl })

const hours = computed(() =>
  Array.from({ length: props.endHour - props.startHour + 1 }, (_, index) => props.startHour + index))
const rangeStartMin = computed(() => props.startHour * 60)
const gridHeight = computed(() => hours.value.length * props.hourHeight)

// ─── Now indicator ─────────────────────────────────────────────────────────

const showNow = computed(() =>
  props.nowMinutes >= rangeStartMin.value && props.nowMinutes <= (props.endHour + 1) * 60)
const nowTop = computed(() => ((props.nowMinutes - rangeStartMin.value) / 60) * props.hourHeight)

// ─── Drag previews ─────────────────────────────────────────────────────────

/** Geometry of an absolute-minute range as seen inside one day column. */
function rangeGeometry(startAbs: number, endAbs: number, dayIndex: number) {
  const base = dayIndex * MINUTES_PER_DAY
  const from = Math.max(startAbs, base + rangeStartMin.value)
  const to = Math.min(endAbs, base + (props.endHour + 1) * 60)
  if (to <= from) return null
  return {
    top: ((from - base - rangeStartMin.value) / 60) * props.hourHeight,
    height: ((to - from) / 60) * props.hourHeight,
  }
}

const gridPreview = computed(() => {
  const preview = props.gestures.dragPreview.value
  return preview?.surface === 'grid' ? preview : null
})

/** The block that follows the pointer while an event is being moved. */
const floatingMove = computed(() => {
  const preview = gridPreview.value
  if (preview?.edge !== 'move') return null
  const dayIndex = Math.floor(preview.start / MINUTES_PER_DAY)
  const geometry = rangeGeometry(preview.start, preview.end, dayIndex)
  if (!geometry) return null
  // Reuse the moved event's own segment so the floating copy looks identical.
  const source = props.placed.get(Math.floor(preview.start / MINUTES_PER_DAY))
    ?? props.placed.values().next().value
  const template = source?.find(segment => segment.event.id === preview.event.id)
  return {
    dayIndex,
    geometry,
    segment: {
      ...(template ?? {}),
      key: `${preview.event.id}-floating`,
      event: preview.event,
      dayIndex,
      continuesBefore: false,
      continuesAfter: false,
      zIndex: 40,
      ...geometry,
    } as PlacedSegment,
  }
})

/** Vertical geometry a segment should use while its event is being resized. */
function previewFor(segment: PlacedSegment) {
  const preview = gridPreview.value
  if (!preview || preview.edge === 'move' || preview.event.id !== segment.event.id) return null
  return rangeGeometry(preview.start, preview.end, segment.dayIndex)
}

function isMoving(segment: PlacedSegment) {
  return gridPreview.value?.edge === 'move' && gridPreview.value.event.id === segment.event.id
}

/** Time range the current gesture would commit, shown as a badge. */
const dragBadge = computed(() => {
  const preview = gridPreview.value
  const create = props.gestures.createDrag.value
  let dayIndex: number
  let start: number
  let end: number

  if (preview) {
    dayIndex = Math.floor(preview.start / MINUTES_PER_DAY)
    start = preview.start
    end = preview.end
  } else if (create?.surface === 'grid') {
    dayIndex = create.dayIndex
    const base = create.dayIndex * MINUTES_PER_DAY
    start = base + Math.min(create.start, create.end)
    end = base + Math.max(create.start, create.end)
    if (end === start) return null
  } else {
    return null
  }

  const geometry = rangeGeometry(start, end, dayIndex)
  if (!geometry) return null
  const origin = props.days[0]?.dayjs.startOf('day')
  if (!origin) return null
  return {
    dayIndex,
    top: geometry.top,
    label: `${origin.add(start, 'minute').format('HH:mm')} – ${origin.add(end, 'minute').format('HH:mm')}`,
  }
})

/** Translucent selection shown while dragging empty grid space. */
const createStyle = computed(() => {
  const drag = props.gestures.createDrag.value
  if (drag?.surface !== 'grid') return null
  const lo = Math.min(drag.start, drag.end)
  const hi = Math.max(drag.start, drag.end)
  return {
    dayIndex: drag.dayIndex,
    style: {
      top: `${((lo - rangeStartMin.value) / 60) * props.hourHeight}px`,
      height: `${Math.max(((hi - lo) / 60) * props.hourHeight, 2)}px`,
    },
  }
})

// ─── Keyboard: the slot grid ───────────────────────────────────────────────

/**
 * The focused slot: one hour of one day column. A slot is the unit the keyboard
 * navigates between and the smallest region carrying a label of its own.
 */
const focusedSlot = ref<{ col: number, hour: number } | null>(null)

/** The grid's single tab stop: the focused slot, or the first one. */
const tabbableSlot = computed(() => focusedSlot.value ?? { col: 0, hour: props.startHour })

function isTabbableSlot(col: number, hour: number) {
  return tabbableSlot.value.col === col && tabbableSlot.value.hour === hour
}

function focusSlot(col: number, hour: number) {
  const slot = {
    col: clamp(col, 0, props.days.length - 1),
    hour: clamp(hour, props.startHour, props.endHour),
  }
  focusedSlot.value = slot
  nextTick(() =>
    cellsEl.value?.querySelector<HTMLElement>(`[data-slot="${slot.col}-${slot.hour}"]`)?.focus())
}

/** Timestamp of the start of a slot. */
function slotStart(col: number, hour: number) {
  return props.days[col]!.dayjs.startOf('day').add(hour, 'hour')
}

function createAtSlot(col: number, hour: number) {
  const start = slotStart(col, hour)
  const end = start.add(props.gestures.defaultCreateMinutes, 'minute')
  props.gestures.createRange({ start: start.valueOf(), end: end.valueOf(), allDay: false })
  props.announce(`Event created ${start.format('ddd D MMM HH:mm')}`)
}

function onCellsKeydown(nativeEvent: KeyboardEvent) {
  const { col, hour } = tabbableSlot.value
  switch (nativeEvent.key) {
    case 'ArrowLeft':
    case 'PageUp':
      focusSlot(col - 1, hour)
      break
    case 'ArrowRight':
    case 'PageDown':
      focusSlot(col + 1, hour)
      break
    case 'ArrowUp':
      focusSlot(col, hour - 1)
      break
    case 'ArrowDown':
      focusSlot(col, hour + 1)
      break
    case 'Home':
      focusSlot(col, props.startHour)
      break
    case 'End':
      focusSlot(col, props.endHour)
      break
    case 'Enter':
    case ' ':
      createAtSlot(col, hour)
      break
    default:
      return
  }
  nativeEvent.preventDefault()
}

// ─── Keyboard: the events layer ────────────────────────────────────────────

const focusedEventId = ref<string | null>(null)

/** Every segment in chronological order — the keyboard navigation order. */
const ordered = computed(() =>
  [...props.placed.values()].flat().sort((a, b) => a.absStart - b.absStart))

const tabbableEventId = computed(() =>
  ordered.value.some(segment => segment.event.id === focusedEventId.value)
    ? focusedEventId.value
    : ordered.value[0]?.event.id ?? null)

function isTabbableEvent(segment: PlacedSegment) {
  // Only the event's first segment takes the tab stop, so an overnight event
  // does not appear twice in the navigation order.
  return segment.event.id === tabbableEventId.value
    && ordered.value.find(item => item.event.id === segment.event.id)?.key === segment.key
}

/**
 * Tracks the focused block from the container: `focusin` bubbles where `focus`
 * does not, so one listener here covers every block without a per-block prop.
 */
function onEventsFocusIn(nativeEvent: FocusEvent) {
  const el = (nativeEvent.target as HTMLElement | null)?.closest<HTMLElement>('[data-event-id]')
  if (el) focusedEventId.value = el.dataset.eventId ?? null
}

function focusEvent(id: string | null) {
  if (!id) return
  focusedEventId.value = id
  nextTick(() =>
    eventsEl.value?.querySelector<HTMLElement>(`[data-event-id="${id}"]`)?.focus())
}

function moveEventFocus(step: number) {
  // One entry per event, not per segment.
  const ids = [...new Set(ordered.value.map(segment => segment.event.id))]
  if (!ids.length) return
  const current = ids.indexOf(tabbableEventId.value ?? '')
  focusEvent(ids[clamp(current + step, 0, ids.length - 1)] ?? null)
}

function describeRange(start: number, end: number) {
  return `${dayjs(start).format('ddd D MMM HH:mm')} to ${dayjs(end).format('HH:mm')}`
}

/**
 * A grid edit can stretch an event past 24 hours, which re-homes it to the
 * all-day row. Worth saying out loud: the block leaves the grid, and a user who
 * cannot see that happen is otherwise told only that the times changed.
 */
function promotionNote(range: { start: number, end: number }) {
  return isPromotedToAllDay({ timed: true, ...range }) ? ', now in the all-day row' : ''
}

/**
 * Keyboard editing: plain arrows move focus, Shift moves the event (vertically
 * by one snap unit, horizontally by a day), Alt resizes its end and Alt+Shift
 * its start.
 */
function onEventsKeydown(nativeEvent: KeyboardEvent) {
  const segment = ordered.value.find(item => item.event.id === tabbableEventId.value)
  if (!segment) return
  const event = segment.event
  const vertical = nativeEvent.key === 'ArrowUp' ? -1 : nativeEvent.key === 'ArrowDown' ? 1 : 0
  const horizontal = nativeEvent.key === 'ArrowLeft' ? -1 : nativeEvent.key === 'ArrowRight' ? 1 : 0

  if (nativeEvent.key === 'Escape') {
    props.gestures.cancel()
    return
  }
  if (nativeEvent.key === 'Enter' || nativeEvent.key === ' ') {
    nativeEvent.preventDefault()
    props.gestures.onEventClick(event)
    return
  }
  if (!vertical && !horizontal) return
  nativeEvent.preventDefault()

  if (nativeEvent.altKey) {
    // Resize is vertical only. Horizontal means days throughout this view, and
    // a timed event's end does not move in days: a day later always pushes it
    // past the promotion threshold and out of the grid, a day earlier always
    // collapses it to the minimum length. Neither is ever what was meant. The
    // key is still consumed above, so Alt+Left does not reach the browser as
    // its Back shortcut.
    if (!vertical) return
    const edge = nativeEvent.shiftKey ? 'start' : 'end'
    const range = props.gestures.resizeEventBy(event, edge, {
      minutes: vertical * props.gestures.snapMinutes,
    })
    if (!range) return
    props.announce(`${event.title} ${edge} moved, now ${describeRange(range.start, range.end)}${promotionNote(range)}`)
    props.focusEvent(event.id)
    return
  }
  if (nativeEvent.shiftKey) {
    if (!segment.fullyVisible) return
    const range = props.gestures.nudgeEvent(event, {
      minutes: vertical * props.gestures.snapMinutes,
      days: horizontal,
    })
    // No promotion note here: a move preserves duration, and a block only
    // exists in the grid while its event is under 24h.
    props.announce(`${event.title} moved to ${describeRange(range.start, range.end)}`)
    props.focusEvent(event.id)
    return
  }
  moveEventFocus(vertical || horizontal)
}
</script>

<template>
  <div class="relative" :style="{ 'height': `${gridHeight}px`, '--hour-height': `${hourHeight}px` }">
    <!--
      Slots are laid out row-major so the accessibility tree matches the visual
      one: each `role="row"` uses `display: contents`, which keeps its cells as
      direct grid items while still grouping them for assistive technology.
    -->
    <div
      ref="cellsEl"
      role="grid"
      aria-label="Time grid. Double-click or drag to create an event; arrow keys move between slots and Enter creates one."
      :aria-colcount="days.length"
      :aria-rowcount="hours.length"
      class="week-grid week-grid--body"
      @dblclick="gestures.createAtGrid($event)"
      @keydown="onCellsKeydown"
    >
      <div
        v-for="(hour, rowIndex) in hours"
        :key="hour"
        role="row"
        class="contents"
        :aria-rowindex="rowIndex + 1"
      >
        <div
          role="rowheader"
          class="-translate-y-2 pr-2 text-right text-xs"
          :class="rowIndex === 0 && 'invisible'"
        >
          {{ hour.toString().padStart(2, '0') }}:00
        </div>
        <button
          v-for="(day, col) in days"
          :key="day.key"
          type="button"
          role="gridcell"
          :aria-colindex="col + 1"
          :data-slot="`${col}-${hour}`"
          :tabindex="isTabbableSlot(col, hour) ? 0 : -1"
          :aria-label="`${day.dayjs.format('ddd D MMM')} ${hour.toString().padStart(2, '0')}:00, double-click or drag to create`"
          title="Double-click or drag to create"
          class="cursor-cell border-b border-l border-elevated transition-colors hover:bg-abg focus-visible:bg-primary/10"
          @focus="focusedSlot = { col, hour }"
          @pointerdown="gestures.startGridCreate($event)"
        />
      </div>
    </div>

    <!-- Events sit above the slots; only the blocks themselves take pointers,
      so empty space still starts a create drag on the slot below. -->
    <div
      ref="eventsEl"
      class="pointer-events-none absolute inset-y-0 right-0 grid"
      :style="{ left: 'var(--gutter-width)', gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }"
      @focusin="onEventsFocusIn"
      @keydown="onEventsKeydown"
    >
      <div v-for="(day, col) in days" :key="day.key" class="relative">
        <WeekEventBlock
          v-for="segment in placed.get(col) ?? []"
          :key="segment.key"
          :data-event-id="segment.event.id"
          class="pointer-events-auto"
          :segment="segment"
          :preview="previewFor(segment)"
          :dragging="gestures.isDragging.value"
          :drag-target="gestures.isDragTarget(segment.event)"
          :ghosted="isMoving(segment)"
          :tabbable="isTabbableEvent(segment)"
          @move="gestures.startGridMove($event, segment.event, segment.fullyVisible)"
          @resize="(nativeEvent, edge) => gestures.startGridResize(nativeEvent, segment.event, edge)"
          @edit="gestures.onEventClick(segment.event)"
        />

        <!-- The moved block, following the pointer at full column width. -->
        <WeekEventBlock
          v-if="floatingMove && floatingMove.dayIndex === col"
          :segment="floatingMove.segment"
          floating
          dragging
        />

        <!-- Drag-to-create selection -->
        <div
          v-if="createStyle && createStyle.dayIndex === col"
          class="pointer-events-none absolute inset-x-0.5 rounded-md border border-dashed border-primary bg-primary/15"
          :style="createStyle.style"
        />

        <!-- Time badge for whatever gesture is in flight -->
        <div
          v-if="dragBadge && dragBadge.dayIndex === col"
          class="pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 -translate-y-full rounded-md bg-surface-inverted px-1.5 py-0.5 text-[10px] whitespace-nowrap text-surface shadow"
          :style="{ top: `${dragBadge.top - 4}px` }"
        >
          {{ dragBadge.label }}
        </div>

        <!-- Current-time indicator -->
        <div
          v-if="showNow && day.key === todayKey"
          class="pointer-events-none absolute right-0 left-0 z-40 flex items-center"
          :style="{ top: `${nowTop}px` }"
        >
          <span class="-ml-1 size-2 rounded-full bg-red-500" />
          <span class="h-px flex-1 bg-red-500" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.week-grid--body {
  position: absolute;
  inset: 0;
  grid-auto-rows: var(--hour-height);
}
</style>
