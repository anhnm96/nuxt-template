<script setup lang="ts">
import type { Placement } from '@floating-ui/vue'
import type { HTMLAttributes } from 'vue'

/**
 * A Popover that its trigger opens and closes on click. See ADR-0017 for why there is no
 * hover trigger: a popup that shows on hover is an Interactive Tooltip (ADR-0004).
 */
export type DropdownProps = {
  placement?: Placement
  offset?: number
  disabled?: boolean
  transition?: string
  /**
   * Whether a click outside dismisses the Popover.
   * @defaultValue true
   */
  dismissOnClickOutside?: boolean
  /**
   * Whether closing returns focus to whatever held it when the Popover opened. Turn it off
   * for a host whose trigger keeps focus throughout.
   * @defaultValue true
   */
  restoreFocus?: boolean
  popoverProps?: PtSlot<HTMLAttributes>
  whiteList?: string[]
}

withDefaults(defineProps<DropdownProps>(), {
  placement: 'bottom',
  offset: 4,
  transition: 'popover',
  // A `boolean` prop that is absent is cast to `false`. Both of these default to `true`, so
  // both need an entry here.
  dismissOnClickOutside: true,
  restoreFocus: true,
})

const isOpen = defineModel('open', {
  type: Boolean,
  default: false,
})

const popoverRef = useTemplateRef('popoverRef')
function toggleShow(value?: boolean) {
  popoverRef.value?.toggleShow(value)
}

// Declared outside `referenceProps`, so the trigger keeps one listener across toggles.
function handleTriggerClick() {
  toggleShow()
}

/**
 * Merged onto the consumer's own element, which *is* the trigger. `Popover` performs the
 * merge, so there is exactly one `Slot` in the tree and the consumer's own props still win.
 */
const referenceProps = computed(() => ({
  'onClick': handleTriggerClick,
  'aria-haspopup': 'true',
  'aria-expanded': isOpen.value,
  'data-slot': 'dropdown-trigger',
}))

/**
 * The Popover is teleported to the end of the document, so `Tab` from the trigger skips
 * straight past it. `ArrowDown` is the only keyboard route in.
 *
 * A host that drives its own navigation does not use this component at all — it builds on
 * `Popover`, which merges nothing and therefore has no keyboard. See ADR-0013.
 *
 * `Escape` is not handled here: `Popover` owns it in every configuration.
 *
 * No "is focus inside the trigger?" guard is needed. This runs on `Popover`'s root, whose
 * only child that stays in the document is the trigger — the surface is teleported away — so
 * a keystroke reaching here came from the trigger.
 */
function handleKeydown(event: KeyboardEvent) {
  if (event.key !== 'ArrowDown') return

  event.preventDefault()
  if (!isOpen.value) {
    toggleShow(true)
    return
  }
  const firstFocusable = popoverRef.value?.popoverEl?.querySelector<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  )
  firstFocusable?.focus()
}

defineExpose({
  toggleShow,
})
</script>

<template>
  <Popover
    ref="popoverRef"
    v-model:open="isOpen"
    slot-name="dropdown"
    :placement="placement"
    :offset="offset"
    :disabled="disabled"
    :transition="transition"
    :dismiss-on-click-outside="dismissOnClickOutside"
    :restore-focus="restoreFocus"
    :white-list="whiteList"
    :popover-props="popoverProps"
    :reference-props="referenceProps"
    @keydown="handleKeydown"
  >
    <slot />
    <template #popover>
      <slot name="popover" v-bind="{ toggleShow }" />
    </template>
  </Popover>
</template>
