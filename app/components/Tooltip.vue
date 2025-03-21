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
  trigger?: string
}>(), {
  target: true,
  delay: 200,
  hideDelay: 0,
  position: 'top',
  distance: 4,
  defaultDirection: 'ltr',
  trigger: 'hover',
})

const modelValue = defineModel<boolean>()
const isVisible = ref(false)
const tooltipEl = useTemplateRef('tooltipEl')
const anchorEvents: { evtName: string, listener: () => void, options: AddEventListenerOptions }[] = [
  { evtName: 'touchstart', listener: show, options: { passive: true } },
  { evtName: 'touchmove', listener: hide, options: { passive: true, capture: true } },
  { evtName: 'touchend', listener: hide, options: { passive: true, capture: true } },
  { evtName: 'click', listener: hide, options: { passive: true, capture: true } },
]

if (props.trigger === 'hover') {
  anchorEvents.push({ evtName: 'mouseenter', listener: show, options: { passive: true } })
  anchorEvents.push({ evtName: 'mouseleave', listener: hide, options: { passive: true } })
  anchorEvents.push({ evtName: 'focus', listener: show, options: { passive: true } })
  anchorEvents.push({ evtName: 'blur', listener: hide, options: { passive: true } })
}

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
    position: computedPosition,
    distance: props.distance,
  })
}

let showTimeout: NodeJS.Timeout | undefined
let hideTimeout: NodeJS.Timeout | undefined

watch(modelValue, (value) => {
  if (value) show()
  else if (value === false) hide()
}, { immediate: true })

function show() {
  clearTimeout(hideTimeout)
  hideTimeout = undefined

  if (!isVisible.value && !showTimeout) {
    showTimeout = setTimeout(() => {
      isVisible.value = true
      updatePosition()
      document.addEventListener('keydown', handleEscape)
      showTimeout = undefined
    }, props.delay)
  }
}

function hide() {
  clearTimeout(showTimeout)
  showTimeout = undefined
  document.removeEventListener('keydown', handleEscape)

  if (isVisible.value && !hideTimeout) {
    hideTimeout = setTimeout(() => {
      isVisible.value = false
      modelValue.value = false
      hideTimeout = undefined
    }, props.hideDelay)
  }
}

function handleEscape(e: KeyboardEvent) {
  if (e.key === 'Escape')
    hide()
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
  pointer-events: none;
}
</style>
