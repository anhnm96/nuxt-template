<script setup lang="ts">
import type { Dayjs } from 'dayjs/esm'
import type { CalendarItem, ScheduleEventUI } from '~/services/schedule'
import dayjs from 'dayjs/esm'
import Accordion from '~/components/base/accordion/Accordion.vue'
import AccordionContent from '~/components/base/accordion/AccordionContent.vue'
import AccordionHeader from '~/components/base/accordion/AccordionHeader.vue'
import AccordionPanel from '~/components/base/accordion/AccordionPanel.vue'
import useTimelineGestures from '../composables/useTimelineGestures'
import { clampEventToDayMinutes, computeOffscreenChips } from '../utils'
import EventTooltip from './EventTooltip.vue'

const props = defineProps<{
  events: ScheduleEventUI[]
  ownCalendarList: CalendarItem[]
  otherCalendarList: CalendarItem[]
  selectedDay: Dayjs
  // calendarIds checked in the sidebar; only these calendars get a row.
  selectedCalendarIds: (string | number)[]
}>()

// Clicking an event asks the parent to open the edit dialog; dragging empty
// space asks it to open the create dialog.
const emit = defineEmits<{
  (e: 'editEvent', event: ScheduleEventUI): void
  (e: 'createRange', payload: { start: number, end: number, calendarId: CalendarItem['calendarId'], alldayFlg: string }): void
  // Dragging an event's edge handle to change its start/end time.
  (e: 'resizeEvent', payload: { event: ScheduleEventUI, start: number, end: number }): void
}>()

const startHour = 0
const endHour = 23
const hourWidth = 112
const labelWidth = 220
const allDayWidth = 180
const headerHeight = 58
const groupHeight = 44
const rowHeight = 72
// Height per lane, gap between lanes, and vertical padding within a row.
const eventHeight = 28
const laneGap = 6
const rowPaddingY = 8
const timelineWidth = (endHour - startHour + 1) * hourWidth
// Offset of the timeline's left edge (combined width of the calendar-name and all-day columns).
const timelineLeft = labelWidth + allDayWidth

const hours = Array.from(
  { length: endHour - startHour + 1 },
  (_, index) => startHour + index,
)

// Convert minutes since the timeline start into an X coordinate (px).
function minutesToLeft(minutes: number) {
  return ((minutes - startHour * 60) / 60) * hourWidth
}

// Total height of `count` stacked lanes, gaps included.
function stackHeight(count: number) {
  return count * eventHeight + Math.max(count - 1, 0) * laneGap
}

// Y offset of a lane within a row; the lane stack is vertically centered.
function laneTop(row: { laneCount: number, height: number }, lane: number) {
  return (row.height - stackHeight(row.laneCount)) / 2 + lane * (eventHeight + laneGap)
}

// Keep only events that overlap the selected day (the parent passes down a whole month's events).
const dayEvents = computed(() => {
  const dayStart = props.selectedDay.startOf('day')
  const dayEnd = props.selectedDay.endOf('day')
  return props.events.filter(event =>
    !dayjs(event.start).isAfter(dayEnd) && !dayjs(event.end).isBefore(dayStart))
})

// Map of calendarId → that calendar's events.
const eventsByCalendar = computed(() => {
  const map = new Map<string, ScheduleEventUI[]>()
  for (const event of dayEvents.value) {
    const key = String(event.viewCalendarId)
    const list = map.get(key)
    if (list) list.push(event)
    else map.set(key, [event])
  }
  return map
})

type LaidOutEvent = TimelineDragItem<ScheduleEventUI>

// Only calendars checked in the sidebar get a row (matches the events already
// being filtered down to the same selection).
const selectedCalendarIdSet = computed(() => new Set(props.selectedCalendarIds.map(String)))

