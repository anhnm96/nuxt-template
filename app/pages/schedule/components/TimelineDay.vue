<script setup lang="ts">
import type { Dayjs } from 'dayjs/esm'
import type { TimelineDragItem } from '../composables/useTimelineGestures'
import type { OffscreenChip } from '../utils'
import type { CalendarGroup, CalendarItem, ScheduleEventUI } from '~/services/schedule'
import type { AllDayDisplay } from '~/utils/schedule'
import dayjs from 'dayjs/esm'
import Accordion from '~/components/base/accordion/Accordion.vue'
import AccordionContent from '~/components/base/accordion/AccordionContent.vue'
import AccordionHeader from '~/components/base/accordion/AccordionHeader.vue'
import AccordionPanel from '~/components/base/accordion/AccordionPanel.vue'
import { ALL_DAY_DISPLAY } from '~/utils/schedule'
import useTimelineGestures from '../composables/useTimelineGestures'
import { assignLanes, clampEventToRangeMinutes, computeOffscreenChips } from '../utils'
import EventTooltip from './EventTooltip.vue'
import TimelineEventBar from './TimelineEventBar.vue'

const props = withDefaults(defineProps<{
  events: ScheduleEventUI[]
  calendars: CalendarGroup[]
  /** Anchors the visible week; the timeline spans the whole week containing it. */
  selectedDay: Dayjs
  // calendar ids checked in the sidebar; only these calendars get a row.
  selectedCalendarIds: string[]
  /**
   * Where all-day events are drawn: in their own frozen column (default), or
   * as bars on the timeline spanning the days they cover — which drops the
   * column entirely, widening the timeline by its 180px.
   */
  allDayDisplay?: AllDayDisplay
}>(), {
  allDayDisplay: ALL_DAY_DISPLAY.COLUMN,
})

// Clicking an event asks the parent to open the edit dialog; dragging empty
// space asks it to open the create dialog.
const emit = defineEmits<{
  (e: 'editEvent', event: ScheduleEventUI): void
  (e: 'createRange', payload: { start: number, end: number, calendarId: CalendarItem['id'], allDay: boolean }): void
  // Dragging an event's edge handle to change its start/end time.
  (e: 'resizeEvent', payload: { event: ScheduleEventUI, start: number, end: number }): void
}>()

const HOURS_PER_DAY = 24
const DAYS_PER_WEEK = 7

// The timeline spans a whole week: hours (and every minute value below) are
// counted from midnight of the week's first day, so hour 24 is the second
// day's midnight and hour 167 the last day's 23:00.
const startHour = 0
const endHour = DAYS_PER_WEEK * HOURS_PER_DAY - 1
const hourWidth = 112
const labelWidth = 220
const allDayWidth = 180
const dayHeaderHeight = 30
const hourHeaderHeight = 30
const headerHeight = dayHeaderHeight + hourHeaderHeight
const groupHeight = 44
const rowHeight = 72
// Height per lane, gap between lanes, and vertical padding within a row.
const eventHeight = 28
const laneGap = 6
const rowPaddingY = 8
const dayWidth = HOURS_PER_DAY * hourWidth
const timelineWidth = (endHour - startHour + 1) * hourWidth

// All-day events either get their own frozen column or ride on the timeline;
// with the column gone its width is reclaimed by the timeline.
const showAllDayColumn = computed(() => props.allDayDisplay === ALL_DAY_DISPLAY.COLUMN)
// Offset of the timeline's left edge (combined width of the frozen columns).
const timelineLeft = computed(() => labelWidth + (showAllDayColumn.value ? allDayWidth : 0))

const hours = Array.from(
  { length: endHour - startHour + 1 },
  (_, index) => startHour + index,
)

// Monday of the week containing the selected day (Sun=0 -> 6), and midnight of
// that day — the origin every minute value on the timeline is measured from.
const weekStart = computed(() => {
  const offset = (props.selectedDay.day() + 6) % 7
  return props.selectedDay.subtract(offset, 'day').startOf('day')
})

// Column axis of the day header row.
const weekDays = computed(() => {
  const today = dayjs()
  return Array.from({ length: DAYS_PER_WEEK }, (_, index) => {
    const date = weekStart.value.add(index, 'day')
    return {
      key: date.format('YYYY-MM-DD'),
      label: date.format('ddd'),
      date: date.format('MMM D'),
      isToday: date.isSame(today, 'day'),
    }
  })
})

