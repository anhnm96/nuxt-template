<script setup lang="ts">
import { injectDialogRootContext } from './Tabs.vue'

const props = withDefaults(defineProps<{
  as?: string
  value: PrimitiveValue
}>(), { as: 'button' })
const { tabsId, activeTab, selectTab } = injectDialogRootContext()!

const isSelected = computed(() => activeTab.value === props.value)
</script>

<template>
  <component
    :is="as"
    :id="`tab-${value.toString()}__${tabsId}`"
    role="tab"
    :aria-controls="`tab-panel-${value.toString()}__${tabsId}`"
    :aria-selected="isSelected"
    :tabindex="isSelected ? 0 : -1"
    @click="selectTab(value)"
  >
    <slot :is-selected />
  </component>
</template>
