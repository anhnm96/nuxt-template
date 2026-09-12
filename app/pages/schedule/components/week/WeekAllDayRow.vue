<script setup lang="ts">
import type useWeekGridGestures from '../../composables/useWeekGridGestures'
import type { AllDayBar } from '../../utils/week'
import type { ScheduleEventUI } from '~/services/schedule'
import type { DayColumn } from '~/utils/schedule'
import dayjs from 'dayjs/esm'
import { countHiddenPerColumn, isPromotedToAllDay } from '../../utils/week'
import WeekAllDayBar from './WeekAllDayBar.vue'

const props = defineProps<{
  days: DayColumn[]
  bars: AllDayBar[]
  laneCount: number
  gestures: ReturnType<typeof useWeekGridGestures<ScheduleEventUI>>
  /** Sends a message to the view's live region after a keyboard edit. */
  announce: (message: string) => void
  /** Returns focus to an event after an edit has re-rendered or re-homed it. */
  focusEvent: (id: string) => void
}>()

/** Height of one bar and the gap below it, in px. */
const BAR_HEIGHT = 20
const LANE_GAP = 4
const ROW_PADDING = 4
/** Lanes shown before the row collapses the rest behind a counter. */
const VISIBLE_LANES = 3
/** Height of the "+N more" strip. */
const CHIP_HEIGHT = 16

const barsEl = useTemplateRef('barsEl')
defineExpose({ barsEl })

const expanded = ref(false)
const focusedKey = ref<string | null>(null)

const dayCount = computed(() => props.days.length)
const visibleLanes = computed(() =>
  expanded.value ? props.laneCount : Math.min(props.laneCount, VISIBLE_LANES))
const hiddenPerColumn = computed(() =>
  countHiddenPerColumn(props.bars, visibleLanes.value, dayCount.value))
const hasHidden = computed(() => hiddenPerColumn.value.some(count => count > 0))

const rowHeight = computed(() =>
  ROW_PADDING * 2
  + Math.max(visibleLanes.value, 1) * (BAR_HEIGHT + LANE_GAP)
  + (hasHidden.value ? CHIP_HEIGHT : 0))

/** Bars in reading order, which is also the keyboard navigation order. */
const ordered = computed(() =>
  [...props.bars].sort((a, b) => a.startIndex - b.startIndex || a.lane - b.lane))

const visibleBars = computed(() => props.bars.filter(bar => bar.lane < visibleLanes.value))

/** The row's single tab stop: the focused bar, or the first one. */
const tabbableKey = computed(() =>
  visibleBars.value.some(bar => bar.key === focusedKey.value)
    ? focusedKey.value
    : visibleBars.value[0]?.key ?? null)

/** Column span of a bar, following the live preview while it is dragged. */
function spanOf(bar: AllDayBar) {
  const preview = props.gestures.dragPreview.value
  if (preview?.surface === 'allDay' && preview.event.id === bar.event.id)
    return { startIndex: preview.start, endIndex: preview.end }
  return { startIndex: bar.startIndex, endIndex: bar.endIndex }
}

function barStyle(bar: AllDayBar) {
  const { startIndex, endIndex } = spanOf(bar)
  const width = 100 / dayCount.value
  return {
    left: `calc(${startIndex * width}% + 2px)`,
    width: `calc(${(endIndex - startIndex + 1) * width}% - 4px)`,
    top: `${ROW_PADDING + bar.lane * (BAR_HEIGHT + LANE_GAP)}px`,
    height: `${BAR_HEIGHT}px`,
  }
}

/** Translucent selection shown while dragging empty row space. */
const createStyle = computed(() => {
  const drag = props.gestures.createDrag.value
  if (drag?.surface !== 'allDay') return null
  const lo = Math.min(drag.start, drag.end)
  const hi = Math.max(drag.start, drag.end)
  const width = 100 / dayCount.value
  return {
    left: `calc(${lo * width}% + 2px)`,
    width: `calc(${(hi - lo + 1) * width}% - 4px)`,
    top: `${ROW_PADDING}px`,
    height: `${BAR_HEIGHT}px`,
  }
})

/** `focusin` bubbles where `focus` does not, so one listener covers every bar. */
function onFocusIn(nativeEvent: FocusEvent) {
  const el = (nativeEvent.target as HTMLElement | null)?.closest<HTMLElement>('[data-bar-key]')
  if (el) focusedKey.value = el.dataset.barKey ?? null
}

function focusBar(key: string | null) {
  if (!key) return
  focusedKey.value = key
  nextTick(() => barsEl.value?.querySelector<HTMLElement>(`[data-bar-key="${key}"]`)?.focus())
}

function moveFocus(step: number, fromKey: string) {
  const list = ordered.value.filter(bar => bar.lane < visibleLanes.value)
  if (!list.length) return
  const current = list.findIndex(bar => bar.key === fromKey)
  const next = list[clamp(current + step, 0, list.length - 1)]
  focusBar(next?.key ?? null)
}

function describeRange(start: number, end: number) {
  const from = dayjs(start).format('ddd D MMM')
  const to = dayjs(end).format('ddd D MMM')
  return from === to ? from : `${from} to ${to}`
}

/**
 * A promoted bar is a timed event drawn here only while it stays at least 24
 * hours long; a resize can take it under that, which returns it to the time
 * grid. Worth saying out loud for the same reason the grid announces the
 * opposite direction: the bar leaves the row, and a user who cannot see that
 * happen is otherwise told only that the dates changed.
 */
