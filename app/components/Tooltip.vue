<script setup lang="ts">
defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  // 'true' enables the parent DOM element
  // 'false' disables attaching events to any DOM elements
  // string is CSS selector
  target?: string | boolean | HTMLElement
  attachTo?: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  animate?: string
  delay?: number
  hideDelay?: number
  persistent?: boolean
  distance?: number
  defaultDirection?: 'ltr' | 'rtl'
}>(), {
  target: true,
  delay: 200,
  hideDelay: 0,
  position: 'top',
  distance: 4,
  defaultDirection: 'ltr',
})

const tooltipEl = useTemplateRef('tooltipEl')
const anchorEvents: { evtName: string, listener: () => void, options: AddEventListenerOptions }[] = [
  { evtName: 'mouseenter', listener: show, options: { passive: true } },
  { evtName: 'mouseleave', listener: hide, options: { passive: true } },
  { evtName: 'touchstart', listener: show, options: { passive: true } },
  { evtName: 'touchmove', listener: hide, options: { passive: true, capture: true } },
  { evtName: 'touchend', listener: hide, options: { passive: true, capture: true } },
  { evtName: 'click', listener: hide, options: { passive: true, capture: true } },
]
const { anchorEl } = useAnchor(anchorEvents)

async function updatePosition() {
  await nextTick()
  // Auto reverse horizontal position for rtl if needed
  const computedPosition = ((props.defaultDirection === 'ltr' && document.dir === 'rtl') || (props.defaultDirection === 'rtl' && document.dir !== 'rtl'))
    ? (props.position === 'left' ? 'right' : props.position === 'right' ? 'left' : props.position)
    : props.position

  setPosition({
    targetEl: tooltipEl.value!,
    anchorEl: anchorEl.value!,
    anchorOrigin: { vertical: 'bottom', horizontal: 'middle' },
    selfOrigin: { vertical: 'center', horizontal: 'middle' },
    position: computedPosition,
    distance: props.distance,
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

onBeforeUnmount(() => {
  // Clear any pending timeouts
  if (showTimeout) clearTimeout(showTimeout)
  if (hideTimeout) clearTimeout(hideTimeout)
})

const [DefineTemplate, ReuseTemplate] = createReusableTemplate()
</script>

<template>
  <DefineTemplate>
    <Transition :name="animate || `slide-${position}`">
      <div v-if="isVisible" v-bind="$attrs" ref="tooltipEl" class="tooltip">
        <slot />
      </div>
    </Transition>
  </DefineTemplate>
  <Teleport v-if="attachTo" :to="attachTo">
    <ReuseTemplate />
  </Teleport>
  <ReuseTemplate v-else />
</template>

<style scoped>
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
