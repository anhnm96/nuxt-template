<script setup lang="ts">
import type { Dayjs } from 'dayjs/esm'
import type { CalendarItem, ScheduleEvent, ScheduleEventUI } from '~/services/schedule'
import type { AllDayDisplay, DayColumn, EventLayoutMode, HourHeight } from '~/utils/schedule'
import dayjs from 'dayjs/esm'
import Tab from '~/components/tab/Tab.vue'
import TabIndicator from '~/components/tab/TabIndicator.vue'
import TabList from '~/components/tab/TabList.vue'
import Tabs from '~/components/tab/Tabs.vue'
import { getScheduleList } from '~/services/schedule'
import { ALL_DAY_DISPLAY, EVENT_LAYOUT, HOUR_HEIGHTS } from '~/utils/schedule'
import Sidebar from './components/Sidebar.vue'
import TimelineDay from './components/TimelineDay.vue'
import WeekView from './components/week/WeekView.vue'

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

// Zoom of the day/week grid, in px per hour. Remembered across visits.
const hourHeight = useLocalStorage<HourHeight>('schedule-hour-height', HOUR_HEIGHTS.NORMAL)
const ZOOM_LEVELS = [
  { value: HOUR_HEIGHTS.COMPACT, icon: 'mdi:format-align-justify', title: 'Compact' },
  { value: HOUR_HEIGHTS.NORMAL, icon: 'mdi:view-sequential-outline', title: 'Normal' },
  { value: HOUR_HEIGHTS.COMFORTABLE, icon: 'mdi:view-agenda-outline', title: 'Comfortable' },
]

// Currently selected view (1: Day, 2: Week, 3: Month, 4: Year)
const viewMode = ref<ViewMode>(VIEW_MODE.WEEK)

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

// Day and week share one grid; only the number of columns differs.
const showsGrid = computed(() => viewMode.value === VIEW_MODE.DAY || viewMode.value === VIEW_MODE.WEEK)
const dayCount = computed(() => (viewMode.value === VIEW_MODE.DAY ? 1 : 7))
const rangeStart = computed(() =>
  viewMode.value === VIEW_MODE.DAY ? selectedDay.value.startOf('day') : weekStart.value)

// Column axis — one entry per displayed day.
const days = computed<DayColumn[]>(() => {
  const today = dayjs()
  return Array.from({ length: dayCount.value }, (_, i) => {
    const date = rangeStart.value.add(i, 'day')
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
  const start = rangeStart.value
  const end = rangeStart.value.add(dayCount.value - 1, 'day')

  if (start.isSame(end, 'day')) return start.format('MMM D, YYYY (ddd)')

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

/** Paging steps by whatever the current view shows. */
const pageUnit = computed(() => (viewMode.value === VIEW_MODE.DAY ? 'day' : 'week'))

function goToPrev() {
  selectedDay.value = selectedDay.value.subtract(1, pageUnit.value)
}

function goToNext() {
  selectedDay.value = selectedDay.value.add(1, pageUnit.value)
}

// Set of calendar ids currently toggled on in the sidebar.
const selectedSet = computed(() => new Set(selectedCalendarIds.value))
function isVisible(ev: ScheduleEventUI) {
  return selectedSet.value.has(ev.resourceId)
}

// Everything the grid draws: it sorts timed from all-day itself.
const visibleEvents = computed(() => uiEvents.value.filter(isVisible))

function onEventClick(event: ScheduleEventUI) {
  // hook for opening an event
  console.log('event', event.id)
}

// Drag or click empty space to create a new event. The week grid has no
// calendar axis, so it leaves the calendar to us; the timeline names its row.
let createdCount = 0
function onCreateRange({ start, end, calendarId, allDay }: { start: number, end: number, calendarId?: string, allDay: boolean }) {
  console.log('onCreateRange', { start, end, calendarId, allDay })
  const resourceId = calendarId ?? selectedCalendarIds.value[0] ?? calendarList.value[0]?.id
  if (!resourceId) return
  events.value.push({
    id: `new-event-${++createdCount}`,
    title: 'New event',
    start: dayjs(start).format(API_DATE_FORMAT),
    // An all-day range is stored as whole days, its last one inclusive.
    end: dayjs(allDay ? dayjs(end).endOf('day') : end).format(API_DATE_FORMAT),
    resourceId,
    ...(allDay && { allDay: true }),
  })
}

// Drag events to move or resize them → Save changes
function onResizeEvent({ event, start, end }: { event: ScheduleEventUI, start: number, end: number }) {
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
              <Tab class="h-7 rounded-lg! py-1" :value="VIEW_MODE.DAY">
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
          <!-- zoom -->
          <div v-show="showsGrid" class="ml-auto inline-flex gap-1 rounded-xl bg-elevated/60 p-1">
            <button
              v-for="level in ZOOM_LEVELS"
              :key="level.value"
              class="btn btn-icon h-7 rounded-lg!"
              :class="hourHeight === level.value ? 'bg-primary/10 text-primary' : 'btn-text'"
              :title="level.title"
              @click="hourHeight = level.value"
            >
              <Icon :name="level.icon" />
            </button>
          </div>
          <!-- overlap layout toggle -->
          <div v-show="showsGrid" class="ml-2 inline-flex gap-1 rounded-xl bg-elevated/60 p-1">
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
      <div class="mt-4 flex h-full min-h-0 flex-col overflow-hidden bg-abg/60">
        <WeekView
          v-if="showsGrid"
          :days="days"
          :events="visibleEvents"
          :layout-mode="layoutMode"
          :hour-height="hourHeight"
          @edit-event="onEventClick"
          @create-range="onCreateRange"
          @resize-event="onResizeEvent"
        />
        <TimelineDay
          v-if="viewMode === VIEW_MODE.TIMELINE"
          :events="uiEvents"
          :selected-day="selectedDay"
          :calendars="calendars"
          :selected-calendar-ids="selectedCalendarIds"
          :all-day-display="allDayDisplay"
          @edit-event="onEventClick"
          @create-range="onCreateRange"
          @resize-event="onResizeEvent"
        />
      </div>
    </div>
  </main>
</template>
