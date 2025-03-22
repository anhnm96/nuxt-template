<script setup lang="ts">
import { injectDialogRootContext } from './Tabs.vue'

withDefaults(defineProps<{ as?: string }>(), { as: 'div' })
const { orientation } = injectDialogRootContext()
</script>

<template>
  <component :is="as" role="tablist" :aria-orientation="orientation">
    <slot />
  </component>
</template>
