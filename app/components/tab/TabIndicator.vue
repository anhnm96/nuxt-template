<script setup lang="ts">
import { injectTabsRootContext } from './context'

const { orientation, activeTabEl, tabEls } = injectTabsRootContext()

const activeItem = reactive({ size: 0, position: 0 })

/**
 * Size and position both come from the `offset*` properties, so both are in the layout
 * space of `TabList`. `getBoundingClientRect` reports the box after transforms, and a size
 * from it does not agree with `offsetLeft` in a popup that has a scale transition.
 */
function measure() {
  const el = activeTabEl.value
  // No active tab: keep the last measurement, so the indicator does not jump to the origin.
  if (!el) return

  const vertical = orientation.value === 'vertical'
  activeItem.size = vertical ? el.offsetHeight : el.offsetWidth
  activeItem.position = vertical ? el.offsetTop : el.offsetLeft
}

const style = computed(() => orientation.value === 'vertical'
  ? { height: `${activeItem.size}px`, transform: `translateY(${activeItem.position}px)` }
  : { width: `${activeItem.size}px`, transform: `translateX(${activeItem.position}px)` })

// The active tab changes, which includes the first time the tabs register themselves.
watch([activeTabEl, orientation], measure, { flush: 'post' })
onMounted(measure)

// A tab gets a layout box or changes size: first paint, a web font, a new label. Every tab
// is observed, because a tab that grows moves the tabs after it.
useResizeObserver(tabEls, measure)
</script>

<template>
  <!-- an edge rule; `h-full` or `w-full` makes it a block instead.
       See DESIGN.md, "Two indicator shapes, one default". -->
  <div
    :style
    class="pointer-events-none absolute rounded-md bg-primary duration-300 ease-cubic-out"
    :class="[orientation === 'vertical'
      ? 'top-0 right-0 w-0.5 transition-[height,transform]'
      : 'bottom-0 left-0 h-0.5 transition-[width,transform]']"
  />
</template>
