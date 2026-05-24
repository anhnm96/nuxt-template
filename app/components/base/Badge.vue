<script lang="ts" setup>
const { severity = 'info' } = defineProps<{
  severity?: LooseAutocomplete<Severity>
  dot?: boolean
  action?: boolean
  actionAriaLabel?: string
}>()

defineEmits(['remove'])

const getVariant = computed(() => {
  switch (severity) {
    case 'info':
      return 'sky'
    case 'success':
      return 'green'
    case 'error':
      return 'red'
    case 'warn':
      return 'orange'
    default:
      return severity
  }
})
</script>

<template>
  <span
    class="inline-flex items-center rounded-full bg-(--severity)/10 px-2 py-1 text-xs font-medium text-(--severity)"
    :style="{ '--severity': `light-dark(var(--color-${getVariant}-500), var(--color-${getVariant}-400))`,
              '--severity-light': `light-dark(var(--color-${getVariant}-400), var(--color-${getVariant}-300))`,
    }"
  >
    <!-- dot -->
    <svg v-if="dot" class="mr-1.5 size-1.5 fill-(--severity)" viewBox="0 0 6 6" aria-hidden="true">
      <circle cx="3" cy="3" r="3" />
    </svg>
    <!-- content -->
    <slot />
    <!-- remove button -->
    <button
      v-if="action"
      type="button"
      class="group hit-area-1 -mr-1 ml-0.5 inline-flex size-3.5 flex-center rounded-full transition hover:bg-(--severity)/20"
      @click="$emit('remove')"
    >
      <span v-if="actionAriaLabel" class="sr-only">{{ actionAriaLabel }}</span>
      <Icon size="10" class="text-(--severity) group-hover:text-(--severity-light)" name="ph:x-bold" />
    </button>
  </span>
</template>
