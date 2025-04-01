<script setup lang="ts">
import type { ReportStatus } from '../types'
import { INQUIRY_STATUS_OPTIONS } from '../constants'

const props = defineProps<{ list: ReportStatus[], status: string, detailStatus: string | undefined }>()

const code = computed(() => {
  return props.list.find(item => item.name === props.status)?.code
})

const classes = computed(() => {
  switch (code.value) {
    case INQUIRY_STATUS_OPTIONS.INVESTIGATING:
      return 'text-primary'
    case INQUIRY_STATUS_OPTIONS.INVESTIGATION_COMPLETED:
      return 'text-success'
    default:
      return ''
  }
})
</script>

<template>
  <span :class="classes">{{ detailStatus || '-' }}</span>
</template>
