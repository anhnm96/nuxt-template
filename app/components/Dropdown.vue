<script setup lang="ts">
import type { Placement } from '@floating-ui/vue'
import { autoUpdate, flip, offset as floatingOffset, shift, useFloating } from '@floating-ui/vue'

type TriggerType = 'click' | 'hover'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<{
  placement?: Placement
  triggers?: TriggerType[]
  offset?: number
  disabled?: boolean
  transition?: string
}>(), {
  placement: 'bottom',
  triggers: () => (['click']),
  offset: 4,
  transition: 'popover',
})

const isOpen = defineModel('open', {
  type: Boolean,
  default: false,
})

const dropdownEl = useTemplateRef('dropdownEl')
const popoverEl = useTemplateRef('popoverEl')
const { floatingStyles, placement: resolvedPlacement } = useFloating(dropdownEl, popoverEl, {
  placement: props.placement,
  middleware: [floatingOffset(props.offset), flip(), shift()],
  whileElementsMounted: autoUpdate,
})

function toggleShow(value?: boolean) {
  if (props.disabled) return
  isOpen.value = value ?? !isOpen.value
}

let lastFocusedElement: HTMLElement | null = null
watch(isOpen, async (value) => {
  if (value) {
    lastFocusedElement = document.activeElement as HTMLElement
  } else {
    setTimeout(() => {
      lastFocusedElement?.focus()
    }, 0)
  }
})

// click-outside only applies to click trigger; hover closes via mouseleave
const hasClickOutside = props.triggers.includes('click')

let touchStartY = 0

// hover bundles focus/blur and touch fallback (mirrors Tooltip2 pattern)
const dropdownProps = {
  onClick: props.triggers.includes('click') ? () => toggleShow() : undefined,
  onMouseenter: props.triggers.includes('hover') ? () => toggleShow(true) : undefined,
  onMouseleave: props.triggers.includes('hover') ? () => toggleShow(false) : undefined,
  onFocus: props.triggers.includes('hover') ? () => toggleShow(true) : undefined,
  onBlur: props.triggers.includes('hover') ? () => toggleShow(false) : undefined,
  onTouchstart: props.triggers.includes('hover')
    ? (e: TouchEvent) => {
        touchStartY = e.touches[0]?.clientY ?? 0; toggleShow(true)
      }
    : undefined,
  onTouchmove: props.triggers.includes('hover')
    ? (e: TouchEvent) => {
        if (Math.abs(e.touches[0]?.clientY ?? 0 - touchStartY) > 10) toggleShow(false)
      }
    : undefined,
}

function handleKeydown(event: KeyboardEvent) {
  // hide popup
  if (event.code === 'Escape' && isOpen.value) {
    event.stopImmediatePropagation()
    isOpen.value = false
  }

  // arrow down key, show popup
  if (event.code === 'ArrowDown' && dropdownEl.value?.contains(document.activeElement)) {
    event.preventDefault()
    if (!isOpen.value) {
      toggleShow(true)
    } else {
      // focus on the first element in the popover
      const firstFocusable = popoverEl.value?.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      firstFocusable?.focus()
    }
  }
}

defineExpose({
  toggleShow,
})
</script>

<template>
  <!-- dropdown -->
  <div class="contents" :style="{ '--trigger-origin': getTransformOrigin(resolvedPlacement) }" @keydown="handleKeydown">
    <!-- trigger -->
    <div
      ref="dropdownEl" class="inline-flex w-fit"
      aria-haspopup="true" :aria-expanded="isOpen"
      v-bind="dropdownProps"
    >
      <slot />
    </div>
    <!-- popover -->
    <div ref="popoverEl" class="z-(--popover)" :style="floatingStyles">
      <Transition :name="transition">
        <div
          v-if="isOpen"
          v-click-outside="() => hasClickOutside && toggleShow(false)"
          v-bind="$attrs"
          class="popover"
          tabindex="-1"
        >
          <slot name="popover" v-bind="{ toggleShow }" />
        </div>
      </Transition>
    </div>
  </div>
</template>
