<script setup lang="ts">
import { injectTabsRootContext } from './Tabs.vue'

const props = withDefaults(defineProps<{
  as?: string
  value: PrimitiveValue
}>(), { as: 'button' })

const { tabsId, modelValue, selectTab } = injectTabsRootContext()!

const tabEl = shallowRef()
const isSelected = computed(() => modelValue.value === props.value)
</script>

<template>
  <component
    :is="as"
    :id="`tab-${value.toString()}__${tabsId}`"
    ref="tabEl"
    role="tab"
    :aria-controls="`tab-panel-${value.toString()}__${tabsId}`"
    :aria-selected="isSelected"
    :tabindex="isSelected ? 0 : -1"
    class="btn font-semibold py-3.5"
    :class="[isSelected ? 'btn-text-primary' : 'btn-text']"
    @click="selectTab(value, tabEl)"
  >
    <slot :is-selected />
  </component>
</template>