// Convert minutes since the timeline start into an X coordinate (px).
function minutesToLeft(minutes: number) {
  return ((minutes - startHour * 60) / 60) * hourWidth
}

// Convert minutes since the timeline start back into a date.
function minutesToDate(minutes: number) {
  return weekStart.value.add(minutes, 'minute')
}

// Total height of `count` stacked lanes, gaps included.
function stackHeight(count: number) {
  return count * eventHeight + Math.max(count - 1, 0) * laneGap
}

// Y offset of a lane within a row; the lane stack is vertically centered.
function laneTop(row: { laneCount: number, height: number }, lane: number) {
  return (row.height - stackHeight(row.laneCount)) / 2 + lane * (eventHeight + laneGap)
}

// Keep only events that overlap the visible week (the parent passes down a whole month's events).
const weekEvents = computed(() => {
  const start = weekStart.value.valueOf()
  const end = weekStart.value.add(DAYS_PER_WEEK, 'day').valueOf()
  return props.events.filter(event => event.start < end && event.end >= start)
})

// Map of calendar id → that calendar's events.
const eventsByCalendar = computed(() => {
  const map = new Map<string, ScheduleEventUI[]>()
  for (const event of weekEvents.value) {
    const key = event.resourceId
    const list = map.get(key)
    if (list) list.push(event)
    else map.set(key, [event])
  }
  return map
})

type LaidOutEvent = TimelineDragItem<ScheduleEventUI>

// Only calendars checked in the sidebar get a row (matches the events already
// being filtered down to the same selection).
const selectedCalendarIdSet = computed(() => new Set(props.selectedCalendarIds))

// For each calendar group, compute each calendar row's event layout and height.
const layout = computed(() =>
  props.calendars.map((group) => {
    const visibleCalendars = group.children.filter(calendar => selectedCalendarIdSet.value.has(calendar.id))
    const rows = visibleCalendars.map((calendar) => {
      const calendarEvents = eventsByCalendar.value.get(calendar.id) ?? []
      // With the all-day column on, all-day events are pulled out of the
      // timeline; otherwise they share its lanes with the timed ones.
      const allDayEvents = showAllDayColumn.value ? calendarEvents.filter(event => !event.timed) : []
      const { items, laneCount } = assignLanes(
        calendarEvents
          .filter(event => event.timed || !showAllDayColumn.value)
          .map(event => ({
            event,
            ...clampEventToRangeMinutes(event, weekStart.value, startHour, endHour),
          })),
      )
      // Height that fits both the timed and all-day stacks (minimum is the default row height).
      const height = Math.max(
        rowHeight,
        stackHeight(laneCount) + rowPaddingY * 2,
        stackHeight(allDayEvents.length) + rowPaddingY * 2,
      )
      return { calendar, items, laneCount, allDayEvents, height }
    })
    return {
      id: group.id,
      title: group.title,
      count: visibleCalendars.length,
      rows,
    }
  }))
const expandedGroups = ref<Set<string>>(new Set())
// Initially expand all groups with visible calendars
const clean = watch(layout, (newVal) => {
  if (!newVal.length) return
  if (expandedGroups.value.size) {
    clean?.()
    return
  }
  expandedGroups.value = new Set(layout.value.map(group => group.id))
}, { immediate: true })

// All pointer interaction (resize by edge, move the bar, drag empty space to
// create) lives in one composable: the three share a single drag state.
const {
  dragPreview,
  createDrag,
  isDragging,
  isDragTarget,
  startResize,
  startMove,
  startCreate,
  onEventClick,
} = useTimelineGestures<ScheduleEventUI>({
  rangeStart: weekStart,
  hourWidth,
  startHour,
  endHour,
  onCommit: payload => emit('resizeEvent', payload),
  onCreate: payload => emit('createRange', payload),
  onEdit: event => emit('editEvent', event),
})

