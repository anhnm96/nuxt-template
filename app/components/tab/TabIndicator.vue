<script setup lang="ts">
import { injectTabsRootContext } from './context'

const { tabsId, modelValue, orientation } = injectTabsRootContext()

const activeItem = reactive({ size: 0, position: 0 })

let observer: ResizeObserver | undefined
let observedEl: HTMLElement | undefined

function getActiveEl() {
  return document.getElementById(`tab-${modelValue.value.toString()}__${tabsId}`)
}

function updateIndicatorStyle() {
  const el = getActiveEl()
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

// Observe the active tab so the indicator is measured as soon as the element
// actually has a layout box (initial mount, web-font load, container resize)
function observeActiveEl() {
  const el = getActiveEl()
  if (!observer || !el || el === observedEl) return
  if (observedEl) observer.unobserve(observedEl)
  observer.observe(el)
  observedEl = el
}

onMounted(() => {
  observer = new ResizeObserver(() => updateIndicatorStyle())
  // Re-target the observer (and re-measure) whenever the active tab changes.
  watch(modelValue, () => {
    observeActiveEl()
    updateIndicatorStyle()
  }, { immediate: true, flush: 'post' })
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = undefined
  observedEl = undefined
})
</script>

<template>
  <div
    :style
    class="pointer-events-none absolute rounded-md bg-primary duration-300"
    :class="[orientation === 'vertical' ? 'inset-x-0 top-0 w-full transition-[height,transform]' : 'bottom-0 left-0 h-0.5 transition-[width,transform]']"
  />
</template>
