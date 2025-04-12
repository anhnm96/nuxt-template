<script setup lang="ts">
import { injectTabsRootContext } from './Tabs.vue'

withDefaults(defineProps<{ as?: string }>(), { as: 'div' })
const { orientation } = injectTabsRootContext()
</script>

<template>
  <component :is="as" role="tablist" :aria-orientation="orientation" class="relative">
    <slot />
  </component>
</template>