// Compute an event's position/size from its lane (lanes are vertically
// centered within the row).
function eventStyle(item: LaidOutEvent, row: { laneCount: number, height: number }) {
  // Only follow the preview values while moving. While resizing, keep the
  // body at its original size and show the new size via a dashed ghost
  // instead (mirrors React's gantt-drag-ghost).
  const preview = isDragTarget(item) && dragPreview.value?.edge === 'move' ? dragPreview.value : null
  const startMin = preview ? preview.startMin : item.startMin
  const endMin = preview ? preview.endMin : item.endMin
  const left = minutesToLeft(startMin)
  return {
    left: `${left}px`,
    width: `${Math.max(minutesToLeft(endMin) - left, 8)}px`,
    top: `${laneTop(row, item.lane)}px`,
    height: `${eventHeight}px`,
  }
}

const BADGE_GAP = 10 // Gap between the bar and the drag badge.
const BADGE_HEIGHT = 24 // Approximate height of the badge + its arrow.

/**
 * Everything the template needs to draw the current drag, resolved once per
 * drag change rather than re-derived per row on every render.
 *
 * Only one row can host the dragged event, so this is a single object keyed
 * by `calendarId` instead of a per-row map; the template matches it against
 * the row it is rendering.
 *
 * - `ghost` — the proposed range as a dashed outline, resize only (on a move
 *   the bar itself follows the pointer, so a ghost would just duplicate it).
 * - `badge` — the time label, placed above the bar (below when there's no
 *   room) and centered on the edge being dragged, mirroring React's
 *   gantt-resize-indicator chip.
 */
const dragVisual = computed(() => {
  const drag = dragPreview.value
  if (!drag) return null
  for (const group of layout.value) {
    for (const [rowIndex, row] of group.rows.entries()) {
      // Match by id: layout recomputation replaces LaidOutEvent references.
      const item = row.items.find(i => i.event.id === drag.item.event.id)
      if (!item) continue

      const left = minutesToLeft(drag.startMin)
      const right = minutesToLeft(drag.endMin)
      const top = laneTop(row, item.lane)

      // X of the edge being dragged (a move has no single edge, so use the center).
      const badgeX = drag.edge === 'start' ? left : drag.edge === 'end' ? right : (left + right) / 2
      // Default to above the bar; overflowing upward merely overlaps the row
      // above, which is harmless. The first row is the exception: without room
      // above it would be clipped by AccordionContent/the header, so flip below.
      const above = rowIndex > 0 || top - BADGE_GAP - BADGE_HEIGHT >= 0
      // Both ends are shown with their day once the drag crosses midnight.
      const from = minutesToDate(drag.startMin)
      const to = minutesToDate(drag.endMin)
      const fmt = from.isSame(to, 'day') ? 'HH:mm' : 'MMM D HH:mm'

      return {
        calendarId: row.calendar.id,
        label: `${from.format(fmt)} - ${to.format(fmt)}`,
        ghost: drag.edge === 'move'
          ? null
          : {
              'left': `${left}px`,
              'width': `${Math.max(right - left, 8)}px`,
              'top': `${top}px`,
              'height': `${eventHeight}px`,
              '--event-color': item.event.color,
            },
        badge: {
          above,
          style: {
            left: `${badgeX}px`,
            top: `${above ? top - BADGE_GAP - BADGE_HEIGHT : top + eventHeight + BADGE_GAP}px`,
            transform: 'translateX(-50%)',
          },
        },
      }
    }
  }
  return null
})

// Clicking the all-day column creates a new all-day event for that day.
function createAllDay(row: { calendar: CalendarItem }) {
  const start = props.selectedDay.startOf('day').valueOf()
  emit('createRange', { start, end: start, calendarId: row.calendar.id, allDay: true })
}

// Position/width of the drag-selection preview.
function selectionStyle() {
  if (!createDrag.value) return {}
  const lo = Math.min(createDrag.value.startMin, createDrag.value.endMin)
  const hi = Math.max(createDrag.value.startMin, createDrag.value.endMin)
  const left = minutesToLeft(lo)
  return { left: `${left}px`, width: `${Math.max(minutesToLeft(hi) - left, 2)}px` }
}

// Current time, refreshed every minute. initial: 0 for SSR safety (the real
// time is set after mount, which also keeps the now-line hidden until then).
const nowTimestamp = useIntervalValue(() => Date.now(), 60_000, 0)

// Now as a minute of the displayed week.
const nowMinutes = computed(() => dayjs(nowTimestamp.value).diff(weekStart.value, 'minute'))

const nowLeft = computed(() => minutesToLeft(nowMinutes.value))

const showNow = computed(() => nowTimestamp.value > 0
  && nowMinutes.value >= startHour * 60
  && nowMinutes.value <= (endHour + 1) * 60)

