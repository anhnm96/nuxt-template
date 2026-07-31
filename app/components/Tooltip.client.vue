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
  // when true, the tooltip never shows (and hides if already visible) —
  // e.g. while the anchored element is being dragged
  disabled?: boolean
}>(), {
  target: true,
  attachTo: 'body',
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
  anchorEvents.push({ evtName: 'mouseleave', listener: handleAnchorMouseLeave, options: { passive: true } })
  anchorEvents.push({ evtName: 'focus', listener: show, options: { passive: true } })
  anchorEvents.push({ evtName: 'blur', listener: hide, options: { passive: true } })
}

const { anchorEl } = useAnchor(anchorEvents)
const { floatingStyles, placement, middlewareData } = useFloating(anchorEl, tooltipEl, {
  placement: () => props.placement,
  middleware: [offset(props.offset), flip(), shift(), arrow({ element: arrowEl })],
  whileElementsMounted: autoUpdate,
})

let showTimeout: NodeJS.Timeout | undefined
let hideTimeout: NodeJS.Timeout | undefined

watch(modelValue, (value) => {
  if (value) show()
  else if (value === false) hide()
})

// Disabling mid-hover must dismiss an already-visible tooltip.
watch(() => props.disabled, (value) => {
  if (value) hide()
})

function show() {
  if (props.disabled) return

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

function handleAnchorMouseLeave(event: MouseEvent) {
  if (tooltipEl.value?.contains(event.relatedTarget as HTMLElement))
    return
  hide()
}

function handleTooltipMouseLeave(event: MouseEvent) {
  if (anchorEl.value?.contains(event.relatedTarget as HTMLElement))
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
  if (e.key === 'Escape') {
    e.stopImmediatePropagation()
    hide()
  }
}

const side = computed(() => placement.value.split('-')[0] as Position)

const hitAreaVar = computed(() => {
  const varMap = { top: '--hit-area-b', bottom: '--hit-area-t', left: '--hit-area-r', right: '--hit-area-l' } as const
  const cssVar = varMap[side.value]
  return cssVar ? { [cssVar]: `${-props.offset}px` } : {}
})

const ARROW_W = 8
const ARROW_H = 5

const arrowConfig = computed(() => {
  const { x = 0, y = 0 } = middlewareData.value.arrow ?? {}
  const s = side.value
  const isVertical = s === 'top' || s === 'bottom'
  const w = isVertical ? ARROW_W : ARROW_H
  const h = isVertical ? ARROW_H : ARROW_W

  // open paths (no Z) — fill auto-closes for the triangle, stroke only draws the 2 visible edges
  const pathMap = {
    top: `M0 0 L${ARROW_W / 2} ${ARROW_H} L${ARROW_W} 0`,
    bottom: `M0 ${ARROW_H} L${ARROW_W / 2} 0 L${ARROW_W} ${ARROW_H}`,
    left: `M0 0 L${ARROW_H} ${ARROW_W / 2} L0 ${ARROW_W}`,
    right: `M${ARROW_H} 0 L0 ${ARROW_W / 2} L${ARROW_H} ${ARROW_W}`,
  }

  // 1px overlap with tooltip body to hide the border seam at the connection
  const edge = `${-(ARROW_H - 1)}px`
  const positionMap = {
    top: { left: `${x}px`, bottom: edge },
    bottom: { left: `${x}px`, top: edge },
    left: { right: edge, top: `${y}px` },
    right: { left: edge, top: `${y}px` },
  }

  return {
    viewBox: `0 0 ${w} ${h}`,
    d: pathMap[s],
    width: w,
    height: h,
    style: { position: 'absolute' as const, ...positionMap[s] },
  }
})

onBeforeUnmount(() => {
  // Clear any pending timeouts
  if (showTimeout) clearTimeout(showTimeout)
  if (hideTimeout) clearTimeout(hideTimeout)
  document.removeEventListener('keydown', handleEscape)
  tooltipStore.removeTooltip(tooltipId)
  anchorEl.value?.removeAttribute('aria-describedby')
})

const [TooltipTemplate, UTooltip] = createReusableTemplate()
</script>

<template>
  <TooltipTemplate>
    <div
      v-if="modelValue"
      ref="tooltipEl"
      class="tooltip-container hit-area"
      :style="{ ...floatingStyles, ...hitAreaVar }"
      @mouseleave="handleTooltipMouseLeave"
    >
      <Transition appear :name="animate" @after-leave="isVisible || (modelValue = false)">
        <div v-if="isVisible" :style="{ '--trigger-origin': getTransformOrigin(placement) }">
          <span ref="arrowEl" class="arrow" :style="arrowConfig.style">
            <svg :width="arrowConfig.width" :height="arrowConfig.height" :viewBox="arrowConfig.viewBox">
              <path :d="arrowConfig.d" />
            </svg>
          </span>
          <div
            :id="tooltipId" role="tooltip"
            v-bind="$attrs" class="tooltip tooltip-dark"
          >
            <slot :hide />
          </div>
        </div>
      </Transition>
    </div>
  </TooltipTemplate>
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
  background-color: var(--color-surface);
  font-size: 12px;
  border-radius: 6px;
  box-shadow: light-dark(
    0 12px 32px color-mix(in srgb, var(--color-slate-900) 18%, transparent),
    0 12px 32px, color-mix(in srgb, var(--color-slate-950) 54%, transparent));
  border: 1px solid var(--color-elevated);
}

.tooltip-container .arrow {
  background-color: var(--color-surface);
}
.tooltip-container .arrow path {
  fill: var(--color-surface);
  stroke: var(--color-elevated);
  stroke-width: 1;
}
</style>
