<script setup lang="ts">
import { arrow, autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  // 'true' enables the parent DOM element
  // 'false' disables attaching events to any DOM elements
  // string is CSS selector
  target?: string | boolean | HTMLElement
  attachTo?: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
  animate?: string
  delay?: number
  hideDelay?: number
  offset?: number
  trigger?: string
}>(), {
  target: true,
  delay: 200,
  hideDelay: 0,
  placement: 'top',
  animate: 'popover',
  offset: 4,
  trigger: 'hover',
})

const modelValue = defineModel<boolean>()
const tooltipStore = useTooltipStore()
const tooltipId = useId()
const isVisible = ref(false)
const tooltipEl = useTemplateRef('tooltipEl')
const arrowEl = useTemplateRef('arrowEl')

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
const { floatingStyles, placement, middlewareData } = useFloating(anchorEl, tooltipEl, {
  placement: props.placement,
  middleware: [offset(props.offset), flip(), shift(), arrow({ element: arrowEl })],
  whileElementsMounted: autoUpdate,
})

let showTimeout: NodeJS.Timeout | undefined
let hideTimeout: NodeJS.Timeout | undefined

watch(modelValue, (value) => {
  if (value) show()
  else if (value === false) hide()
})

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
    modelValue.value = true
    isVisible.value = true
    tooltipStore.addTooltip(tooltipId)
    anchorEl.value?.setAttribute('aria-describedby', tooltipId)
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
      anchorEl.value?.removeAttribute('aria-describedby')
      hideTimeout = undefined
    }, props.hideDelay)
  }
}

function handleEscape(e: KeyboardEvent) {
  if (e.key === 'Escape')
    hide()
}

const arrowPlacement = computed(() => {
  let result
  switch (props.placement) {
    case 'top':
      result = {
        left: `${middlewareData.value.arrow?.x}px`,
        bottom: `${-props.offset / 2}px`,
      }
      break
    case 'bottom':
      result = {
        left: `${middlewareData.value.arrow?.x}px`,
        top: `${-props.offset / 2}px`,
      }
      break
    case 'left':
      result = {
        right: `${-props.offset / 2}px`,
        top: `${middlewareData.value.arrow?.y}px`,
      }
      break
    case 'right':
      result = {
        left: `${-props.offset / 2}px`,
        top: `${middlewareData.value.arrow?.y}px`,
      }
      break
  }
  return result
})

onBeforeUnmount(() => {
  // Clear any pending timeouts
  if (showTimeout) clearTimeout(showTimeout)
  if (hideTimeout) clearTimeout(hideTimeout)
})

const [TootlipTemplate, Tooltip] = createReusableTemplate()
</script>

<template>
  <TootlipTemplate>
    <div ref="tooltipEl" :style="floatingStyles">
      <Transition :name="animate" @after-leave="modelValue = false">
        <div
          v-if="isVisible" :id="tooltipId" role="tooltip"
          v-bind="$attrs" class="tooltip"
          :style="{ '--trigger-origin': getTransformOrigin(placement) }"
        >
          <div
            ref="arrowEl" class="z-10 size-2 rotate-45  bg-black/80" :style="{
              position: 'absolute',
              ...arrowPlacement,
            }"
          />
          <slot />
        </div>
      </Transition>
    </div>
  </TootlipTemplate>
  <Teleport v-if="attachTo" :to="attachTo">
    <Tooltip />
  </Teleport>
  <Tooltip v-else />
</template>

<style>
.tooltip {
  z-index: 9000;
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