// Horizontal scroll container element (used to scroll to the now-line on mount).
const scrollContainer = ref<HTMLElement | null>(null)

// #region offscreen chips
// ─────────────────────────────────────────────────────────────
// Offscreen-event chips: when all of a row's events are outside the visible
// window, show a button on the relevant edge(s); clicking scrolls to the
// nearest event (mirrors React's GanttOffscreenChips).
//   The detection logic lives in the pure function computeOffscreenChips
//   (utils), and scroll-state tracking in the useHorizontalViewport
//   composable, so both are easy to test and reuse.
// ─────────────────────────────────────────────────────────────
// Track scrollLeft / clientWidth. Used only to decide chip visibility and
// scroll target (horizontal position is left to CSS position:sticky, so a
// frame of lag here never causes position jitter).
const { scrollLeft, viewportWidth, sync: syncViewport } = useHorizontalViewport(scrollContainer)
const OFFSCREEN_CHIP_PAD = 8 // Padding from the edge (sticky offset).
const OFFSCREEN_REVEAL_PAD = 24 // How far an event's edge is kept from the viewport edge after scrolling.

// calendarId → chips (recomputed on scroll/resize/layout changes).
//   Converts events to px ranges + the event itself, passed to the pure
//   function. `item` is the nearest event, used for the tooltip.
const offscreenChips = computed(() => {
  const visStart = scrollLeft.value
  const visW = viewportWidth.value - timelineLeft.value // Visible timeline width, excluding the frozen columns.
  const map: Record<string, OffscreenChip<ScheduleEventUI>[]> = {}
  for (const group of layout.value) {
    for (const row of group.rows) {
      const ranges = row.items.map(item => ({ start: minutesToLeft(item.startMin), end: minutesToLeft(item.endMin), item: item.event }))
      map[row.calendar.id] = computeOffscreenChips(ranges, visStart, visW, OFFSCREEN_REVEAL_PAD)
    }
  }
  return map
})
function scrollToChip(chip: OffscreenChip<ScheduleEventUI>) {
  scrollContainer.value?.scrollTo({ left: chip.target, behavior: 'smooth' })
}
// #endregion offscreen chips

/**
 * Scroll horizontally to the part of the week worth looking at: the now-line
 * when the current time falls inside it, otherwise the selected day's morning.
 * The week is seven times wider than the viewport, so this is what makes the
 * view land somewhere useful instead of at Monday midnight.
 */
function scrollToFocus(behavior: ScrollBehavior = 'auto') {
  const el = scrollContainer.value
  if (!el) return
  const focusMinutes = showNow.value
    ? nowMinutes.value
    : props.selectedDay.startOf('day').add(8, 'hour').diff(weekStart.value, 'minute')
  const visibleTimelineWidth = el.clientWidth - timelineLeft.value
  el.scrollTo({
    left: clamp(minutesToLeft(focusMinutes) - visibleTimelineWidth / 2, 0, timelineWidth - visibleTimelineWidth),
    behavior,
  })
  syncViewport() // Reflect the programmatic scroll immediately.
}

onMounted(() => nextTick(() => scrollToFocus()))

// Moving to another week starts over at that week's focus point.
watch(weekStart, () => nextTick(() => scrollToFocus('smooth')))
</script>

