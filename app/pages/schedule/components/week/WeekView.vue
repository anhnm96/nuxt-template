<script setup lang="ts">
import type { ScheduleEventUI } from '~/services/schedule'
import type { DayColumn, EventLayoutMode } from '~/utils/schedule'
import dayjs from 'dayjs/esm'
import { HOUR_HEIGHT } from '~/utils/schedule'
import useWeekGridGestures from '../../composables/useWeekGridGestures'
import { buildAllDayBars, buildWeekSegments, placeSegments } from '../../utils/week'
import WeekAllDayRow from './WeekAllDayRow.vue'
import WeekGridBody from './WeekGridBody.vue'
import WeekHeader from './WeekHeader.vue'

const props = withDefaults(defineProps<{
  /** Day columns to render — one for the day view, seven for the week view. */
  days: DayColumn[]
  /** Every visible event: timed and all-day alike, already filtered by calendar. */
  events: ScheduleEventUI[]
  /** How overlapping events share a column. */
  layoutMode: EventLayoutMode
  /** Pixel height of one hour row; the zoom control owns this. */
  hourHeight?: number
  /** First hour displayed, counted from midnight. */
  startHour?: number
  /** Last hour displayed, counted from midnight. */
  endHour?: number
}>(), {
  hourHeight: HOUR_HEIGHT,
  startHour: 0,
  endHour: 23,
})

const emit = defineEmits<{
  (e: 'editEvent', event: ScheduleEventUI): void
  (e: 'createRange', payload: { start: number, end: number, allDay: boolean }): void
  (e: 'resizeEvent', payload: { event: ScheduleEventUI, start: number, end: number }): void
}>()

const scrollEl = useTemplateRef('scrollEl')
const gridWrapEl = useTemplateRef('gridWrapEl')
// Annotated rather than inferred: both children take `gestures` as a prop, and
// `gestures` is built from these refs, so inferring their types from the
// template would be circular. All the view wants back is the element each row
// measures its columns against.
const allDayRow = useTemplateRef<{ barsEl: HTMLElement | null }>('allDayRow')
const gridBody = useTemplateRef<{ eventsEl: HTMLElement | null }>('gridBody')

// Current time, refreshed every minute. `0` until mounted keeps SSR and the
// first client render identical.
const nowTimestamp = useIntervalValue(() => Date.now(), 60_000, 0)
const nowMinutes = computed(() => {
  if (!nowTimestamp.value) return -1
  const now = dayjs(nowTimestamp.value)
  return now.hour() * 60 + now.minute()
})
/**
 * Which column is today, from the live clock rather than from `day.isToday` —
 * that flag is a snapshot of when the range was built, so it would keep
 * pointing at yesterday once the view crosses midnight.
 */
const todayKey = computed(() => (nowTimestamp.value ? dayjs(nowTimestamp.value).format('YYYY-MM-DD') : ''))

// ─── Layout ────────────────────────────────────────────────────────────────

const range = computed(() => ({ startHour: props.startHour, endHour: props.endHour }))

const segments = computed(() => buildWeekSegments(props.events, props.days, range.value).segments)

const placed = computed(() => placeSegments(segments.value, {
  mode: props.layoutMode,
  hourHeight: props.hourHeight,
  ...range.value,
}))

const allDay = computed(() => buildAllDayBars(props.events, props.days))

// ─── Gestures ──────────────────────────────────────────────────────────────

const gestures = useWeekGridGestures<ScheduleEventUI>({
  days: () => props.days,
  hourHeight: () => props.hourHeight,
  startHour: () => props.startHour,
  endHour: () => props.endHour,
  gridEl: () => gridBody.value?.eventsEl,
  allDayEl: () => allDayRow.value?.barsEl,
  scrollEl,
  onCommit: payload => emit('resizeEvent', payload),
  onCreate: payload => emit('createRange', payload),
  onEdit: event => emit('editEvent', event),
})

// Keyboard edits are invisible to a screen reader without this.
const liveMessage = ref('')
function announce(message: string) {
  liveMessage.value = message
}

/**
 * Puts focus back on an event after a keyboard edit.
 *
 * An edit can relocate the element the user was standing on: a move to another
 * day changes a segment's key, so Vue mounts a new element rather than patching
 * the old one, and a resize past 24 hours re-homes the event from the grid to
 * the all-day row entirely. Either way the focused element is gone and focus
 * falls to the document, which is outside every handler here — the next
 * keystroke then reaches the browser, and Alt+Left is its Back shortcut.
 *
 * Searched from the view's root so it finds the event on whichever surface the
 * edit left it. An event split across midnight has one element per day; the
 * first is as good a place to stand as any.
 *
 * When nothing matches, the event re-rendered somewhere off screen — most
 * likely into a lane the all-day row has collapsed behind its counter. Focus
 * then goes to the all-day track, which keeps it inside the view: landing on
 * the document instead is what lets the next Alt+Left reach the browser.
 */