function demotionNote(bar: AllDayBar, range: { start: number, end: number }) {
  if (!bar.promoted || isPromotedToAllDay({ timed: true, ...range })) return ''
  return ', now in the time grid'
}

/**
 * Keyboard editing, mirroring the grid's model one axis down: plain arrows
 * move focus, Shift moves the event, Alt resizes its end (Alt+Shift its start).
 */
function onKeydown(nativeEvent: KeyboardEvent) {
  const horizontal = nativeEvent.key === 'ArrowLeft' ? -1 : nativeEvent.key === 'ArrowRight' ? 1 : 0

  // Which bar the keys act on comes from what actually holds focus, never from
  // the roving tab stop. The track itself is focusable — clicking empty space
  // lands there — and answering that with the tab stop's fallback would edit
  // whichever bar happens to be first, an event the user never selected.
  const focused = (nativeEvent.target as HTMLElement | null)?.closest<HTMLElement>('[data-bar-key]')
  const bar = focused ? props.bars.find(item => item.key === focused.dataset.barKey) : undefined
  if (!bar) {
    // Focus is on the track: an arrow steps into the row rather than editing.
    if (horizontal) {
      nativeEvent.preventDefault()
      focusBar(visibleBars.value[0]?.key ?? null)
    }
    return
  }

  if (horizontal && nativeEvent.altKey) {
    nativeEvent.preventDefault()
    const edge = nativeEvent.shiftKey ? 'start' : 'end'
    // `wholeDays` for a true all-day event, which can shrink to one day and no
    // further. A promoted bar is a timed event drawn here: it keeps the snap
    // floor, and shrinking it under 24h returns it to the grid.
    const range = props.gestures.resizeEventBy(bar.event, edge, { days: horizontal, wholeDays: !bar.promoted })
    if (!range) return
    props.announce(`${bar.event.title} ${edge} moved, now ${describeRange(range.start, range.end)}${demotionNote(bar, range)}`)
    props.focusEvent(bar.event.id)
    return
  }
  if (horizontal && nativeEvent.shiftKey) {
    nativeEvent.preventDefault()
    if (!bar.fullyVisible) return
    const range = props.gestures.nudgeEvent(bar.event, { days: horizontal })
    props.announce(`${bar.event.title} moved to ${describeRange(range.start, range.end)}`)
    props.focusEvent(bar.event.id)
    return
  }
  if (horizontal) {
    nativeEvent.preventDefault()
    moveFocus(horizontal, bar.key)
    return
  }
  if (nativeEvent.key === 'Enter' || nativeEvent.key === ' ') {
    nativeEvent.preventDefault()
    props.gestures.onEventClick(bar.event)
  }
}
</script>

<template>
  <div class="week-grid border-b border-elevated/40">
    <div class="flex items-start justify-end pt-1.5 pr-2 text-xs">
      All day
    </div>
    <!-- Column dividers sit behind the bars, which are positioned against the
      whole span so they can cross columns. -->
    <div class="relative" style="grid-column: 2 / -1">
      <div class="pointer-events-none absolute inset-0 grid" :style="{ gridTemplateColumns: `repeat(${dayCount}, minmax(0, 1fr))` }">
        <div v-for="day in days" :key="day.key" class="border-l border-elevated" />
      </div>
      <!-- `tabindex="-1"`: not a tab stop, but focusable by script, so a click
        on empty all-day space lands focus inside the view rather than leaving
        it wherever it was. -->
      <div
        ref="barsEl"
        class="relative outline-none"
        tabindex="-1"
        :style="{ height: `${rowHeight}px` }"
        title="Double-click or drag to create"
        @focusin="onFocusIn"
        @dblclick="gestures.createAtAllDay($event)"
        @pointerdown="gestures.startAllDayCreate($event)"
        @keydown="onKeydown"
      >
        <WeekAllDayBar
          v-for="bar in visibleBars"
          :key="bar.key"
          :data-bar-key="bar.key"
          :data-event-id="bar.event.id"
          :bar="bar"
          :bar-style="barStyle(bar)"
          :dragging="gestures.isDragging.value"
          :drag-target="gestures.isDragTarget(bar.event)"
          :tabbable="bar.key === tabbableKey"
          @move="gestures.startAllDayMove($event, bar.event, bar.startIndex, bar.endIndex, bar.fullyVisible)"
          @resize="(nativeEvent, edge) => gestures.startAllDayResize(nativeEvent, bar.event, edge, bar.startIndex, bar.endIndex)"
          @edit="gestures.onEventClick(bar.event)"
        />
        <!-- Drag-to-create selection -->
        <div
          v-if="createStyle"
          class="pointer-events-none absolute rounded-md border border-dashed border-primary bg-primary/15"
          :style="createStyle"
        />
        <!-- Overflow counters, one per column that has bars below the cap -->
        <div
          v-if="hasHidden"
          class="absolute inset-x-0 bottom-0 grid"
          :style="{ gridTemplateColumns: `repeat(${dayCount}, minmax(0, 1fr))` }"
        >
          <button
            v-for="(count, index) in hiddenPerColumn"
            :key="index"
            type="button"
            class="mx-0.5 truncate text-[10px] leading-4 text-muted hover:text-default"
            :class="!count && 'invisible'"
            @pointerdown.stop
            @click.stop="expanded = true"
          >
            +{{ count }} more
          </button>
        </div>
      </div>
      <button
        v-if="expanded && laneCount > VISIBLE_LANES"
        type="button"
        class="absolute right-1 bottom-0 text-[10px] text-muted hover:text-default"
        @click.stop="expanded = false"
      >
        Show less
      </button>
    </div>
  </div>
</template>
