<script lang="ts" setup>
withDefaults(
  defineProps<{ value?: string, maxLength: number }>(),
  { value: '' },
)
</script>

<template>
  <span class="min-w-20 text-sm" :class="[value.length > maxLength && 'text-red-500']">{{ `(${value.length}/${maxLength})` }}</span>
</template>
