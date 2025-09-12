<script setup lang="ts">
import type { Placement } from '@floating-ui/vue'
import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/vue'

type TriggerType = 'click' | 'focus' | 'hover' | 'touch'

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

const dropdown = useTemplateRef('dropdown')
const popover = useTemplateRef('popover')
const { floatingStyles, placement } = useFloating(dropdown, popover, {
  placement: props.placement,
  middleware: [offset(props.offset), flip(), shift()],
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

const dropdownProps = {
  onClick: props.triggers.includes('click')
    ? () => toggleShow()
    : undefined,
}

function handleKeydown(event: KeyboardEvent) {
  // hide popup
  if (event.code === 'Escape' && isOpen.value) {
    event.stopImmediatePropagation()
    isOpen.value = false
  }

  // arrow down key, show popup
  if (event.code === 'ArrowDown' && dropdown.value?.contains(document.activeElement)) {
    event.preventDefault()
    if (!isOpen.value) {
      toggleShow(true)
    } else {
      // focus on the first element in the popover
      const firstFocusable = popover.value?.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
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
  <div class="contents" :style="{ '--trigger-origin': getTransformOrigin(placement) }" @keydown="handleKeydown">
    <!-- trigger -->
    <div ref="dropdown" class="inline-flex w-fit" v-bind="dropdownProps">
      <slot />
    </div>
    <!-- popover -->
    <div ref="popover" :style="floatingStyles">
      <Transition :name="transition">
        <div
          v-if="isOpen"
          v-click-outside="() => toggleShow(false)"
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
