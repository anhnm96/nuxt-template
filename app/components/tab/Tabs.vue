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
const props = withDefaults(defineProps<{
  vertical?: boolean
  duration?: number
}>(), { duration: 150 })

const tabsId = useId()

const orientation = computed(() =>
  props.vertical ? 'vertical' : 'horizontal',
)

const modelValue = defineModel<PrimitiveValue>('value', { required: true })
const activeItem = reactive({ size: 0, position: 0 })

let previousSize = -1
let previousPosition = 0
let animated = true

function handleFluidMove(targetSize: number, targetPosition: number) {
  if (!animated) {
    return
  }

  animated = false

  if (previousSize === -1) {
    activeItem.size = targetSize
    activeItem.position = targetPosition

    animated = true
  } else {
    if (targetPosition > previousPosition) {
      activeItem.size = targetSize + targetPosition - previousPosition

      setTimeout(() => {
        activeItem.size = targetSize
        activeItem.position = targetPosition

        animated = true
      }, props.duration)
    } else {
      activeItem.position = targetPosition
      activeItem.size = previousSize + previousPosition - activeItem.position

      setTimeout(() => {
        activeItem.size = targetSize

        animated = true
      }, props.duration)
    }
  }

  previousSize = targetSize
  previousPosition = targetPosition
}

function selectTab(value: PrimitiveValue, el: HTMLElement) {
  modelValue.value = value

  if (orientation.value === 'vertical') {
    handleFluidMove(el.getBoundingClientRect().height, el.offsetTop)
  } else {
    handleFluidMove(el.getBoundingClientRect().width, el.offsetLeft)
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
