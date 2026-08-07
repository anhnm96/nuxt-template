<script setup lang="ts">
import type { Dayjs } from 'dayjs/esm'
import type { CalendarItem, ScheduleEvent, ScheduleEventUI } from '~/services/schedule'
import type { AllDayDisplay, DayColumn, EventLayoutMode } from '~/utils/schedule'
import dayjs from 'dayjs/esm'
import Tab from '~/components/tab/Tab.vue'
import TabIndicator from '~/components/tab/TabIndicator.vue'
import TabList from '~/components/tab/TabList.vue'
import Tabs from '~/components/tab/Tabs.vue'
import { getScheduleList } from '~/services/schedule'
import { ALL_DAY_DISPLAY, EVENT_LAYOUT } from '~/utils/schedule'
import EventTooltip from './components/EventTooltip.vue'
import Sidebar from './components/Sidebar.vue'
import TimelineDay from './components/TimelineDay.vue'
import WeekTimeGrid from './components/WeekTimeGrid.vue'

const VIEW_MODE = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  TIMELINE: 'timeline',
} as const
type ViewMode = ValueOf<typeof VIEW_MODE>

/** Fallback for an event whose calendar can't be resolved. */
const DEFAULT_EVENT_COLOR = 'var(--color-gray-500)'
/** Date format used by the mock API. */
const API_DATE_FORMAT = 'YYYY-MM-DDTHH:mm:ss'

// How overlapping timed events are arranged within a day column.
const layoutMode = ref<EventLayoutMode>(EVENT_LAYOUT.COLUMNS)

// Where the timeline draws all-day events: own column, or bars on the timeline.
const allDayDisplay = ref<AllDayDisplay>(ALL_DAY_DISPLAY.TIMELINE)

// Currently selected view (1: Day, 2: Week, 3: Month, 4: Year)
const viewMode = ref<ViewMode>(VIEW_MODE.TIMELINE)

const sidebarOpen = ref(true)
const selectedCalendarIds = ref<string[]>([])
// The day the view is anchored to. Drives the visible date range.
const selectedDay = ref<Dayjs>(dayjs())

// Date range to fetch: the month containing the anchored day, padded by a week
// on each side so overflow days shown in week/month views are covered too.
const fetchStart = computed(() => selectedDay.value.startOf('month').subtract(7, 'day').format('YYYY-MM-DD'))
const fetchEnd = computed(() => selectedDay.value.endOf('month').add(7, 'day').format('YYYY-MM-DD'))
// Get data for schedule. Refetches whenever the visible period (or view) changes.
const { data: scheduleListRes } = useQuery({
  key: () => ['schedule-list', fetchStart.value, fetchEnd.value],
  query: () => getScheduleList(fetchStart.value, fetchEnd.value, viewMode.value),
})

const calendars = computed(() => scheduleListRes.value?.calendars ?? [])
// Flat calendar list, and a lookup used to resolve an event's color/calendar name.
const calendarList = computed<CalendarItem[]>(() => calendars.value.flatMap(group => group.children))
const calendarById = computed(() => new Map(calendarList.value.map(c => [c.id, c])))

// Local, mutable copy of the fetched events so drag/resize/create stick in the
// demo (there is no write endpoint to sync back to).
const events = ref<ScheduleEvent[]>([])
watch(scheduleListRes, (res) => {
  events.value = res?.events ?? []
}, { immediate: true })

// Default every calendar to visible once the lists load.
watch(calendarList, (list) => {
  if (list.length && !selectedCalendarIds.value.length)
    selectedCalendarIds.value = list.map(c => c.id)
}, { immediate: true })

// Display-ready events: ms timestamps and a color resolved against the
// event's calendar. Both the week grid and the timeline consume these.
const uiEvents = computed<ScheduleEventUI[]>(() =>
  events.value.map((event) => {
    const calendar = calendarById.value.get(event.resourceId)
    return {
      ...event,
      start: new Date(event.start).getTime(),
      end: new Date(event.end).getTime(),
      timed: !event.allDay,
      color: event.color ?? calendar?.color ?? DEFAULT_EVENT_COLOR,
      calendarTitle: calendar?.title ?? '',
    }
  }),
)

