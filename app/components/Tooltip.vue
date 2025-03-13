<script setup lang="ts">
type Position = 'top' | 'bottom' | 'left' | 'right'

const props = withDefaults(defineProps<{
  target?: string
  position?: Position
  delay?: number
  hideDelay?: number
  persistent?: boolean
  offset?: [number, number]
  maxHeight?: string
  maxWidth?: string
}>(), {
  delay: 0,
  hideDelay: 0,
  position: 'top',
  offset: () => [14, 14],
})

const tooltipEl = ref()
let parent: HTMLElement

async function updatePosition() {
  await nextTick()
  setPosition({
    targetEl: tooltipEl.value!,
    offset: props.offset,
    anchorEl: parent,
    anchorOrigin: { vertical: 'bottom', horizontal: 'middle' },
    selfOrigin: { vertical: 'center', horizontal: 'middle' },
    // maxHeight: props.maxHeight,
    // maxWidth: props.maxWidth,
  })
}

// Add reactive state
const isVisible = ref(false)
let showTimeout: NodeJS.Timeout | null = null
let hideTimeout: NodeJS.Timeout | null = null

// Functions to show/hide tooltip with delay
function show() {
  clearTimeout(hideTimeout!)
  hideTimeout = null

  if (!isVisible.value && !showTimeout) {
    showTimeout = setTimeout(() => {
      isVisible.value = true
      updatePosition()
      showTimeout = null
    }, props.delay)
  }
}

function hide() {
  clearTimeout(showTimeout!)
  showTimeout = null

  if (isVisible.value && !hideTimeout) {
    hideTimeout = setTimeout(() => {
      isVisible.value = false
      hideTimeout = null
    }, props.hideDelay)
  }
}
const vm = getCurrentInstance()

// Add event listeners
nextTick(() => {
  parent = vm?.proxy?.$el.parentElement
  console.log(parent)
  if (parent) {
    parent.addEventListener('mouseenter', show)
    parent.addEventListener('mouseleave', hide)
  }
})

// Clean up on unmount
onBeforeUnmount(() => {
  if (parent) {
    parent.removeEventListener('mouseenter', show)
    parent.removeEventListener('mouseleave', hide)
  }

  // Clear any pending timeouts
  if (showTimeout) clearTimeout(showTimeout)
  if (hideTimeout) clearTimeout(hideTimeout)
})
</script>

<template>
  <Transition name="fade">
    <div v-if="isVisible" ref="tooltipEl" class="tooltip">
      <slot />
    </div>
  </Transition>
</template>

<style>
.tooltip {
  z-index: 9000;
  position: fixed !important;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 6px 10px;
  max-width: 95vw;
  max-height: 65vh;
  will-change: auto;
}
</style>
