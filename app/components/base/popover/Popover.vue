<script setup lang="ts">
import type { Placement } from '@floating-ui/vue'
import type { HTMLAttributes } from 'vue'
import { usePopover } from './usePopover'

/**
 * A reference element paired with a Popover. It assembles the five pieces every Host with a
 * trigger element needs — the reference ref, `usePopover`, `--trigger-width`, the surface and
 * `Escape` — and imposes no behaviour on the trigger itself.
 *
 * `Dropdown` is this plus the trigger merge: click, `aria-haspopup`, `aria-expanded` and
 * `ArrowDown`. A Host whose control supplies its own ARIA and owns its own keys uses this
 * directly. A Host with no reference *element* — `ContextMenu` anchors to a point — uses
 * `usePopover` and `PopoverSurface` instead. See ADR-0013.
 */
export type PopoverProps = {
  placement?: Placement
  offset?: number
  /** Blocks opening. An open Popover can still be dismissed. */
  disabled?: boolean
  transition?: string
  /**
   * Whether a click outside dismisses.
   *
   * `default: undefined` below is load-bearing: a `boolean` prop compiles to `type: Boolean`,
   * and Vue casts an *absent* one to `false` unless the props object carries a `default` key.
   * `Dropdown` derives this from its `triggers`, and that derivation needs "not set" to stay
   * distinguishable from "off".
   * @defaultValue true
   */
  dismissOnClickOutside?: boolean
  /**
   * Whether closing returns focus to whatever held it when the Popover opened. Turn it off for
   * a Host whose reference keeps focus throughout, as a text input does.
   * @defaultValue true
   */
  restoreFocus?: boolean
  /** Selectors that click-outside treats as inside. */
  whiteList?: string[]
  /** Attributes merged onto the surface. */
  popoverProps?: PtSlot<HTMLAttributes>
  /**
   * Names this Host for styles and tests. The root carries it as `data-slot` and the surface
   * carries `<slotName>-popover`, which is the pair every Host already used by hand.
   *
   * Deliberately not called `dataSlot`: that name is reachable as a plain `data-slot`
   * attribute, so a consumer writing one on a Host would bind this prop and silently rename
   * the surface hook as well as the root.
   */
  slotName?: string
  /**
   * Attributes merged onto the reference element. `Dropdown` passes its trigger behaviour
   * through here rather than nesting a second `Slot`, so the merge happens exactly once.
   */
  referenceProps?: Record<string, unknown>
}

const props = withDefaults(defineProps<PopoverProps>(), {
  placement: 'bottom',
  offset: 4,
  transition: 'popover',
  dismissOnClickOutside: undefined,
  restoreFocus: true,
  slotName: 'popover',
})

const isOpen = defineModel('open', {
  type: Boolean,
  default: false,
})

/**
 * The reference is read from the DOM rather than from a `ref` on `Slot`.
 *
 * A `ref` there resolves to three different things: the element when the slot holds plain
 * markup, a component instance when it holds a component, and a text anchor when `Slot`
 * returns a fragment — which it does as soon as the slot also holds a comment. Floating UI
 * then receives something with no `getBoundingClientRect` and throws asynchronously, so the
 * failure is silent and only the positioning breaks.
 *
 * The root is `display: contents` and the teleport leaves only comment anchors behind, so its
 * first element child is always the trigger.
 */
const rootRef = useTemplateRef<HTMLElement>('rootRef')
const referenceEl = shallowRef<HTMLElement | null>(null)
function resolveReference() {
  referenceEl.value = (rootRef.value?.firstElementChild as HTMLElement | null) ?? null
}
onMounted(resolveReference)
// Slot content is compiled into this component, so a consumer's `v-if` lands here.
onUpdated(resolveReference)

const { width: triggerWidth } = useElementSize(referenceEl)

const popover = usePopover({
  reference: referenceEl,
  open: isOpen,
  placement: () => props.placement,
  offset: () => props.offset,
  disabled: () => props.disabled,
  dismissOnClickOutside: () => props.dismissOnClickOutside,
  restoreFocus: () => props.restoreFocus,
  anchor: referenceEl,
})

const { toggle: toggleShow, dismiss } = popover

/**
 * Lets content inside the Popover close it without knowing what is hosting it. A `Menu`
 * dismisses from here when a Menu Item is activated. See CONTEXT.md — Host.
 */
provideHostContext({ dismiss })

defineExpose({
  toggleShow,
  dismiss,
  /** The surface, for a Host that has to reach into the Popover — `Dropdown`'s `ArrowDown`. */
  popoverEl: popover.popoverEl,
})
</script>

<template>
  <div ref="rootRef" class="contents" :data-slot="slotName" @keydown="popover.handleEscape">
    <!-- reference -->
    <Slot v-bind="referenceProps">
      <slot v-bind="{ toggleShow, dismiss, isOpen }" />
    </Slot>
    <!-- popover -->
    <PopoverSurface
      :popover="popover"
      :transition="transition"
      :white-list="whiteList"
      :popover-props="popoverProps"
      :slot-name="`${slotName}-popover`"
      :style-vars="{ '--trigger-width': `${triggerWidth}px` }"
    >
      <slot name="popover" v-bind="{ toggleShow, dismiss, isOpen }" />
    </PopoverSurface>
  </div>
</template>
