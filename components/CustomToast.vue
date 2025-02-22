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
  <div class="w-(--width) flex items-center gap-3 border border-(--normal-border) rounded-(--border-radius) bg-(--normal-bg) p-4 shadow-[0_4px_12px_rgba(0,0,0,.1)]">
    <div data-icon class="size-8 pl-1">
      <Icon size="20" :class="[icon.class]" :name="icon.name" />
    </div>
    <div data-content>
      <p
        v-if="title"
        data-title
        class="!font-semibold"
      >
        {{ title }}
      </p>
      <p v-if="description" data-description>
        {{ description }}
      </p>
    </div>
    <button
      data-button
      data-action
      link
      class="toast-message-close-button"
      @click="onCloseToast"
    >
      <Icon size="20" class="opacity-70 hover:opacity-100 transition-opacity duration-300" name="ph:x-circle" />
    </button>
  </div>
</template>
