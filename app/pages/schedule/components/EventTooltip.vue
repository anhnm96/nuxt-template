<script setup lang="ts">
import type { ScheduleEventUI } from '~/services/schedule'
import dayjs from 'dayjs/esm'
import duration from 'dayjs/esm/plugin/duration'
import relativeTime from 'dayjs/esm/plugin/relativeTime'

// Hover tooltip for a schedule event, shared between EventBlock and the timeline view.
withDefaults(defineProps<{
  event: ScheduleEventUI
  // Suppress the tooltip while dragging/creating/resizing.
  dragging?: boolean
  // Direction the tooltip opens toward (defaults to right).
  placement?: 'top' | 'bottom' | 'left' | 'right'
}>(), {
  placement: 'right',
})
// `humanize()` (all-day durations) needs both plugins.
dayjs.extend(duration)
dayjs.extend(relativeTime)

function getDuration(start: number, end: number, isAllday: boolean) {
  const diff = dayjs.duration(dayjs(end).diff(dayjs(start)))
  return diff.humanize()
  // if (isAllday) return diff.humanize()
  // let res = ''
  // if (diff.days() > 0) res += `${diff.days()}days`
  // if (diff.hours() > 0) res += `${diff.hours()}hours`
  // if (diff.minutes() > 0) res += `${diff.minutes()}minutes`
  // return res
}
</script>

<template>
  <Tooltip
    :disabled="dragging"
    :placement="placement"
    class="min-w-60"
    :style="{ '--event-color': event.color, 'maxWidth': 'min(360px, calc(100vw - 2rem))' }"
  >
    <!-- header -->
    <div class="flex gap-2">
      <span class="h-8 w-1 rounded-full bg-(--event-color)" />
      <div class="flex flex-col">
        <span class="text-truncate text-base leading-tight font-semibold">{{ event.title }}</span>
        <span class="text-xs leading-tight font-medium text-muted">{{ event.calendarTitle }}</span>
      </div>
    </div>
    <!-- body -->
    <div class="mt-4 flex max-h-64 flex-col gap-2 overflow-y-auto py-0.5">
      <!-- time -->
      <div v-if="event.timed && dayjs(event.start).isSame(dayjs(event.end), 'day')" class="flex items-start gap-2 leading-tight">
        <Icon class="translate-y-px" size="12" style="color: var(--event-color)" name="mdi:clock-time-seven-outline" />
        <span>{{ dayjs(event.start).format('HH:mm') }} ~ {{ dayjs(event.end).format('HH:mm') }}</span>
      </div>
      <!-- date -->
      <div class="flex items-start gap-2 leading-tight">
        <Icon class="translate-y-px" size="12" style="color: var(--event-color)" name="mdi:calendar-blank-outline" />
        <span v-if="dayjs(event.start).isSame(dayjs(event.end), 'day')">{{ dayjs(event.start).format('MMM D (ddd)') }}</span>
        <span v-else>
          <template v-if="!event.timed">{{ dayjs(event.start).format('MMM D (ddd)') }} ~ {{ dayjs(event.end).format('MMM D (ddd)') }}</template>
          <template v-else>{{ dayjs(event.start).format('MMM D (ddd) HH:mm') }} ~<br>{{ dayjs(event.end).format('MMM D (ddd) HH:mm') }}</template>
        </span>
      </div>
      <!-- duration -->
      <div class="flex items-start gap-2 leading-tight">
        <Icon class="translate-y-px" size="12" style="color: var(--event-color)" name="mdi:alarm" />
        <span class="first-letter:uppercase">{{ getDuration(event.start, event.end, !event.timed) }}</span>
      </div>
      <!-- calendar name -->
      <div class="flex items-start gap-2 leading-tight">
        <Icon class="translate-y-px" size="12" style="color: var(--event-color)" name="mdi:calendar-account-outline" />
        <span>{{ event.calendarTitle }}</span>
      </div>
    </div>
  </Tooltip>
</template>
