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
const activeItem = reactive({ size: 0, position: 0 })

provideTabsRootContext({
  tabsId,
  orientation,
  modelValue,
  activeItem,
})
</script>

<template>
  <div>
    <slot :active-value="modelValue" :active-item />
  </div>
</template>
