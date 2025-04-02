<script setup lang="ts">
import type { ReportStatus } from '../types'
import { INQUIRY_STATUS_OPTIONS } from '../constants'

const props = defineProps<{ list: ReportStatus[], status: string }>()

const code = computed(() => {
  return props.list.find(item => item.name === props.status)?.code
})

const classes = computed(() => {
  switch (code.value) {
    case INQUIRY_STATUS_OPTIONS.PENDING:
      return 'bg-abd'
    case INQUIRY_STATUS_OPTIONS.RECEIVED:
      return 'bg-orange-200'
    case INQUIRY_STATUS_OPTIONS.INVESTIGATING:
      return 'bg-primary text-white'
    case INQUIRY_STATUS_OPTIONS.INVESTIGATION_COMPLETED:
      return 'bg-success'
    case INQUIRY_STATUS_OPTIONS.REPORT_CANCELLED:
      return 'bg-invalid text-white'
    default:
      return ''
  }
})
</script>

<template>
  <span class="whitespace-nowrap inline-flex flex-center rounded-full px-4 py-2" :class="classes">{{ status }}</span>
</template>
