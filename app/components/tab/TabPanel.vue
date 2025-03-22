<script setup lang="ts">
import { injectDialogPanelsContext } from './TabPanels.vue'
import { injectDialogRootContext } from './Tabs.vue'

const props = withDefaults(defineProps<{
  as?: string
  value: PrimitiveValue
}>(), { as: 'div' })

const { tabsId, activeTab } = injectDialogRootContext()
const { eager } = injectDialogPanelsContext()

const isSelected = computed(() => activeTab.value === props.value)
</script>

<template>
  <component
    :is="as"
    v-show="!eager || (eager && isSelected)"
    :id="`tab-panel-${value.toString()}__${tabsId}`"
    role="tabpanel"
    :tabindex="0"
    :aria-labelledby="`tab-${value.toString()}__${tabsId}`"
  >
    <slot />
  </component>
</template>
