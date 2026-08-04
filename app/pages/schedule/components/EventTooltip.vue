<script setup lang="ts">
import type { ScheduleEventUI } from '~/services/schedule'
import dayjs from 'dayjs/esm'
import duration from 'dayjs/esm/plugin/duration'
import relativeTime from 'dayjs/esm/plugin/relativeTime'
import { SCHEDULE_CODE_LABEL_MAP } from '~/pages/schedule/constants'

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

function getDuration(d1: string, d2: string, isAllday: boolean) {
  const start = dayjs(d1)
  const end = dayjs(d2)
  const diff = dayjs.duration(end.diff(start))
  if (isAllday) return diff.humanize()
  let res = ''
  if (diff.days() > 0) res += `${diff.days()}日`
  if (diff.hours() > 0) res += `${diff.hours()}時間`
  if (diff.minutes() > 0) res += `${diff.minutes()}分`
  return res
}
</script>

<template>
  <Tooltip
    :disabled="dragging"
    :placement="placement"
    class="min-w-60"
    :style="{ '--event-color': `#${event.calendarColor}`, 'maxWidth': 'min(360px, calc(100vw - 2rem))' }"
  >
    <!-- header -->
    <div class="flex gap-2">
      <span class="h-8 w-1 rounded-full bg-(--event-color)" />
      <div class="flex flex-col">
        <span class="text-truncate text-base leading-tight font-semibold">{{ event.name }}</span>
        <span class="text-xs leading-tight font-medium text-muted">{{ SCHEDULE_CODE_LABEL_MAP[event.scheduleCd] }}</span>
      </div>
    </div>
    <!-- body -->
    <div class="mt-4 flex max-h-64 flex-col gap-2 overflow-y-auto">
      <!-- time -->
      <div v-if="event.alldayFlg === '0' && dayjs(event.start).isSame(dayjs(event.end), 'day')" class="flex items-start gap-2 leading-tight">
        <Icon class="translate-y-px" size="12" style="color: var(--event-color)" name="mdi:clock-time-seven-outline" />
        <span>{{ formatDateTime(event.startDateString, 'HH:mm') }} ～ {{ formatDateTime(event.endDateString, 'HH:mm') }}</span>
      </div>
      <!-- date -->
      <div class="flex items-start gap-2 leading-tight">
        <Icon class="translate-y-px" size="12" style="color: var(--event-color)" name="mdi:calendar-blank-outline" />
        <span v-if="dayjs(event.start).isSame(dayjs(event.end), 'day')">{{ dayjs(event.startDateString).format('M月D日 (dd)') }}</span>
        <span v-else>
          <template v-if="event.alldayFlg === '1'">{{ dayjs(event.startDateString).format('M月D日 (dd)') }} ～ {{ dayjs(event.endDateString).format('M月D日 (dd)') }}</template>
          <template v-else>{{ dayjs(event.startDateString).format('M月D日 (dd) HH:mm') }} ～<br>{{ dayjs(event.endDateString).format('M月D日 (dd) HH:mm') }}</template>
        </span>
      </div>
      <!-- duration -->
      <div class="flex items-start gap-2 leading-tight">
        <Icon class="translate-y-px" size="12" style="color: var(--event-color)" name="mdi:alarm" />
        <span>{{ getDuration(event.startDate, event.endDate, event.alldayFlg === '1') }}</span>
      </div>
      <!-- calendar name -->
      <div class="flex items-start gap-2 leading-tight">
        <Icon class="translate-y-px" size="12" style="color: var(--event-color)" name="mdi:calendar-account-outline" />
        <span>{{ event.calendarName }}</span>
      </div>
      <!-- invitees -->
      <div v-if="event.memberNames" class="flex items-start gap-2 leading-tight">
        <Icon class="translate-y-px" size="12" style="color: var(--event-color)" name="mdi:account-group-outline" />
        <span>{{ event.memberNames }}</span>
      </div>
      <!-- location -->
      <div v-if="event.scheduleLocation" class="flex items-start gap-2 leading-tight">
        <Icon class="translate-y-px" size="12" style="color: var(--event-color)" name="mdi:map-marker-outline" />
        <span>{{ event.scheduleLocation }}</span>
      </div>
      <!-- url link -->
      <div v-if="event.urlLink" class="flex items-start gap-2 leading-tight">
        <Icon class="translate-y-px" size="12" style="color: var(--event-color)" name="mdi:link" />
        <a
          :href="event.urlLink"
          target="_blank" rel="noopener noreferrer"
          class="text-primary-500 hover:underline"
        >{{ event.urlLink }}</a>
      </div>
      <!-- details -->
      <div v-if="event.details" class="flex items-start gap-2 leading-tight">
        <Icon class="translate-y-px" size="12" style="color: var(--event-color)" name="mdi:information-outline" />
        <span>{{ event.details }}</span>
      </div>
      <!-- register -->
      <div v-if="event.createUserName" class="flex items-start gap-2 leading-tight">
        <Icon class="translate-y-px" size="12" style="color: var(--event-color)" name="mdi:account-edit-outline" />
        <span>{{ event.createUserName }}</span>
      </div>
    </div>
  </Tooltip>
</template>
