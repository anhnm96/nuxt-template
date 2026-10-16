<script setup lang="ts">
import type { Placement } from '@floating-ui/vue'
import type { HTMLAttributes } from 'vue'

type TriggerType = 'click' | 'hover'
export type DropdownProps = {
  placement?: Placement
  triggers?: TriggerType[]
  offset?: number
  disabled?: boolean
  transition?: string
  /**
   * Whether a click outside dismisses the Popover. Defaults to whether `click` is a trigger,
   * which is what every consumer relied on before this prop existed.
   *
   * It needs `default: undefined` below, and that line is load-bearing. A `boolean` prop
   * compiles to `type: Boolean`, and Vue casts an *absent* one to `false` unless the props
   * object carries a `default` key — which would make `?? triggers.includes('click')`
   * unreachable and silently switch click-outside off for every consumer.
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

const props = withDefaults(defineProps<DropdownProps>(), {
  placement: 'bottom',
  triggers: () => (['click']),
  offset: 4,
  transition: 'popover',
  // Keeps "not set" distinguishable from "off". See the prop's note — without the key, Vue
  // casts the absent prop to `false` and click-outside dies for every consumer.
  dismissOnClickOutside: undefined,
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

// Hover closes via mouseleave, so click-outside follows the click trigger unless a host says
// otherwise. Read once, like `triggerEvents` below: neither is reactive to a changing
// `triggers`. Resolving it here is deliberate — deriving dismissal from how the Popover
// opens is this component's policy, not the mechanism's. See ADR-0013.
const hasClickOutside = props.dismissOnClickOutside ?? props.triggers.includes('click')

let touchStartY = 0

// hover bundles focus/blur and touch fallback (mirrors Tooltip2 pattern)
const triggerEvents = {
  onClick: props.triggers.includes('click') ? () => toggleShow() : undefined,
  onMouseenter: props.triggers.includes('hover') ? () => toggleShow(true) : undefined,
  onMouseleave: props.triggers.includes('hover') ? () => toggleShow(false) : undefined,
  onFocus: props.triggers.includes('hover') ? () => toggleShow(true) : undefined,
  onBlur: props.triggers.includes('hover') ? () => toggleShow(false) : undefined,
  onTouchstart: props.triggers.includes('hover')
    ? (e: TouchEvent) => {
        touchStartY = e.touches[0]?.clientY ?? 0
        toggleShow(true)
      }
    : undefined,
  onTouchmove: props.triggers.includes('hover')
    ? (e: TouchEvent) => {
        if (Math.abs((e.touches[0]?.clientY ?? touchStartY) - touchStartY) > 10) toggleShow(false)
      }
    : undefined,
}

/**
 * Merged onto the consumer's own element, which *is* the trigger. `Popover` performs the
 * merge, so there is exactly one `Slot` in the tree and the consumer's own props still win.
 */
const referenceProps = computed(() => ({
  ...triggerEvents,
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
    :dismiss-on-click-outside="hasClickOutside"
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
