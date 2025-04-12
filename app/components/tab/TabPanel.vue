<script setup lang="ts">
import { injectTabPanelsContext, injectTabsRootContext } from './context'

const props = withDefaults(defineProps<{
  as?: string
  value: PrimitiveValue
}>(), { as: 'div' })

const { tabsId, modelValue } = injectTabsRootContext()
const { eager } = injectTabPanelsContext()

const isSelected = computed(() => modelValue.value === props.value)
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
