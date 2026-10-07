<script setup lang="ts">
import type { TabValue } from './context'
import { injectTabPanelsContext } from './context'
import { useTabValue } from './useTabValue'

const props = withDefaults(defineProps<{
  as?: string
  value: TabValue
}>(), { as: 'div' })

const { eager } = injectTabPanelsContext()

const { isSelected, tabId, panelId } = useTabValue(() => props.value)
</script>

<template>
  <component
    :is="as"
    v-show="!eager || (eager && isSelected)"
    :id="panelId"
    role="tabpanel"
    :tabindex="0"
    :aria-labelledby="tabId"
  >
    <slot />
  </component>
</template>
