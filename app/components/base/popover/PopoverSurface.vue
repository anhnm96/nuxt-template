<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import type { Popover } from './usePopover'

/**
 * Renders what `usePopover` positions: the teleport, the leave transition and the surface.
 *
 * It exists so the teleport and the `isMounted` / `after-leave` pair are written once. A
 * composable cannot own them — they are markup — and copying them is how `ContextMenu`
 * ended up with a focus-restore race the `Dropdown` copy had already fixed. See ADR-0013.
 */
withDefaults(defineProps<{
  popover: Popover
  /** Vue transition name. */
  transition?: string
  /** Selectors that click-outside treats as inside. */
  whiteList?: string[]
  /** Attributes merged onto the surface. */
  popoverProps?: PtSlot<HTMLAttributes>
  /** Stable hook for the Host's own tests and styles, rendered as `data-slot`. */
  slotName?: string
  /** Extra custom properties for the positioned element, such as `--trigger-width`. */
  styleVars?: Record<string, string>
}>(), {
  transition: 'popover',
  slotName: 'popover',
})
</script>

<template>
  <Teleport v-if="popover.isMounted.value" to=".popovers">
    <div
      :ref="(el) => popover.setPopoverEl(el as HTMLElement | null)"
      class="z-(--popover)"
      :style="{ ...popover.styles.value, ...styleVars }"
      @keydown="popover.handleEscape"
    >
      <Transition :name="transition" appear @after-leave="popover.onAfterLeave">
        <div
          v-if="popover.isOpen.value"
          v-click-outside:[whiteList]="() => popover.dismissOnClickOutside.value && popover.dismiss()"
          v-bind="normalizePt(popoverProps)"
          class="popover"
          tabindex="-1"
          :data-slot="slotName"
        >
          <slot />
        </div>
      </Transition>
    </div>
  </Teleport>
</template>