<template>
  <div ref="scrollContainer" class="timeline-day h-full overflow-auto rounded-md border border-elevated">
    <div
      class="relative min-h-full"
      :style="{ width: `${timelineLeft + timelineWidth}px`, minWidth: '100%' }"
    >
      <!-- header -->
      <div class="sticky top-0 z-(--z-header) flex border-b border-elevated/80 bg-abg/60 backdrop-blur-xs" :style="{ height: `${headerHeight}px` }">
        <div
          class="sticky left-0 z-(--z-header-col) flex shrink-0 items-center gap-2 border-r border-elevated bg-abg/60 px-5 font-semibold backdrop-blur-xl"
          :style="{ width: `${labelWidth}px` }"
        >
          <Icon size="18" name="mdi:calendar-blank-outline" />
          Calendars
        </div>
        <div
          v-if="showAllDayColumn"
          class="sticky z-(--z-header-col) flex shrink-0 items-center gap-2 border-r border-elevated bg-abg/60 px-4 font-semibold backdrop-blur-xl"
          :style="{ left: `${labelWidth}px`, width: `${allDayWidth}px` }"
        >
          <Icon size="18" name="mdi:weather-sunny" />
          All day
        </div>
        <div class="flex flex-col" :style="{ width: `${timelineWidth}px` }">
          <!-- day labels -->
          <div class="flex" :style="{ height: `${dayHeaderHeight}px` }">
            <div
              v-for="day in weekDays"
              :key="day.key"
              class="relative flex shrink-0 items-center border-elevated not-first:border-l"
              :style="{ width: `${dayWidth}px` }"
            >
              <!-- sticky so the label stays in view while its day is scrolled through -->
              <span
                class="sticky flex items-center gap-1.5 px-3 text-sm font-semibold"
                :class="day.isToday && 'text-primary'"
                :style="{ left: `${timelineLeft}px` }"
              >
                {{ day.label }}
                <span
                  class="rounded-full px-1.5 py-0.5 leading-none"
                  :class="day.isToday && 'text-primary'"
                >{{ day.date }}</span>
              </span>
            </div>
          </div>
          <!-- hour labels -->
          <div class="flex border-t border-elevated/60" :style="{ height: `${hourHeaderHeight}px` }">
            <div
              v-for="hour in hours"
              :key="hour"
              class="relative flex shrink-0 items-center not-first:border-l"
              :class="hour % HOURS_PER_DAY === 0 ? 'border-elevated' : 'border-elevated/50'"
              :style="{ width: `${hourWidth}px` }"
            >
              <span
                class="sticky px-3 text-xs font-medium text-muted"
                :style="{ left: `${timelineLeft}px` }"
              >
                {{ (hour % HOURS_PER_DAY).toString().padStart(2, "0") }}:00
              </span>
            </div>
          </div>
        </div>
        <!-- Now-dot: placed inside the header
         (at the header/body boundary) to avoid clipping -->
        <span
          v-if="showNow"
          data-slot="gantt-now-dot"
          aria-hidden="true"
          class="pointer-events-none absolute -bottom-0.75 z-(--z-now-dot) size-2 translate-x-[calc(-50%+1px)] rounded-full bg-rose-500"
          :style="{ left: `${timelineLeft + nowLeft}px` }"
        />
      </div>
      <!-- main -->
      <div class="relative">
        <!-- Rows for each calendar group -->
        <Accordion v-model="expandedGroups" class="relative bg-surface/60" multiple-expanded>
          <!-- Hourly grid lines -->
          <div
            class="pointer-events-none absolute inset-y-0 z-(--z-grid)"
            :style="{ left: `${timelineLeft}px`, width: `${timelineWidth}px` }"
          >
            <div v-for="hour in hours.slice(0, -1)" :key="hour" class="first:[&_div]:first:border-none">
              <!-- day boundaries are drawn stronger than the hours inside them -->
              <div
                class="absolute inset-y-0 border-l"
                :class="hour % HOURS_PER_DAY === 0 ? 'border-elevated' : 'border-elevated/50'"
                :style="{ left: `${(hour - startHour) * hourWidth}px` }"
              />
              <div
                class="absolute inset-y-0 border-l border-dashed border-elevated/50"
                :style="{ left: `${(hour - startHour + 0.5) * hourWidth}px` }"
              />
            </div>
          </div>

          <!-- Now-line (below the pinned columns, above the events) -->
          <div
            v-if="showNow"
            data-slot="gantt-now-line"
            class="pointer-events-none absolute inset-y-0 z-(--z-now-line) w-px bg-rose-500"
            :style="{ left: `${timelineLeft + nowLeft}px` }"
          />
          <AccordionPanel v-for="group in layout" :key="group.title" :value="group.id">
            <!-- Group heading -->
            <AccordionHeader class="items-center gap-0! border-b border-elevated/80" :style="{ height: `${groupHeight}px` }">
              <template #custom>
                <div
                  class="sticky left-0 z-(--z-sticky) flex h-full shrink-0 items-center gap-2 border-r border-elevated/80 bg-elevated/20 px-3 font-semibold backdrop-blur-xs transition-colors group-hover:bg-elevated/50"
                  :style="{ width: `${timelineLeft}px` }"
                >
                  <Icon
                    size="18"
                    name="mdi:chevron-down"
                    class="shrink-0 transition-transform group-data-[state=open]:-scale-y-100"
                  />
                  <span class="truncate">{{ group.title }}</span>
                  <span class="shrink-0 text-muted">{{ group.count }}</span>
                </div>
                <div class="h-full bg-elevated/20 transition-colors group-hover:bg-elevated/50" :style="{ width: `${timelineWidth}px` }" />
              </template>
            </AccordionHeader>

            <!-- Each calendar's row (one calendar = one row; overlaps split into lanes) -->
            <AccordionContent class="*:relative *:py-0">
              <div
                v-for="row in group.rows"
                :key="row.calendar.id"
                class="flex transition-colors hover:bg-surface-inverted/5"
                :style="{ height: `${row.height}px` }"
              >
                <!-- Calendar name column -->
                <div
                  class="sticky left-0 z-(--z-sticky) flex shrink-0 items-center gap-2 border-r border-b border-elevated/80 bg-abg/60 px-6 text-sm backdrop-blur-xs"
                  :style="{ width: `${labelWidth}px` }"
                  :title="row.calendar.title"
                >
                  <span class="size-2 shrink-0 rounded-full" :style="{ backgroundColor: row.calendar.color }" />
                  <span class="line-clamp-2 break-all">{{ row.calendar.title }}</span>
                </div>
                <!-- All-day events column -->
                <div
                  v-if="showAllDayColumn"
                  class="sticky z-(--z-sticky) flex shrink-0 cursor-pointer flex-col justify-center gap-1.5 overflow-hidden border-r border-b border-elevated/80 bg-abg/60 px-2 backdrop-blur-xs"
                  :style="{ left: `${labelWidth}px`, width: `${allDayWidth}px` }"
                  @click="createAllDay(row)"
                >
                  <div
                    v-for="event in row.allDayEvents"
                    :key="event.id"
                    class="timeline-event flex cursor-pointer items-center overflow-hidden rounded-md px-2 select-none"
                    :style="{ 'height': `${eventHeight}px`, '--event-color': event.color }"
                    :title="event.title"
                    @click.stop="emit('editEvent', event)"
                  >
                    <div class="flex items-center gap-0.5 truncate text-xs leading-tight font-semibold">
                      <span>{{ event.title }}</span>
                    </div>
                    <EventTooltip :event="event" :dragging="isDragging" />
                  </div>
                </div>
                <div
                  data-timeline-row
                  class="relative border-b border-elevated/80"
                  :style="{ width: `${timelineWidth}px` }"
                  @pointerdown="startCreate($event, row.calendar.id)"
                >
                  <!-- Drag-selection preview -->
                  <div
                    v-if="createDrag && createDrag.calendarId === row.calendar.id"
                    class="pointer-events-none absolute inset-y-1 rounded-lg border border-primary/60 bg-primary/15"
                    :style="selectionStyle()"
                  />
                  <!-- Drag visuals, rendered only on the row hosting the dragged event -->
                  <template v-if="dragVisual && dragVisual.calendarId === row.calendar.id">
                    <!-- Resize ghost: shows the new size as a dashed outline (the body stays at its original position) -->
                    <div
                      v-if="dragVisual.ghost"
                      data-slot="gantt-drag-ghost"
                      class="resize-ghost pointer-events-none absolute z-(--z-ghost) flex items-center overflow-hidden rounded-lg border border-dashed px-3"
                      :style="dragVisual.ghost"
                    />
                    <!-- Drag-time preview (shown above/below the bar with an arrow) -->
                    <div
                      class="drag-badge pointer-events-none absolute z-(--z-badge) rounded bg-abg px-1.5 py-0.5 text-xs font-semibold whitespace-nowrap shadow ring-1 ring-elevated"
                      :class="dragVisual.badge.above ? 'drag-badge--above' : 'drag-badge--below'"
                      :style="dragVisual.badge.style"
                    >
                      {{ dragVisual.label }}
                      <span class="drag-badge__arrow" aria-hidden="true" />
                    </div>
                  </template>
                  <TimelineEventBar
                    v-for="item in row.items"
                    :key="item.event.id"
                    :item="item"
                    :bar-style="eventStyle(item, row)"
                    :drag-target="isDragTarget(item)"
                    :moving="dragPreview?.edge === 'move' && isDragTarget(item)"
                    :dragging="isDragging"
                    :sticky-left="timelineLeft"
                    @move="startMove($event, item)"
                    @resize="(pointerEvent, edge) => startResize(pointerEvent, item, edge)"
                    @edit="onEventClick(item.event)"
                  />
                  <!-- Offscreen-event chip layer -->
                  <div
                    v-if="offscreenChips[row.calendar.id]!.length"
                    data-slot="gantt-offscreen-chips"
                    class="pointer-events-none absolute inset-0 z-(--z-sticky) flex items-center"
                  >
                    <button
                      v-for="chip in offscreenChips[row.calendar.id]"
                      :key="chip.side"
                      type="button"
                      class="hit-area-1 pointer-events-auto sticky flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full border border-elevated bg-abg text-muted shadow-sm transition-colors hover:text-default"
                      :class="{ 'ms-auto': chip.side === 'end' }"
                      :style="chip.side === 'start' ? { left: `${timelineLeft + OFFSCREEN_CHIP_PAD}px` } : { right: `${OFFSCREEN_CHIP_PAD}px` }"
                      :aria-label="chip.side === 'start' ? 'Previous Event' : 'Next Event'"
                      @pointerdown.stop
                      @click.stop="scrollToChip(chip)"
                    >
                      <Icon size="16" :name="chip.side === 'start' ? 'mdi:chevron-left' : 'mdi:chevron-right'" />
                      <!-- Detail tooltip for the nearest offscreen event.
                        start opens to the right, end to the left. -->
                      <EventTooltip :event="chip.item" :placement="chip.side === 'start' ? 'right' : 'left'" :dragging="isDragging" />
                    </button>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionPanel>
        </Accordion>
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
 * Stacking order for the whole component, in one place.
 *
 * z-index only competes WITHIN a stacking context, and this component has
 * two — so the values are grouped by context. The header is `sticky` with a
 * z-index, which makes it a context of its own; every `relative` wrapper in
 * the body is `z-auto`, so it makes none and its children all compete in the
 * root content context.
 *
 * The header group deliberately uses small numbers: they are NOT comparable
 * with the root scale, and keeping them out of that range makes it obvious
 * that they answer a different question.
 */
