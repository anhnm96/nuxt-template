<script lang="ts" setup>
withDefaults(
  defineProps<{ value?: string, maxLength: number }>(),
  { value: '' },
)
</script>

<template>
  <span
    class="min-w-20 text-description"
    :class="[value.length > maxLength && 'text-error']"
  >{{ `(${value.length}/${maxLength})` }}</span>
</template>