function focusEvent(id: string) {
  nextTick(() => {
    const root = scrollEl.value
    if (!root) return
    const el = root.querySelector<HTMLElement>(`[data-event-id="${id}"]`)
    if (el) el.focus()
    else allDayRow.value?.barsEl?.focus()
  })
}

// ─── Scrolling ─────────────────────────────────────────────────────────────

/**
 * Distance from the scroll container's top to the first hour row.
 *
 * Measured from the two boxes rather than read off `offsetTop`, which is
 * relative to the nearest positioned ancestor — not necessarily the scroller.
 */
function gridTop() {
  const el = scrollEl.value
  const grid = gridWrapEl.value
  if (!el || !grid) return 0
  return grid.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop
}

function minuteToOffset(minute: number) {
  return gridTop() + ((minute - props.startHour * 60) / 60) * props.hourHeight
}

/** Scrolls `minute` into view, a third of the way down the viewport. */
function scrollToMinute(minute: number) {
  const el = scrollEl.value
  if (!el) return
  el.scrollTop = Math.max(0, minuteToOffset(minute) - el.clientHeight / 3)
}

onMounted(() => {
  nextTick(() => {
    // Prefer the current time; on a week that isn't this one, the earliest
    // event is the next most useful thing to open on. Earliest by the clock,
    // not by position: segments come out in the order the events arrived.
    if (props.days.some(day => day.key === todayKey.value)) {
      scrollToMinute(nowMinutes.value)
      return
    }
    const starts = segments.value.map(segment => segment.startMin)
    scrollToMinute(starts.length ? Math.min(...starts) : 8 * 60)
  })
})

// Zooming keeps the time at the top of the viewport where it was, so the view
// grows around what the user is looking at instead of jumping.
watch(() => props.hourHeight, (next, previous) => {
  const el = scrollEl.value
  if (!el || !previous) return
  const anchorMinute = ((el.scrollTop - gridTop()) / previous) * 60 + props.startHour * 60
  nextTick(() => {
    el.scrollTop = Math.max(0, gridTop() + ((anchorMinute - props.startHour * 60) / 60) * next)
  })
})
</script>

<template>
  <div
    ref="scrollEl"
    class="week-view relative flex-1 overflow-auto"
    :style="{ '--day-count': days.length, '--gutter-width': '60px' }"
  >
    <!-- Header and all-day row pin to the top of the same scroll container as
      the grid, which is what keeps their columns aligned with it. -->
    <div class="sticky top-0 z-30 bg-abg">
      <WeekHeader :days="days" :today-key="todayKey" />
      <WeekAllDayRow
        ref="allDayRow"
        :days="days"
        :bars="allDay.bars"
        :lane-count="allDay.laneCount"
        :gestures="gestures"
        :announce="announce"
        :focus-event="focusEvent"
      />
    </div>
    <div ref="gridWrapEl">
      <WeekGridBody
        ref="gridBody"
        :days="days"
        :placed="placed"
        :hour-height="hourHeight"
        :start-hour="startHour"
        :end-hour="endHour"
        :gestures="gestures"
        :today-key="todayKey"
        :now-minutes="nowMinutes"
        :announce="announce"
        :focus-event="focusEvent"
      />
    </div>
    <!-- `sr-only` is absolutely positioned with no offsets, so it lands at its
      static position below the grid. The `relative` on the scroll container is
      what keeps that box inside the scroller rather than stretching the page. -->
    <p class="sr-only" role="status" aria-live="polite">
      {{ liveMessage }}
    </p>
  </div>
</template>

<style scoped>
/*
 * The browser's own scroll anchoring also reacts to the grid changing height
 * on zoom, and lands somewhere other than where the watcher above puts it.
 * Only one of the two can win, and ours knows which minute to keep.
 */
.week-view {
  overflow-anchor: none;
}

/*
 * One column template for the header, the all-day row and the grid. They live
 * in three components but must line up to the pixel, so the template is
 * defined once here and inherited through `--day-count` / `--gutter-width`.
 * `:deep` reaches the copy inside WeekGridBody, which is not a root element.
 */
.week-grid,
:deep(.week-grid) {
  display: grid;
  grid-template-columns: var(--gutter-width) repeat(var(--day-count), minmax(0, 1fr));
}
</style>
