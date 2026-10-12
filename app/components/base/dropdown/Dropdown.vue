<script setup lang="ts">
import type { Placement } from '@floating-ui/vue'
import type { HTMLAttributes } from 'vue'
import { autoUpdate, flip, offset as floatingOffset, shift, useFloating } from '@floating-ui/vue'

type TriggerType = 'click' | 'hover'
export type DropdownProps = {
  placement?: Placement
  triggers?: TriggerType[]
  offset?: number
  disabled?: boolean
  transition?: string
  /**
   * Dropdown handles `ArrowDown` to open, and to move focus into the popover once open.
   * The popover is teleported to the end of the document, so without this there is no
   * keyboard route into it at all — Tab from the trigger skips straight past it.
   *
   * Hosts that drive their own navigation must turn this off: Select uses an
   * aria-activedescendant model that a roving-focus handler here would fight (ADR-0001).
   * @defaultValue true
   */
  manageKeyboard?: boolean
  /**
   * Whether `ArrowDown` on an already-open popover moves focus into it. Turn off for
   * triggers that keep using the keyboard themselves, like TimePicker's text input.
   * @defaultValue true
   */
  focusOnOpen?: boolean
  /**
   * Whether a click outside dismisses the popover. Defaults to whether `click` is a trigger,
   * which is what every consumer relied on before this prop existed.
   *
   * It is separate from `triggers` for hosts whose trigger must not toggle on click.
   * `Autocomplete` is one: clicking its input to move the caret would close the popover, so
   * it drives opening itself with `:triggers="[]"` — and without this prop that also switches
   * off the only way to dismiss with a mouse.
   *
   * It needs `default: undefined` below, and that line is load-bearing. A `boolean` prop
   * compiles to `type: Boolean`, and Vue casts an *absent* one to `false` unless the props
   * object carries a `default` key — which would make `?? triggers.includes('click')`
   * unreachable and silently switch click-outside off for every consumer.
   */
  dismissOnClickOutside?: boolean
  /**
   * Whether closing returns focus to whatever held it when the popover opened. Turn it off for
   * a host whose trigger keeps focus throughout: restoring would then pull focus back to a
   * field the user just clicked away from.
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
  manageKeyboard: true,
  focusOnOpen: true,
  // Keeps "not set" distinguishable from "off". See the prop's note — without the key, Vue
  // casts the absent prop to `false` and click-outside dies for every consumer.
  dismissOnClickOutside: undefined,
  restoreFocus: true,
})

const isOpen = defineModel('open', {
  type: Boolean,
  default: false,
})

const dropdownEl = useTemplateRef<HTMLElement>('dropdownEl')
const popoverEl = useTemplateRef('popoverEl')
const { width: triggerWidth } = useElementSize(dropdownEl)
const { floatingStyles, placement: resolvedPlacement } = useFloating(dropdownEl, popoverEl, {
  placement: props.placement,
  middleware: [floatingOffset(props.offset), flip(), shift()],
  whileElementsMounted: autoUpdate,
})

function toggleShow(value?: boolean) {
  const next = value ?? !isOpen.value
  // `disabled` gates *opening* only. Gating dismissal too would strand an already-open
  // popover whenever the host disables mid-interaction — Select does exactly that when it
  // starts loading with no items, and click-outside would silently stop working.
  if (props.disabled && next) return
  isOpen.value = next
}

/**
 * Lets content inside the popover close it without knowing what is hosting it. A `Menu`
 * dismisses from here when a Menu Item is activated, so close-on-activate stops being a
 * `toggleShow(false)` every call site has to remember. See CONTEXT.md — Menu Host.
 */
providePopoverContext({ dismiss: () => toggleShow(false) })

let lastFocusedElement: HTMLElement | null = null
watch(isOpen, (value) => {
  if (value) {
    lastFocusedElement = document.activeElement as HTMLElement
  } else {
    if (!props.restoreFocus) return
    setTimeout(() => {
      // Reopened before the restore fired — the new popover has placed focus deliberately
      // (Select focuses its search field), so restoring now would steal it back.
      if (isOpen.value) return
      const active = document.activeElement
      const focusIsInsideDropdown = dropdownEl.value?.contains(active) || popoverEl.value?.contains(active)
      if (!active || active === document.body || focusIsInsideDropdown) {
        lastFocusedElement?.focus()
      }
    }, 0)
  }
})

// Hover closes via mouseleave, so click-outside follows the click trigger unless a host says
// otherwise. Read once, like `triggerEvents` below: neither is reactive to a changing `triggers`.
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

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isOpen.value) {
    event.stopImmediatePropagation()
    // Bypass `toggleShow`: Escape must dismiss even while disabled.
    isOpen.value = false
    return
  }

  // Navigation inside the popover belongs to the host when it asks for it (ADR-0001).
  if (!props.manageKeyboard) return

  if (event.key === 'ArrowDown' && dropdownEl.value?.contains(document.activeElement)) {
    event.preventDefault()
    if (!isOpen.value) {
      toggleShow(true)
    } else if (props.focusOnOpen) {
      const firstFocusable = popoverEl.value?.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      firstFocusable?.focus()
    }
  }
}

function handleKeydownPopover(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.stopImmediatePropagation()
    isOpen.value = false
  }
}

// keep the teleport mounted until the leave transition finishes, otherwise
// unmounting the popover would skip the animation entirely
const isMounted = ref(false)
watch(isOpen, (value) => {
  if (value) isMounted.value = true
}, { immediate: true })

function onPopoverAfterLeave() {
  if (!isOpen.value) isMounted.value = false
}

defineExpose({
  toggleShow,
})
</script>

<template>
  <div class="contents" data-slot="dropdown" @keydown="handleKeydown">
    <!-- trigger -->
    <Slot
      ref="dropdownEl"
      aria-haspopup="true" :aria-expanded="isOpen"
      v-bind="triggerEvents"
      data-slot="dropdown-trigger"
    >
      <slot />
    </Slot>
    <!-- popover -->
    <Teleport v-if="isMounted" to=".popovers">
      <div
        ref="popoverEl" class="z-(--popover)"
        :style="{
          ...floatingStyles,
          '--trigger-width': `${triggerWidth}px`,
          '--trigger-origin': getTransformOrigin(resolvedPlacement),
        }"
        @keydown="handleKeydownPopover"
      >
        <Transition :name="transition" appear @after-leave="onPopoverAfterLeave">
          <div
            v-if="isOpen"
            v-click-outside:[whiteList]="() => hasClickOutside && toggleShow(false)"
            v-bind="normalizePt(popoverProps)"
            class="popover"
            tabindex="-1"
            data-slot="dropdown-popover"
          >
            <slot name="popover" v-bind="{ toggleShow }" />
          </div>
        </Transition>
      </div>
    </Teleport>
  </div>
</template>
