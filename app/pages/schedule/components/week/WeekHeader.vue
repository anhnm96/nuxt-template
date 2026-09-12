<script setup lang="ts">
import type { DayColumn } from '~/utils/schedule'

defineProps<{
  days: DayColumn[]
  /**
   * Key of the column that is today, from the view's live clock. `day.isToday`
   * is a snapshot taken when the range was built, so it would still point at
   * yesterday after midnight.
   */
  todayKey: string
}>()
</script>

<template>
  <div class="week-grid border-b border-elevated font-medium">
    <div />
    <div
      v-for="day in days"
      :key="day.key"
      class="flex shrink-0 flex-col flex-center gap-0.5 border-l border-elevated py-2 text-sm font-medium"
      :class="day.key === todayKey && 'text-primary font-semibold'"
    >
      <span class="text-xs">{{ day.label }}</span>
      <span
        class="flex size-7 flex-center rounded-full text-base leading-none"
        :class="day.key === todayKey && 'bg-primary/80 text-white'"
      >{{ day.date }}</span>
    </div>
  </div>
</template>