// Monday of the week containing the selected day.
const weekStart = computed(() => {
  const offset = (selectedDay.value.day() + 6) % 7 // days since Monday (Sun=0 -> 6)
  return selectedDay.value.subtract(offset, 'day').startOf('day')
})

// Column axis — one entry per day, generated from the selected week.
const days = computed<DayColumn[]>(() => {
  const today = dayjs()
  return Array.from({ length: 7 }, (_, i) => {
    const date = weekStart.value.add(i, 'day')
    return {
      key: date.format('YYYY-MM-DD'),
      label: date.format('ddd'),
      date: date.format('D'),
      dayjs: date,
      isToday: date.isSame(today, 'day'),
    }
  })
})

// Label shown for the active date range, e.g. "Jun 15 - 21, 2026".
const activeDateLabel = computed(() => {
  const start = weekStart.value
  const end = weekStart.value.add(6, 'day')

  if (start.isSame(end, 'month')) {
    return `${start.format('MMM D')} - ${end.format('D, YYYY')}`
  }
  if (start.isSame(end, 'year')) {
    return `${start.format('MMM D')} - ${end.format('MMM D, YYYY')}`
  }
  return `${start.format('MMM D, YYYY')} - ${end.format('MMM D, YYYY')}`
})

function goToToday() {
  selectedDay.value = dayjs()
}

function goToPrev() {
  selectedDay.value = selectedDay.value.subtract(1, 'week')
}

function goToNext() {
  selectedDay.value = selectedDay.value.add(1, 'week')
}

// Set of calendar ids currently toggled on in the sidebar.
const selectedSet = computed(() => new Set(selectedCalendarIds.value))
function isVisible(ev: ScheduleEventUI) {
  return selectedSet.value.has(ev.resourceId)
}

interface AllDayBar {
  event: ScheduleEventUI
  /** 1-based grid column to start at */
  colStart: number
  /** number of day columns this bar spans */
  colSpan: number
}

// Timed events for the week, filtered to the visible calendars.
const visibleTimedEvents = computed(() => uiEvents.value.filter(ev => ev.timed && isVisible(ev)))

// All-day events spanning one or more columns of the visible week.
const weekAllDayEvents = computed<AllDayBar[]>(() => {
  const start = weekStart.value
  const end = start.add(6, 'day')
  return uiEvents.value
    .filter(ev => !ev.timed && isVisible(ev))
    .flatMap((ev) => {
      const s = dayjs(ev.start).startOf('day')
      const e = dayjs(ev.end).startOf('day')
      // drop events entirely outside the visible week
      if (e.isBefore(start, 'day') || s.isAfter(end, 'day')) return []
      const colStart = Math.max(0, s.diff(start, 'day'))
      const colEnd = Math.min(6, e.diff(start, 'day'))
      return [{
        event: ev,
        colStart: colStart + 1,
        colSpan: colEnd - colStart + 1,
      }]
    })
})

function onCellClick(day: DayColumn, hour: number) {
  // hook for creating an event in this slot
  console.log('cell', day.key, hour)
}

function onEventClick(event: ScheduleEventUI) {
  // hook for opening an event
  console.log('event', event.id)
}

// Drag or click an empty area on the timeline to create a new event
let createdCount = 0
function onTimelineCreate({ start, end, calendarId, allDay }: { start: number, end: number, calendarId: string, allDay: boolean }) {
  events.value.push({
    id: `new-event-${++createdCount}`,
    title: 'New event',
    start: dayjs(start).format(API_DATE_FORMAT),
    end: dayjs(allDay ? dayjs(start).endOf('day') : end).format(API_DATE_FORMAT),
    resourceId: calendarId,
    ...(allDay && { allDay: true }),
  })
}

