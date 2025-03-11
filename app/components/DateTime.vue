<script setup lang="ts">
import { DATE_FORMAT, DATE_TIME_FORMAT } from '~/utils/date'

const props = withDefaults(defineProps<{
  date?: Date | number | string
  startDate?: Date | number | string
  endDate?: Date | number | string
  separator?: string
  showTime?: boolean
  format?: string
}>(), { separator: ' ~ ' })

const start = computed(() => props.startDate ?? props.date ?? props.endDate)
const end = computed(() => props.startDate ? props.endDate : undefined)
const dateFormat = computed(() => {
  return props.format ?? (props.showTime ? DATE_TIME_FORMAT : DATE_FORMAT)
})
</script>

<template>
  <template v-if="start">
    <time :datetime="new Date(start).toISOString()">
      {{ formatDateTime(start, dateFormat) }}
    </time>
    <template v-if="end">
      {{ separator }} <time :datetime="new Date(end).toISOString()">{{ formatDateTime(end, dateFormat) }}</time>
    </template>
  </template>
  <slot v-else name="empty" />
</template>
