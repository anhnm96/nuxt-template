<script setup lang="ts">
import { nanoid } from 'nanoid'

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
const tooltipStore = useTooltipStore()
const tooltipId = nanoid()
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
    if (props.trigger === 'hover' && tooltipStore.hasVisibleTooltip) {
      handleShow()
      return
    }

    showTimeout = setTimeout(() => {
      handleShow()
      showTimeout = undefined
    }, props.delay)
  }

  function handleShow() {
    isVisible.value = true
    tooltipStore.addTooltip(tooltipId)
    updatePosition()
    document.addEventListener('keydown', handleEscape)
  }
}

function hide() {
  clearTimeout(showTimeout)
  showTimeout = undefined
  document.removeEventListener('keydown', handleEscape)

  if (isVisible.value && !hideTimeout) {
    hideTimeout = setTimeout(() => {
      isVisible.value = false
      tooltipStore.removeTooltip(tooltipId)
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
    <div v-if="isVisible" ref="tooltipEl" class="tooltip">
      <Transition :name="animate || `slide-${position}`" appear>
        <div v-bind="$attrs" class="overflow-hidden">
          <slot />
        </div>
      </Transition>
    </div>
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
  overflow: hidden;
  max-width: 95vw;
  max-height: 65vh;
  will-change: auto;
  pointer-events: none;
  overflow-wrap: break-word;
  white-space: pre-line;
}

.tooltip-dark {
  font-size: 12px;
  padding: 6px 10px;
  background-color: rgba(0,0,0,.8);
  color: rgb(255 255 255 / 0.8);
  border-radius: 6px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
}
</style>
