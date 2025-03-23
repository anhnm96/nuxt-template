<script lang="ts">
import type { ModelRef, Reactive } from 'vue'

interface TabsContext {
  tabsId: string
  orientation: ComputedRef<'vertical' | 'horizontal'>
  modelValue: ModelRef<PrimitiveValue>
  activeItem: Reactive<{ size: number, position: number }>
  selectTab: (value: PrimitiveValue, el: HTMLElement) => void
}

export const [provideDialogRootContext, injectDialogRootContext]
= createContext<TabsContext>('TabsContext')
</script>

<script setup lang="ts">
const props = defineProps<{
  vertical?: boolean
}>()

const tabsId = useId()

const orientation = computed(() =>
  props.vertical ? 'vertical' : 'horizontal',
)

const modelValue = defineModel<PrimitiveValue>('value', { required: true })
const activeItem = reactive({ size: 0, position: 0 })
function selectTab(value: PrimitiveValue, el: HTMLElement) {
  modelValue.value = value

  if (orientation.value === 'vertical') {
    activeItem.size = el.getBoundingClientRect().height
    activeItem.position = el.offsetTop
  } else {
    activeItem.size = el.getBoundingClientRect().width
    activeItem.position = el.offsetLeft
  }
}

onMounted(() => {
  const firstTab = document.getElementById(`tab-${modelValue.value.toString()}__${tabsId}`)!
  selectTab(modelValue.value, firstTab)
})

provideDialogRootContext({
  tabsId,
  orientation,
  modelValue,
  activeItem,
  selectTab,
})
</script>

<template>
  <div>
    <slot :active-value="modelValue" :active-item />
  </div>
</template>
