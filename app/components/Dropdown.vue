<script setup lang="ts">
import type { Placement } from '@floating-ui/vue'
import { flip, offset, shift, useFloating } from '@floating-ui/vue'

type TriggerType = 'click' | 'focus' | 'hover' | 'touch'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<{
  placement?: Placement
  triggers?: TriggerType[]
  offset?: number
  disabled?: boolean
}>(), {
  placement: 'bottom',
  triggers: () => (['click']),
  offset: 4,
})

const isOpen = defineModel('open', {
  type: Boolean,
  default: false,
})

const dropdown = useTemplateRef('dropdown')
const popover = useTemplateRef('popover')
const { floatingStyles } = useFloating(dropdown, popover, {
  placement: props.placement,
  middleware: [flip(), shift(), offset(props.offset)],
})

function toggleShow(value?: boolean) {
  if (props.disabled) return
  isOpen.value = value ?? !isOpen.value
}

let lastFocusedElement: HTMLElement | null = null
watch(isOpen, (value) => {
  if (value) {
    lastFocusedElement = document.activeElement as HTMLElement
  } else {
    lastFocusedElement?.focus()
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
    if (!isOpen.value) {
      toggleShow(true)
    } else {
      // focus on the first element in the popover
      const firstFocusable = popover.value?.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      firstFocusable?.focus()
    }
  }
}
</script>

<template>
  <!-- dropdown -->
  <div @keydown="handleKeydown">
    <!-- trigger -->
    <div ref="dropdown" class="inline-flex w-fit" v-bind="dropdownProps">
      <slot />
    </div>
    <!-- popover -->
    <Transition name="fade">
      <div
        v-if="isOpen"
        v-bind="$attrs" ref="popover"
        v-click-outside="() => toggleShow(false)"
        :style="floatingStyles"
        class="popover"
        tabindex="-1"
      >
        <slot name="popover" v-bind="{ toggleShow }" />
      </div>
    </Transition>
  </div>
</template>
