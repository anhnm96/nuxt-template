<script setup lang="ts">
import type { Dayjs } from 'dayjs/esm'
import type { ScheduleEvent } from '~/services/schedule'
import type { DayColumn, EventLayoutMode } from '~/utils/schedule'
import dayjs from 'dayjs/esm'
import Tab from '~/components/tab/Tab.vue'
import TabIndicator from '~/components/tab/TabIndicator.vue'
import TabList from '~/components/tab/TabList.vue'
import Tabs from '~/components/tab/Tabs.vue'
import { getScheduleList } from '~/services/schedule'
import { EVENT_LAYOUT, eventColor } from '~/utils/schedule'
import Sidebar from './components/Sidebar.vue'
import WeekTimeGrid from './components/WeekTimeGrid.vue'

const VIEW_MODE = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
} as const
type ViewMode = ValueOf<typeof VIEW_MODE>

// How overlapping timed events are arranged within a day column.
const layoutMode = ref<EventLayoutMode>(EVENT_LAYOUT.COLUMNS)

// Currently selected view (1: Day, 2: Week, 3: Month, 4: Year)
const viewMode = ref<ViewMode>(VIEW_MODE.WEEK)

const sidebarOpen = ref(true)
const selectedCalendarIds = ref<(string | number)[]>([])
// The day the view is anchored to. Drives the visible date range.
const selectedDay = ref<Dayjs>(dayjs())

// Date range to fetch: the month containing the anchored day, padded by a week
// on each side so overflow days shown in week/month views are covered too.
const fetchStart = computed(() => selectedDay.value.startOf('month').subtract(7, 'day').format('YYYY-MM-DD'))
const fetchEnd = computed(() => selectedDay.value.endOf('month').add(7, 'day').format('YYYY-MM-DD'))
// Get data for schedule. Refetches whenever the visible period (or view) changes.
const { data: res } = await useAsyncData(
  () => getScheduleList(fetchStart.value, fetchEnd.value, viewMode.value),
  { watch: [fetchStart, fetchEnd] },
)

const scheduleList = computed(() => res.value?.scheduleList ?? [])

// Default every calendar to visible once the lists load.
const allCalendarIds = computed(() => [
  ...(res.value?.ownCalendarList ?? []),
  ...(res.value?.otherCalendarList ?? []),
].map(c => c.calendarId))
if (!selectedCalendarIds.value.length) {
  selectedCalendarIds.value = allCalendarIds.value
}

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
      date: date.format('DD'),
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
const selectedSet = computed(() => new Set(selectedCalendarIds.value.map(String)))
function isVisible(ev: ScheduleEvent) {
  return selectedSet.value.has(String(ev.viewCalendarId))
}

interface AllDayBar {
  event: ScheduleEvent
  /** 1-based grid column to start at */
  colStart: number
  /** number of day columns this bar spans */
  colSpan: number
  color: string
}

// Timed events for the week, filtered to the visible calendars.
const visibleTimedEvents = computed(() =>
  scheduleList.value.filter(ev => ev.alldayFlg !== '1' && isVisible(ev)),
)

function onCellClick(day: DayColumn, hour: number) {
  // hook for creating an event in this slot
  console.log('cell', day.key, hour)
}

function onEventClick(event: ScheduleEvent) {
  // hook for opening an event
  console.log('event', event.scheduleId)
}

// All-day events spanning one or more columns of the visible week.
const weekAllDayEvents = computed<AllDayBar[]>(() => {
  const start = weekStart.value
  const end = start.add(6, 'day')
  return scheduleList.value
    .filter(ev => ev.alldayFlg === '1' && isVisible(ev))
    .flatMap((ev) => {
      const s = dayjs(ev.startDateString).startOf('day')
      const e = dayjs(ev.endDateString).startOf('day')
      // drop events entirely outside the visible week
      if (e.isBefore(start, 'day') || s.isAfter(end, 'day')) return []
      const colStart = Math.max(0, s.diff(start, 'day'))
      const colEnd = Math.min(6, e.diff(start, 'day'))
      return [{
        event: ev,
        colStart: colStart + 1,
        colSpan: colEnd - colStart + 1,
        color: eventColor(ev),
      }]
    })
})
</script>

<template>
  <main class="page grid h-screen w-full grid-cols-[auto_1fr] overflow-auto">
    <!-- sidebar -->
    <Sidebar
      v-model:open="sidebarOpen"
      v-model:selected="selectedCalendarIds"
      :own-calendar-list="res?.ownCalendarList || []"
      :other-calendar-list="res?.otherCalendarList || []"
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
            <TabList class="inline-flex gap-1 rounded-xl bg-elevated/60 p-1 backdrop-blur-sm">
              <TabIndicator class="top-1/2 h-7 -translate-y-1/2 rounded-lg! bg-primary/10" />
              <Tab class="h-7 rounded-lg! py-1" :value="VIEW_MODE.DAY">
                Day
              </Tab>
              <Tab class="h-7 rounded-lg! py-1" :value="VIEW_MODE.WEEK">
                Week
              </Tab>
              <Tab class="h-7 rounded-lg! py-1" :value="VIEW_MODE.MONTH">
                Month
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
          <div class="ml-auto inline-flex gap-1 rounded-xl bg-elevated/60 p-1">
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
        </div>
      </div>
      <!-- grid table -->
      <div class="p-glass mt-4 flex h-full flex-col overflow-hidden rounded-md">
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
              :class="day.isToday && 'bg-primary text-white'"
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
                :key="bar.event.scheduleId"
                class="cursor-pointer truncate rounded-md border-l-4 px-2 py-0.5 text-xs font-medium text-white transition-opacity hover:opacity-80"
                :style="{
                  gridColumnStart: bar.colStart,
                  gridColumnEnd: bar.colStart + bar.colSpan,
                  borderLeftColor: bar.color,
                  backgroundColor: `${bar.color}59`,
                }"
              >
                {{ bar.event.scheduleTitle }}
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
    </div>
  </main>
</template>

<style>
.page {
  background: radial-gradient(ellipse at 20% 20%,#1e1b4b 0%,transparent 50%), radial-gradient(ellipse at 80% 80%,#0c1e3a 0%,transparent 50%), #0b0f1a;
  --t-glass-bg: rgba(255,255,255,0.1);
  --t-glass-blur: blur(30px) saturate(180%) brightness(1.05);
  --t-glass-border: rgba(255,255,255,0.12);
  --t-glass-shadow: 0 1px 0 rgba(255,255,255,0.05) inset,0 32px 64px rgba(0,0,0,0.50),0 8px 24px rgba(0,0,0,0.30);
}
.p-glass {
  /* background: var(--t-glass-bg); */
  -webkit-backdrop-filter: var(--t-glass-blur);
  backdrop-filter: var(--t-glass-blur);
  border: 0.5px solid var(--t-glass-border);
  border-radius: 16px;
  box-shadow: var(--t-glass-shadow);
  transition: background .3s, border-color .3s, box-shadow .3s;
}
</style>
