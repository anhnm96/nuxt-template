<script setup lang="ts">
import { injectTabsRootContext } from './context'

const props = withDefaults(defineProps<{
  as?: string
  value: Primitive
}>(), { as: 'button' })

const { tabsId, modelValue } = injectTabsRootContext()!

const isSelected = computed(() => modelValue.value === props.value)
</script>

<template>
  <component
    :is="as"
    :id="`tab-${value.toString()}__${tabsId}`"
    role="tab"
    :aria-controls="`tab-panel-${value.toString()}__${tabsId}`"
    :aria-selected="isSelected"
    :tabindex="isSelected ? 0 : -1"
    class="btn"
    :class="[isSelected ? 'btn-text-primary selected' : 'btn-text']"
    @click="modelValue = value"
  >
    <slot :is-selected />
  </component>
</template>
