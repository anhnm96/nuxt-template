<script setup lang="ts">
defineOptions({ inheritAttrs: false })
</script>

<template>
  <div class="relative">
    <slot>
      <input v-bind="$attrs" class="inputtext" placeholder="placeholder">
    </slot>
  </div>
</template>