.timeline-day {
  /* Root content context — the scroll body. */
  --z-grid: 0; /* hour grid lines, under everything */
  --z-now-line: 10; /* current-time line, over the grid */
  --z-dragged-bar: 20; /* the bar currently being dragged */
  --z-ghost: 25; /* resize ghost: over the bars, still under the frozen columns */
  --z-sticky: 30; /* pinned chrome: frozen columns, group heading, offscreen chips */
  --z-header: 40; /* the sticky header */
  --z-badge: 50; /* drag time badge — stays readable over the header */

  /* Inside the header's own context (created by --z-header). */
  --z-header-col: 2; /* frozen columns within the header */
  --z-now-dot: 1; /* below them, so it tucks away when scrolled left */
}

/* Shared by the all-day chips and TimelineEventBar's root (a child component's
   root element also carries the parent's scope id, so this rule reaches it). */
.timeline-event {
  background: color-mix(in oklch, var(--event-color) 20%, var(--color-surface));
  border-left: 4px solid var(--event-color);
  color: color-mix(in oklch, var(--event-color) 50%, var(--color-surface-inverted));
}

/* The ghost keeps a translucent fill on purpose: it is drawn over whatever
  occupies the landing position, and an opaque one would hide it. Its text
  matches the bars, ending on a `light-dark()` token so one rule serves both
  themes — see WeekEventBlock for why that share is 50%. */
.resize-ghost {
  border-color: color-mix(in srgb, var(--event-color) 70%, transparent);
  background: color-mix(in srgb, var(--event-color) 22%, transparent);
  color: color-mix(in oklch, var(--event-color) 50%, var(--color-surface-inverted));
}

/* Drag preview arrow: a small diamond pointing at the bar, inheriting the badge's background. */
.drag-badge__arrow {
  position: absolute;
  left: 50%;
  width: 8px;
  height: 8px;
  background: inherit;
  transform: translateX(-50%) rotate(45deg);
}

/* Badge above the bar → arrow points down. */
.drag-badge--above .drag-badge__arrow {
  top: calc(100% - 4px);
}

/* Badge below the bar → arrow points up. */
.drag-badge--below .drag-badge__arrow {
  bottom: calc(100% - 4px);
}
</style>