// Drag events to move or resize them → Save changes
function onTimelineResize({ event, start, end }: { event: ScheduleEventUI, start: number, end: number }) {
  const target = events.value.find(e => e.id === event.id)
  if (!target) return
  target.start = dayjs(start).format(API_DATE_FORMAT)
  target.end = dayjs(end).format(API_DATE_FORMAT)
}
</script>

<template>
  <main class="grid h-screen w-full grid-cols-[auto_1fr] overflow-auto">
    <!-- sidebar -->
    <Sidebar
      v-model="selectedDay"
      v-model:open="sidebarOpen"
      v-model:selected="selectedCalendarIds"
      :calendars="calendars"
    />
    <!-- schedule -->
    <div class="p-wrapper flex flex-col overflow-hidden pt-4 pb-8">
      <!-- header info -->
      <div>
        <!-- first line -->
        <div class="-ml-3.5 flex items-center justify-between gap-4">
          <!-- sidebar toggle -->
          <button class="btn transition-transform" @click="sidebarOpen = !sidebarOpen">
            <Icon size="18" :class="[sidebarOpen && 'rotate-180']" name="tabler:layout-sidebar-left-expand" />
          </button>
          <!-- tabs -->
          <Tabs v-model:value="viewMode" class="text-center">
            <TabList class="inline-flex gap-1 rounded-xl border border-elevated bg-elevated/60 p-1 backdrop-blur-sm">
              <TabIndicator class="top-1/2 h-7 -translate-y-1/2 rounded-lg! border border-primary/30 bg-primary/15" />
              <Tab disabled class="h-7 rounded-lg! py-1" :value="VIEW_MODE.DAY">
                Day
              </Tab>
              <Tab class="h-7 rounded-lg! py-1" :value="VIEW_MODE.WEEK">
                Week
              </Tab>
              <Tab disabled class="h-7 rounded-lg! py-1" :value="VIEW_MODE.MONTH">
                Month
              </Tab>
              <Tab class="h-7 rounded-lg! py-1" :value="VIEW_MODE.TIMELINE">
                Timeline
              </Tab>
            </TabList>
          </Tabs>
          <div class="min-w-btn" />
        </div>
        <div class="mt-4 flex items-center">
          <button class="btn btn-outline" @click="goToToday">
            Today
          </button>
          <button class="btn btn-icon btn-text rounded-full" @click="goToPrev">
            <Icon name="mdi:chevron-left" />
          </button>
          <button class="btn btn-icon btn-text rounded-full" @click="goToNext">
            <Icon name="mdi:chevron-right" />
          </button>
          <h3 class="text-xl font-semibold">
            {{ activeDateLabel }}
          </h3>
          <!-- overlap layout toggle -->
          <div v-show="viewMode === VIEW_MODE.WEEK" class="ml-auto inline-flex gap-1 rounded-xl bg-elevated/60 p-1">
            <button
              class="btn btn-icon h-7 rounded-lg!"
              :class="layoutMode === EVENT_LAYOUT.COLUMNS ? 'bg-primary/10 text-primary' : 'btn-text'"
              title="Side by side"
              @click="layoutMode = EVENT_LAYOUT.COLUMNS"
            >
              <Icon name="mdi:view-column-outline" />
            </button>
            <button
              class="btn btn-icon h-7 rounded-lg!"
              :class="layoutMode === EVENT_LAYOUT.STACK ? 'bg-primary/10 text-primary' : 'btn-text'"
              title="Stacked"
              @click="layoutMode = EVENT_LAYOUT.STACK"
            >
              <Icon name="mdi:layers-outline" />
            </button>
          </div>
          <!-- all-day display toggle (timeline only) -->
          <div v-show="viewMode === VIEW_MODE.TIMELINE" class="ml-auto inline-flex gap-1 rounded-xl bg-elevated/60 p-1">
            <button
              class="btn btn-icon h-7 rounded-lg!"
              :class="allDayDisplay === ALL_DAY_DISPLAY.COLUMN ? 'bg-primary/10 text-primary' : 'btn-text'"
              title="All-day events in their own column"
              @click="allDayDisplay = ALL_DAY_DISPLAY.COLUMN"
            >
              <Icon name="mdi:table-column" />
            </button>
            <button
              class="btn btn-icon h-7 rounded-lg!"
              :class="allDayDisplay === ALL_DAY_DISPLAY.TIMELINE ? 'bg-primary/10 text-primary' : 'btn-text'"
              title="All-day events as bars on the timeline"
              @click="allDayDisplay = ALL_DAY_DISPLAY.TIMELINE"
            >
              <Icon name="mdi:arrow-expand-horizontal" />
            </button>
          </div>
        </div>
      </div>
      <!-- grid table -->
      <div class="mt-4 h-full overflow-auto bg-abg/60">
        <div v-if="viewMode === VIEW_MODE.WEEK" class="flex flex-col rounded-md">
          <!-- Day headers -->
          <div class="grid shrink-0 grid-cols-[60px_repeat(7,1fr)] border-b border-elevated font-medium">
            <div class="" />
            <div
              v-for="day in days"
              :key="day.key"
              class="flex shrink-0 flex-col flex-center gap-0.5 border-l border-elevated py-2 text-sm font-medium"
              :class="day.isToday && 'text-primary font-semibold'"
            >
              <span class="text-xs">{{ day.label }}</span>
              <span
                class="flex size-7 flex-center rounded-full text-base leading-none"
                :class="day.isToday && 'bg-primary/80 text-white'"
              >{{ day.date }}</span>
            </div>
          </div>
          <!-- all-day row -->
          <div class="grid min-h-7 shrink-0 grid-cols-[60px_repeat(7,1fr)] border-b border-elevated/40">
            <div class="flex items-start justify-end pt-1.5 pr-2 text-xs">
              All day
            </div>
            <div class="relative col-span-7">
              <!-- column dividers: full-height background behind the bars -->
              <div class="pointer-events-none absolute inset-0 grid grid-cols-7">
                <div
                  v-for="day in days"
                  :key="day.key"
                  class="border-l border-elevated"
                />
              </div>
              <!-- all-day bars in normal flow so the row grows to fit every line -->
              <div class="relative grid auto-rows-min grid-cols-7 gap-1 p-1">
                <div
                  v-for="bar in weekAllDayEvents"
                  :key="bar.event.id"
                  class="event-bar cursor-pointer truncate rounded-md px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-80"
                  :style="{
                    'gridColumnStart': bar.colStart,
                    'gridColumnEnd': bar.colStart + bar.colSpan,
                    '--event-color': bar.event.color,
                  }"
                >
                  {{ bar.event.title }}
                  <EventTooltip :event="bar.event" />
                </div>
              </div>
            </div>
          </div>
          <!-- time grid -->
          <WeekTimeGrid
            :days="days"
            :events="visibleTimedEvents"
            :layout-mode="layoutMode"
            @cell-click="onCellClick"
            @event-click="onEventClick"
          />
        </div>
        <TimelineDay
          v-if="viewMode === VIEW_MODE.TIMELINE"
          :events="uiEvents"
          :selected-day="selectedDay"
          :calendars="calendars"
          :selected-calendar-ids="selectedCalendarIds"
          :all-day-display="allDayDisplay"
          @edit-event="onEventClick"
          @create-range="onTimelineCreate"
          @resize-event="onTimelineResize"
        />
      </div>
    </div>
  </main>
</template>

<style>
/* All-day bar: tinted fill of the event's color (matches the timeline bars). */
.event-bar {
  background: color-mix(in srgb, var(--event-color) 18%, transparent);
  border-left: 4px solid var(--event-color);
  color: color-mix(in srgb, var(--event-color) 100%, white 30%);
}
</style>
