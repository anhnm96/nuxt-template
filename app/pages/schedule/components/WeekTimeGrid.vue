<script setup lang="ts">
import type { ScheduleEvent } from '~/services/schedule'
import type { DayColumn, EventLayoutMode } from '~/utils/schedule'
import dayjs from 'dayjs/esm'
import { HOUR_HEIGHT, layoutDayEvents } from '~/utils/schedule'

const props = defineProps<{
  days: DayColumn[]
  /** Timed events (already filtered for visibility). */
  events: ScheduleEvent[]
  layoutMode: EventLayoutMode
}>()

const emit = defineEmits<{
  cellClick: [day: DayColumn, hour: number]
  eventClick: [event: ScheduleEvent]
}>()

const hours = Array.from({ length: 24 }, (_, i) => i)

// Positioned events per day column, recomputed when events or layout change.
const eventsByDay = computed(() =>
  props.days.map(day => layoutDayEvents(props.events, day.key, props.layoutMode)),
)

// Current-time indicator — only the column flagged as today shows it.
const now = ref(dayjs())
useIntervalFn(() => {
  now.value = dayjs()
}, 60_000)
const nowTop = computed(() => {
  const minutes = now.value.hour() * 60 + now.value.minute()
  return (minutes / 60) * HOUR_HEIGHT
})
</script>

<template>
  <div class="flex-1 overflow-y-auto">
    <div class="relative grid grid-cols-[60px_repeat(7,1fr)]">
      <!-- Hour labels -->
      <div class="relative">
        <div
          v-for="hour in hours"
          :key="hour"
          class="h-14 -translate-y-2 pr-2 text-right first:*:invisible"
        >
          <span>{{ hour.toString().padStart(2, '0') }}:00</span>
        </div>
      </div>
      <!-- day columns -->
      <div
        v-for="(day, dayIndex) in days"
        :key="day.key"
        class="relative"
      >
        <!-- Hour grid lines -->
        <div
          v-for="hour in hours"
          :key="`${day.key}-${hour}`"
          class="h-14 border-b border-l border-elevated transition-colors last:border-b-0 hover:bg-abg"
          @click="emit('cellClick', day, hour)"
        />
        <!-- events -->
        <button
          v-for="item in eventsByDay[dayIndex]"
          :key="item.event.scheduleId"
          type="button"
          class="absolute inline-flex flex-col overflow-hidden rounded-md border-l-4 px-1.5 py-1 text-left text-xs text-white shadow-sm ring-1 ring-black/10 transition-opacity hover:opacity-90"
          :style="{
            top: `${item.top}px`,
            height: `${item.height}px`,
            left: item.left,
            width: item.width,
            zIndex: item.zIndex,
            borderLeftColor: item.color,
            backgroundColor: `${item.color}59`,
          }"
          @click="emit('eventClick', item.event)"
        >
          <div class="truncate leading-tight font-medium">
            {{ item.event.scheduleTitle }}
          </div>
          <div class="truncate text-[10px] opacity-80">
            {{ item.timeLabel }}
          </div>
        </button>

        <!-- current-time indicator -->
        <div
          v-if="day.isToday"
          class="pointer-events-none absolute right-0 left-0 z-20 flex items-center"
          :style="{ top: `${nowTop}px` }"
        >
          <span class="-ml-1 size-2 rounded-full bg-red-500" />
          <span class="h-px flex-1 bg-red-500" />
        </div>
      </div>
    </div>
  </div>
</template>
