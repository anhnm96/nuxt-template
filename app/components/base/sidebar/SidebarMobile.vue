<script setup lang="ts">
import SidebarContent from './SidebarContent.vue'

defineOptions({
  inheritAttrs: false,
})
defineProps<{
  openSidebar: boolean
}>()
const emit = defineEmits<{
  collapse: []
}>()

/**
 * Backdrop dismissal tracked as a pointerdown/pointerup pair (mirrors Dialog's
 * backdrop): a plain `click` also fires when a drag/selection that started
 * elsewhere is released on the backdrop, which would close the sidebar.
 * Pointer events rather than mouse events so touch is handled natively.
 */
let pressedPointerId: number | null = null

function onBackdropPointerDown(e: PointerEvent) {
  // `button === 0` keeps right-click (and its context menu) from dismissing
  pressedPointerId = e.isPrimary && e.button === 0 ? e.pointerId : null
}

function onBackdropPointerUp(e: PointerEvent) {
  const pressedHere = pressedPointerId === e.pointerId
  pressedPointerId = null

  if (pressedHere) emit('collapse')
}

// Fires when the gesture becomes a scroll, so the press must not count anymore
function onBackdropPointerCancel() {
  pressedPointerId = null
}
</script>

<template>
  <Transition name="overlay" appear>
    <div
      v-if="openSidebar"
      aria-hidden="true"
      class="fixed inset-0 z-(--sidebar) bg-black/40 dark:bg-black/60"
      @pointerdown="onBackdropPointerDown"
      @pointerup="onBackdropPointerUp"
      @pointercancel="onBackdropPointerCancel"
    />
  </Transition>
  <Transition appear name="slide">
    <aside
      v-if="openSidebar"
      v-trap-focus
      v-bind="$attrs"
      aria-label="Sidebar (mobile)"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      data-open="true"
      class="group absolute top-0 bottom-0 left-0 z-(--sidebar) w-(--sidebar-width) shrink-0 overflow-hidden border-r border-elevated bg-surface backdrop-blur-2xl focus:outline-none"
    >
      <SidebarContent :open="true" @toggle="$emit('collapse')" />
    </aside>
  </Transition>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from {
  transform: translateX(-100%);
}

.slide-leave-to {
  transform: translateX(-100%);
}
</style>
