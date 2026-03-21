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
  offset: 8,
  trigger: 'hover',
})

const modelValue = defineModel<boolean>()
const tooltipStore = useTooltipStore()
const tooltipId = `tooltip__${Date.now().toString(36) + Math.random().toString(36).slice(2)}`
const isVisible = ref(false)
const tooltipEl = useTemplateRef('tooltipEl')
const arrowEl = useTemplateRef('arrowEl')

const anchorEvents: { evtName: string, listener: (event?: MouseEvent | TouchEvent) => void, options: AddEventListenerOptions }[] = [
  { evtName: 'touchstart', listener: show, options: { passive: true } },
  { evtName: 'touchmove', listener: hide, options: { passive: true, capture: true } },
  { evtName: 'touchend', listener: hide, options: { passive: true, capture: true } },
  { evtName: 'click', listener: hide, options: { passive: true, capture: true } },
]

if (props.trigger === 'hover') {
  anchorEvents.push({ evtName: 'mouseenter', listener: show, options: { passive: true } })
  // @ts-expect-error - event is optional
  anchorEvents.push({ evtName: 'mouseleave', listener: handleMouseLeave, options: { passive: true } })
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

// TODO: pertain tooltip when move from anchor to tooltip and vice versa
function handleMouseLeave(event: MouseEvent) {
  // if render outside the anchor element with Teleport,
  // and the mouse is still within the anchor element, return
  if (props.attachTo && (!anchorEl.value || (event.relatedTarget as HTMLElement)?.contains(tooltipEl.value)))
    return
  hide()
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

const side = computed(() => placement.value.split('-')[0] as Position)

const hitAreaVar = computed(() => {
  const varMap = { top: '--hit-area-b', bottom: '--hit-area-t', left: '--hit-area-r', right: '--hit-area-l' } as const
  const cssVar = varMap[side.value]
  return cssVar ? { [cssVar]: `${-props.offset}px` } : {}
})

const arrowPlacement = computed(() => {
  const { x = 0, y = 0 } = middlewareData.value.arrow ?? {}
  const edge = `${-props.offset / 2}px`
  const map = {
    top: { left: `${x}px`, bottom: edge },
    bottom: { left: `${x}px`, top: edge },
    left: { right: edge, top: `${y}px` },
    right: { left: edge, top: `${y}px` },
  }
  return map[side.value]
})

onBeforeUnmount(() => {
  // Clear any pending timeouts
  if (showTimeout) clearTimeout(showTimeout)
  if (hideTimeout) clearTimeout(hideTimeout)
})

const [TootlipTemplate, UTooltip] = createReusableTemplate()
</script>

<template>
  <TootlipTemplate>
    <div
      v-if="modelValue"
      ref="tooltipEl"
      class="tooltip-container hit-area"
      :style="{ ...floatingStyles, ...hitAreaVar }"
    >
      <Transition appear :name="animate" @after-leave="modelValue = false">
        <div
          v-if="isVisible" :id="tooltipId" role="tooltip"
          v-bind="$attrs" class="tooltip"
          :style="{ '--trigger-origin': getTransformOrigin(placement) }"
        >
          <div
            ref="arrowEl" class="arrow size-2 rotate-45" :style="{
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
    <UTooltip />
  </Teleport>
  <UTooltip v-else />
</template>

<style>
.tooltip-container {
  z-index: 9000;
  max-width: 95vw;
  max-height: 65vh;
  will-change: auto;
  overflow-wrap: break-word;
  white-space: pre-line;
}
.tooltip {
  padding: 6px 10px;
}

.tooltip-dark {
  background-color: rgba(0,0,0,.8);
  font-size: 12px;
  color: rgb(255 255 255 / 0.8);
  border-radius: 6px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
}

.tooltip-dark .arrow {
  background-color: rgba(0,0,0,.8);
}
</style>
