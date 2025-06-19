<script setup lang="ts">
const props = defineProps<{
  color?: string
}>()

const previewColorValue = computed<string | undefined>(() => {
  if (!props.color) {
    return undefined
  }

  if (isValidColorHexCode(props.color!)) {
    return props.color
  }

  return undefined
})
</script>

<template>
  <div
    :class="{ 'bg-checkerboard': !previewColorValue }"
    :style="{ backgroundColor: previewColorValue }"
  />
</template>
