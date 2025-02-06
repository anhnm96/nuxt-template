<script lang="ts" setup>
defineProps<{ value: string, maxLength: number }>()
</script>

<template>
  <span class="min-w-20 text-sm" :class="[value.length > maxLength && 'text-red-500']">{{ `(${value.length}/${maxLength})` }}</span>
</template>
