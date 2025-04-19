<script setup lang="ts">
import { injectTabsRootContext } from './context'

const { tabsId, modelValue, orientation } = injectTabsRootContext()

const activeItem = reactive({ size: 0, position: 0 })

function updateIndicatorStyle() {
  const el = document.getElementById(`tab-${modelValue.value.toString()}__${tabsId}`)!
  if (!el) return

  if (orientation.value === 'vertical') {
    activeItem.size = el.getBoundingClientRect().height
    activeItem.position = el.offsetTop
  } else {
    activeItem.size = el.getBoundingClientRect().width
    activeItem.position = el.offsetLeft
  }
}

const style = computed(() => {
  if (orientation.value === 'vertical') {
    return {
      height: `${activeItem.size}px`,
      transform: `translateY(${activeItem.position}px)`,
    }
  }
  return {
    width: `${activeItem.size}px`,
    transform: `translateX(${activeItem.position}px)`,
  }
})

onMounted(() => {
  // wait for animation to finish (e.g: Dialog)
  setTimeout(() => {
    watch(modelValue, () => {
      updateIndicatorStyle()
    }, { immediate: true })
  }, 300)
})
</script>

<template>
  <div
    :style
    class="pointer-events-none absolute rounded-md bg-primary duration-300"
    :class="[orientation === 'vertical' ? 'inset-x-0 w-full top-0 transition-[height,transform]' : 'bottom-0 left-0 h-0.5 transition-[width,transform]']"
  />
</template>
