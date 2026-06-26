<script setup lang="ts">
import type { Dayjs } from 'dayjs/esm'
import dayjs from 'dayjs/esm'
import Tab from '~/components/tab/Tab.vue'
import TabIndicator from '~/components/tab/TabIndicator.vue'
import TabList from '~/components/tab/TabList.vue'
import Tabs from '~/components/tab/Tabs.vue'

interface DayColumn {
  key: string
  label: string
  date: string
  dayjs: Dayjs
  isToday: boolean
}

type ViewMode = '1' | '2' | '3' | '4'

// Currently selected view (1: Day, 2: Week, 3: Month, 4: Year)
const viewMode = ref<ViewMode>('2')

// The day the view is anchored to. Drives the visible date range.
const selectedDay = ref<Dayjs>(dayjs())

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

// Row axis — time slots (hourly). Adjust start/end/step as needed.
const startHour = 0
const endHour = 24
const hours = computed(() =>
  Array.from({ length: endHour - startHour }, (_, i) => startHour + i),
)
const hourHeight = 48

function formatHour(h: number) {
  return `${String(h).padStart(2, '0')}:00`
}

function onCellClick(day: DayColumn, hour: number) {
  // hook for creating an event in this slot
  console.log('cell', day.key, hour)
}

interface CalendarEvent {
  id: string
  title: string
  /** 0 = Monday ... 6 = Sunday (column index within the visible week) */
  day: number
  /** Start time in minutes from midnight */
  start: number
  /** End time in minutes from midnight */
  end: number
  color: string
  /** Source/calendar this event belongs to */
  sourceId: string
  allDay?: boolean
  /** For all-day events, how many day columns it spans */
  span?: number
}

const allDayEvents: CalendarEvent[] = [
  { id: 'ad1', title: 'Sprint Offsite', day: 0, start: 0, end: 0, color: 'blue', sourceId: 'product', allDay: true, span: 1 },
  { id: 'ad2', title: 'Design Review', day: 1, start: 0, end: 0, color: 'teal', sourceId: 'support', allDay: true, span: 1 },
  { id: 'ad3', title: 'Family Day', day: 2, start: 0, end: 0, color: 'violet', sourceId: 'personal', allDay: true, span: 1 },
  { id: 'ad4', title: 'Summer Vacation (Europe)', day: 0, start: 0, end: 0, color: 'amber', sourceId: 'travel', allDay: true, span: 3 },
]
</script>

<template>
  <main class="page flex h-screen flex-col overflow-hidden p-4 pb-8">
    <!-- schedule -->
    <!-- header info -->
    <div>
      <!-- tabs -->
      <Tabs v-model:value="viewMode" class="text-center">
        <TabList class="inline-flex gap-1 rounded-xl bg-elevated/60 p-1 backdrop-blur-sm">
          <TabIndicator class="top-1/2 h-7 -translate-y-1/2 rounded-lg! bg-primary/10" />
          <Tab class="h-7 rounded-lg! py-1" value="1">
            Day
          </Tab>
          <Tab class="h-7 rounded-lg! py-1" value="2">
            Week
          </Tab>
          <Tab class="h-7 rounded-lg! py-1" value="3">
            Month
          </Tab>
          <Tab class="h-7 rounded-lg! py-1" value="4">
            Year
          </Tab>
        </TabList>
      </Tabs>
      <div class="mt-4 flex items-center">
        <button class="btn btn-text" @click="goToToday">
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
      </div>
    </div>
    <!-- grid table -->
    <div class="mt-4 flex h-full flex-col overflow-hidden rounded-md border border-elevated">
      <!-- Day headers -->
      <div class="grid shrink-0 grid-cols-[60px_repeat(7,1fr)] bg-abg/60 font-medium backdrop-blur-xs">
        <div class="" />
        <div
          v-for="day in days"
          :key="day.key"
          class="flex flex-center py-2 text-sm font-medium"
          :class="day.isToday && 'text-primary font-semibold'"
        >
          {{ day.label }} {{ day.date }}
        </div>
      </div>
      <!-- all-day row -->
      <div class="grid min-h-6 shrink-0 grid-cols-[60px_repeat(7,1fr)] border-b border-elevated/40">
        <div class="flex items-start justify-end pt-2 pr-2 text-xs">
          All day
        </div>
        <div class="relative col-span-7 grid grid-cols-7 gap-1 p-1">
          <div
            v-for="event in allDayEvents" :key="event.id" class="cursor-pointer truncate rounded-lg border-l-4 border-l-primary-500 bg-primary-500/25 px-2 py-1 text-xs font-medium backdrop-blur-sm transition-colors"
            :style="{
              gridColumnStart: event.day + 1,
              gridColumnEnd: event.day + 1 + (event.span ?? 1),
            }"
          >
            {{ event.title }}
          </div>
        </div>
      </div>
      <!-- time grid -->
      <div class="flex-1 overflow-y-auto">
        <div class="relative grid grid-cols-[60px_repeat(7,1fr)]">
          <!--  Hour labels  -->
          <div class="relative">
            <div
              v-for="hour in hours"
              :key="hour"
              class="h-14 -translate-y-2 border-r border-elevated pr-2 text-right first:*:invisible"
            >
              <span>{{ hour.toString().padStart(2, '0') }}:00</span>
            </div>
          </div>
          <!-- day columns -->
          <div
            v-for="day in days"
            :key="day.key"
            class="relative"
          >
            <!-- Hour grid lines -->
            <div
              v-for="hour in hours"
              :key="`${day.key}-${hour}`"
              class="h-14 border-r border-b border-elevated transition-colors last:border-b-0 hover:bg-abg"
              :style="{ height: hourHeight }"
              @click="() => onCellClick(day, hour)"
            />
            <!-- events -->
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
