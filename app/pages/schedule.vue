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
      date: date.format('MM/DD'),
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
const endHour = 25
const hours = computed(() =>
  Array.from({ length: endHour - startHour }, (_, i) => startHour + i),
)

function formatHour(h: number) {
  return `${String(h).padStart(2, '0')}:00`
}

function onCellClick(day: DayColumn, hour: number) {
  // hook for creating an event in this slot
  console.log('cell', day.key, hour)
}
</script>

<template>
  <main class="page h-screen overflow-hidden p-4">
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
    <div class="mt-4 h-full overflow-hidden rounded-md border border-elevated">
      <div class="flex w-full overflow-auto">
        <!-- time axis column -->
        <div class="sticky left-0 z-20 shrink-0 bg-abg">
          <!-- corner cell, aligns with day headers -->
          <div class="h-14 border-r border-b border-elevated" />
          <div
            v-for="hour in hours"
            :key="hour"
            class="text-abg0 h-14 border-r border-b border-elevated px-3 py-1 text-right text-xs"
          >
            {{ formatHour(hour) }}
          </div>
        </div>

        <!-- one column per day -->
        <div
          v-for="day in days"
          :key="day.key"
          class="flex min-w-32 flex-1 flex-col"
        >
          <!-- column header -->
          <div
            class="sticky top-0 z-10 h-14 border-r border-b border-elevated bg-abg px-2 py-2 text-center"
            :class="{ 'text-primary': day.isToday }"
          >
            <div class="text-sm font-semibold">
              {{ day.label }}
            </div>
            <div class="text-xs" :class="day.isToday ? 'font-medium' : 'text-abg0'">
              {{ day.date }}
            </div>
          </div>

          <!-- column body: time slots + absolutely-positioned events -->
          <div class="relative">
            <div
              v-for="hour in hours"
              :key="`${day.key}-${hour}`"
              class="h-14 border-r border-b border-elevated transition-colors hover:bg-abg"
              @click="onCellClick(day, hour)"
            />

            <!-- event blocks for this day go here (absolute, relative to column body) -->
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
