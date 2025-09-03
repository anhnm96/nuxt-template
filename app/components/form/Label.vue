<script lang="ts" setup>
defineProps<{
  required?: boolean
}>()
</script>

<template>
  <label class="font-medium">
    <slot />
    <Icon v-if="required" name="ph:asterisk-duotone" class="ml-px inline-block text-xs text-error" />
  </label>
</template>
