<script setup lang="ts">
import { provideTabsRootContext } from './context'

const props = withDefaults(defineProps<{
  vertical?: boolean
  duration?: number
}>(), { duration: 130 })

const tabsId = useId()

const orientation = computed(() =>
  props.vertical ? 'vertical' : 'horizontal',
)

const modelValue = defineModel<PrimitiveValue>('value', { required: true })

provideTabsRootContext({
  tabsId,
  orientation,
  modelValue,
})
</script>

<template>
  <div>
    <slot :active-value="modelValue" />
  </div>
</template>
