<script lang="ts">
export interface ToastProps {
  title?: string
  description?: string
  severity?: Severity
  onCloseToast?: () => void
}
</script>

<script setup lang="ts">
const props = defineProps<ToastProps>()

const icon = computed(() => {
  let result = { name: '', class: '' }

  switch (props.severity) {
    case 'error':
      result = { name: 'ph:x-circle-fill', class: 'text-error' }
      break
    case 'warn':
      result = { name: 'ph:warning-fill', class: 'text-warn' }
      break
    case 'success':
      result = { name: 'ph:check-circle-fill', class: 'text-success' }
      break
    default:
      result = { name: 'ph:info-fill', class: 'text-info' }
      break
  }

  return result
})
</script>

<template>
  <div class="flex w-(--width) items-center gap-3 rounded-lg border border-elevated bg-(--normal-bg)/60 p-4 shadow-[0_4px_12px_rgba(0,0,0,.1)] backdrop-blur-md">
    <Icon size="20" :class="[icon.class]" :name="icon.name" />
    <div>
      <p
        v-if="title"
        class="font-medium"
      >
        {{ title }}
      </p>
      <p v-if="description">
        {{ description }}
      </p>
    </div>
    <button
      class="ml-auto inline-flex items-center"
      @click="onCloseToast"
    >
      <Icon size="20" class="opacity-70 transition-opacity duration-300 hover:opacity-100" name="ph:x-circle" />
    </button>
  </div>
</template>