// For each group (my calendars / other calendars), compute each calendar
// row's event layout and height.
const layout = computed(() =>
  [
    { id: 'own-calendar', title: 'マイカレンダー', calendars: props.ownCalendarList },
    { id: 'other-calendar', title: '他のカレンダー', calendars: props.otherCalendarList },
  ].map((group) => {
    const visibleCalendars = group.calendars.filter(calendar => selectedCalendarIdSet.value.has(String(calendar.calendarId)))
    const rows = visibleCalendars.map((calendar) => {
      const calendarEvents = eventsByCalendar.value.get(String(calendar.calendarId)) ?? []
      // All-day events go to their own column; only timed events go on the timeline.
      const allDayEvents = calendarEvents.filter(event => event.alldayFlg === '1')
      const { items, laneCount } = assignLanes(
        calendarEvents
          .filter(event => event.alldayFlg !== '1')
          .map(event => ({
            event,
            ...clampEventToDayMinutes(event, props.selectedDay, startHour, endHour),
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
const expandedGroups = ref<Set<string>>(new Set(layout.value.map(group => group.id)))

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
  selectedDay: () => props.selectedDay,
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
      // Match by scheduleId: layout recomputation replaces LaidOutEvent references.
      const item = row.items.find(i => i.event.scheduleId === drag.item.event.scheduleId)
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
      const fmt = (min: number) => props.selectedDay.startOf('day').add(min, 'minute').format('HH:mm')

      return {
        calendarId: String(row.calendar.calendarId),
        label: `${fmt(drag.startMin)} - ${fmt(drag.endMin)}`,
        ghost: drag.edge === 'move'
          ? null
          : {
              'left': `${left}px`,
              'width': `${Math.max(right - left, 8)}px`,
              'top': `${top}px`,
              'height': `${eventHeight}px`,
              '--event-color': `#${item.event.calendarColor}`,
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

// Clicking the all-day column creates a new all-day event for that day (alldayFlg='1').
function createAllDay(row: { calendar: CalendarItem }) {
  const start = props.selectedDay.startOf('day').valueOf()
  emit('createRange', { start, end: start, calendarId: row.calendar.calendarId, alldayFlg: '1' })
}

// Position/width of the drag-selection preview.
function selectionStyle() {
  if (!createDrag.value) return {}
  const lo = Math.min(createDrag.value.startMin, createDrag.value.endMin)
  const hi = Math.max(createDrag.value.startMin, createDrag.value.endMin)
  const left = minutesToLeft(lo)
  return { left: `${left}px`, width: `${Math.max(minutesToLeft(hi) - left, 2)}px` }
}

// Current time (minute of the day), refreshed every minute. initial: 0 for
// SSR safety (the real time is set after mount).
const nowMinutes = useIntervalValue(() => {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}, 60_000, 0)

const nowLeft = computed(() => ((nowMinutes.value - startHour * 60) / 60) * hourWidth)

const showNow = computed(() => nowMinutes.value >= startHour * 60
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
  const visW = viewportWidth.value - timelineLeft // Visible timeline width, excluding the frozen columns.
  const map: Record<string, OffscreenChip<ScheduleEventUI>[]> = {}
  for (const group of layout.value) {
    for (const row of group.rows) {
      const ranges = row.items.map(item => ({ start: minutesToLeft(item.startMin), end: minutesToLeft(item.endMin), item: item.event }))
      map[String(row.calendar.calendarId)] = computeOffscreenChips(ranges, visStart, visW, OFFSCREEN_REVEAL_PAD)
    }
  }
  return map
})
function scrollToChip(chip: OffscreenChip<ScheduleEventUI>) {
  scrollContainer.value?.scrollTo({ left: chip.target, behavior: 'smooth' })
}
// #endregion offscreen chips

onMounted(() => {
  // On mount, scroll horizontally so the now-line is centered in the visible
  // area (excluding the frozen columns).
  nextTick(() => {
    const el = scrollContainer.value
    if (el && showNow.value) {
      const visibleTimelineWidth = el.clientWidth - timelineLeft
      el.scrollLeft = Math.max(nowLeft.value - visibleTimelineWidth / 2, 0)
    }
    syncViewport() // Reflect the programmatic scroll immediately.
  })
})
</script>

<template>
  <div ref="scrollContainer" class="timeline-day h-full overflow-auto rounded-md border border-elevated">
    <div
      class="relative min-h-full"
      :style="{ width: `${labelWidth + allDayWidth + timelineWidth}px`, minWidth: '100%' }"
    >
      <!-- header -->
      <div class="sticky top-0 z-(--z-header) flex border-b border-elevated/80 bg-abg/60 backdrop-blur-xs" :style="{ height: `${headerHeight}px` }">
        <div
          class="sticky left-0 z-(--z-header-col) flex shrink-0 items-center gap-2 border-r border-elevated bg-abg/60 px-5 font-semibold backdrop-blur-xl"
          :style="{ width: `${labelWidth}px` }"
        >
          <Icon size="24" name="mdi:calendar-blank-outline" />
          カレンダー
        </div>
        <div
          class="sticky z-(--z-header-col) flex shrink-0 items-center gap-2 border-r border-elevated bg-abg/60 px-4 font-semibold backdrop-blur-xl"
          :style="{ left: `${labelWidth}px`, width: `${allDayWidth}px` }"
        >
          <Icon size="18" name="mdi:weather-sunny" />
          終日
        </div>
        <!-- hour labels -->
        <div class="flex" :style="{ width: `${timelineWidth}px` }">
          <div
            v-for="hour in hours"
            :key="hour"
            class="relative flex shrink-0 items-center border-elevated not-first:border-l"
            :style="{ width: `${hourWidth}px` }"
          >
            <span
              class="sticky px-3 text-sm font-semibold"
              :style="{ left: `${timelineLeft}px` }"
            >
              {{ hour.toString().padStart(2, "0") }}:00
            </span>
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
              <div
                class="absolute inset-y-0 border-l border-elevated/80"
                :style="{ left: `${(hour - startHour) * hourWidth}px` }"
              />
              <div
                class="absolute inset-y-0 border-l border-dashed border-elevated/80"
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
                  :style="{ width: `${labelWidth + allDayWidth}px` }"
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
                :key="row.calendar.calendarId"
                class="flex transition-colors hover:bg-surface-inverted/5"
                :style="{ height: `${row.height}px` }"
              >
                <!-- Calendar name column -->
                <div
                  class="sticky left-0 z-(--z-sticky) flex shrink-0 items-center gap-2 border-r border-b border-elevated/80 bg-abg/60 px-6 text-sm backdrop-blur-xs"
                  :style="{ width: `${labelWidth}px` }"
                  :title="row.calendar.calendarName"
                >
                  <span class="size-2 shrink-0 rounded-full" :style="{ backgroundColor: `#${row.calendar.calendarColor}` }" />
                  <span class="line-clamp-2 break-all">{{ row.calendar.calendarName }}</span>
                </div>
                <!-- All-day events column -->
                <div
                  class="sticky z-(--z-sticky) flex shrink-0 cursor-pointer flex-col justify-center gap-1.5 overflow-hidden border-r border-b border-elevated/80 bg-abg/60 px-2 backdrop-blur-xs"
                  :style="{ left: `${labelWidth}px`, width: `${allDayWidth}px` }"
                  @click="createAllDay(row)"
                >
                  <div
                    v-for="event in row.allDayEvents"
                    :key="event.scheduleId"
                    class="timeline-event flex cursor-pointer items-center overflow-hidden rounded-md px-2 select-none"
                    :style="{ 'height': `${eventHeight}px`, '--event-color': `#${event.calendarColor}` }"
                    :title="event.name"
                    @click.stop="emit('editEvent', event)"
                  >
                    <div class="flex items-center gap-0.5 truncate text-xs leading-tight font-semibold">
                      <img v-if="event.iconTag === 'img'" :src="event.iconUrl" class="inline size-3">
                      <Icon v-if="event.iconTag === 'Icon'" :name="event.iconUrl!" size="16" />
                      <span>{{ event.name }}</span>
                    </div>
                    <EventTooltip v-if="event.scheduleId" :event="event" :dragging="isDragging" />
                  </div>
                </div>
                <div
                  data-timeline-row
                  class="relative border-b border-elevated/80"
                  :style="{ width: `${timelineWidth}px` }"
                  @pointerdown="startCreate($event, row.calendar.calendarId)"
                >
                  <!-- Drag-selection preview -->
                  <div
                    v-if="createDrag && createDrag.calendarId === row.calendar.calendarId"
                    class="pointer-events-none absolute inset-y-1 rounded-lg border border-primary/60 bg-primary/15"
                    :style="selectionStyle()"
                  />
                  <!-- Drag visuals, rendered only on the row hosting the dragged event -->
                  <template v-if="dragVisual && dragVisual.calendarId === String(row.calendar.calendarId)">
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
                  <div
                    v-for="item in row.items"
                    :key="item.event.scheduleId"
                    class="timeline-event group/event absolute flex cursor-grab flex-col justify-center overflow-hidden rounded-lg px-3 select-none"
                    :class="{ 'z-(--z-dragged-bar)': isDragTarget(item), 'cursor-grabbing!': dragPreview?.edge === 'move' && isDragTarget(item) }"
                    :style="{ ...eventStyle(item, row), '--event-color': `#${item.event.calendarColor}` }"
                    @pointerdown.stop="startMove($event, item)"
                    @click="onEventClick(item.event)"
                  >
                    <div class="flex items-center gap-0.5 truncate text-xs leading-tight">
                      <img v-if="item.event.iconTag === 'img'" :src="item.event.iconUrl" class="inline size-3">
                      <Icon v-if="item.event.iconTag === 'Icon'" :name="item.event.iconUrl!" size="16" />
                      <span class="font-semibold">{{ item.event.name }}</span>
                      <span class="opacity-80">
                        {{ formatDateTime(item.event.start, "HH:mm") }} - {{ formatDateTime(item.event.end, "HH:mm") }}
                      </span>
                    </div>
                    <!-- Edge resize handle (shown on hover or while dragging) -->
                    <div
                      data-slot="gantt-resize-handle"
                      class="resize-handle hit-area-x-0.5 left-0 pointer-coarse:opacity-100"
                      :class="{ 'resize-handle--active': isDragTarget(item) }"
                      @pointerdown.stop="startResize($event, item, 'start')"
                      @click.stop
                    />
                    <div
                      data-slot="gantt-resize-handle"
                      class="resize-handle hit-area-x-0.5 right-0 pointer-coarse:opacity-100"
                      :class="{ 'resize-handle--active': isDragTarget(item) }"
                      @pointerdown.stop="startResize($event, item, 'end')"
                      @click.stop
                    />
                    <EventTooltip v-if="item.event.scheduleId" :event="item.event" :dragging="isDragging" />
                  </div>
                  <!-- Offscreen-event chip layer -->
                  <div
                    v-if="offscreenChips[String(row.calendar.calendarId)]!.length"
                    data-slot="gantt-offscreen-chips"
                    class="pointer-events-none absolute inset-0 z-(--z-sticky) flex items-center"
                  >
                    <button
                      v-for="chip in offscreenChips[String(row.calendar.calendarId)]"
                      :key="chip.side"
                      type="button"
                      class="hit-area-1 pointer-events-auto sticky flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full border border-elevated bg-abg text-muted shadow-sm transition-colors hover:text-default"
                      :class="{ 'ms-auto': chip.side === 'end' }"
                      :style="chip.side === 'start' ? { left: `${timelineLeft + OFFSCREEN_CHIP_PAD}px` } : { right: `${OFFSCREEN_CHIP_PAD}px` }"
                      :aria-label="chip.side === 'start' ? '前のイベントへ' : '次のイベントへ'"
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

.timeline-event {
  background: color-mix(in srgb, var(--event-color) 18%, transparent);
  border-left: 4px solid var(--event-color);
  color: color-mix(in srgb, var(--event-color) 100%, black 30%);
}

.dark .timeline-event {
  color: color-mix(in srgb, var(--event-color) 100%, white 30%);
}

/* Edge resize handle: hidden by default, shown on event hover or while dragging. */
.resize-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: ew-resize;
  opacity: 0;
  transition: opacity 0.12s ease;
}

.resize-handle::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  width: 3px;
  height: 60%;
  transform: translate(-50%, -50%);
  border-radius: 9999px;
  background: var(--event-color);
}

.group\/event:hover .resize-handle,
.resize-handle--active {
  opacity: 1;
}

/* Resize ghost: dashed outline + faint fill in the event's color (same palette as the body). */
.resize-ghost {
  border-color: color-mix(in srgb, var(--event-color) 70%, transparent);
  background: color-mix(in srgb, var(--event-color) 22%, transparent);
  color: color-mix(in srgb, var(--event-color) 100%, black 30%);
}

.dark .resize-ghost {
  color: color-mix(in srgb, var(--event-color) 100%, white 30%);
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
