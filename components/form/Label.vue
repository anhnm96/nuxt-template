<script lang="ts" setup>
defineProps<{
  required?: boolean
}>()
</script>

<template>
  <label class="font-medium">
    <slot />
    <Icon v-if="required" name="ph:asterisk-duotone" class="text-error ml-px inline-block text-xs" />
  </label>
</template>
