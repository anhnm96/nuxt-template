<script lang="ts">
import type { HTMLAttributes, ModelRef, ShallowRef } from 'vue'

export interface DialogRootProps {
  open?: boolean
  persistent?: boolean
  closeOnEscape?: boolean
  title?: string
  pt?: {
    panel?: PtSlot<HTMLAttributes>
    titleIcon?: {
      name: string
      size?: string
      class?: string | string[]
    } | string
  }
}

interface DialogRootContext {
  open: ModelRef<boolean>
  setOpen: () => void
  setClose: () => void
  titleId: ShallowRef<string | undefined>
  descriptionId: ShallowRef<string | undefined>
}

export const [provideDialogRootContext, injectDialogRootContext]
  = createContext<DialogRootContext>('DialogRoot')

/**
 * Scroll lock shared by every dialog instance, so stacked dialogs don't unlock
 * the page as soon as the topmost one closes.
 */
let lockCount = 0

function lockScroll() {
  // `immediate: true` runs this during SSR when a dialog starts open
  if (import.meta.server) return
  if (lockCount++ > 0) return

  // `overflow: hidden` keeps the scroll position on its own -- no save/restore
  // needed -- and `scrollbar-gutter: stable` (see main.css) keeps the gutter
  // reserved, so removing the scrollbar reflows nothing.
  document.documentElement.style.overflow = 'hidden'
}

function unlockScroll() {
  if (import.meta.server) return
  if (lockCount === 0 || --lockCount > 0) return

  document.documentElement.style.overflow = ''
}
</script>

<script setup lang="ts">
defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<DialogRootProps>(), {
  persistent: false,
  closeOnEscape: true,
})

defineEmits<{
  afterLeave: []
  close: []
}>()

const open = defineModel('open', { default: false })

const titleId = shallowRef<string>()
const descriptionId = shallowRef<string>()

function setClose() {
  open.value = false
}

/**
 * Backdrop dismissal is tracked as a pointerdown/pointerup pair on the wrapper.
 *
 * A plain `click` also fires when a drag that started *inside* the panel (text
 * selection) is released on the backdrop, which would close the dialog. Pointer
 * events rather than mouse events so touch is handled natively -- touch only
 * gets synthetic mouse events, which are delayed and are suppressed once the
 * browser treats the gesture as a scroll.
 *
 * Holds the pointer that pressed the backdrop, so a second finger can't dismiss
 * a dialog the first one is interacting with.
 */
let pressedPointerId: number | null = null

function onBackdropPointerDown(e: PointerEvent) {
  // `button === 0` keeps right-click (and its context menu) from dismissing
  pressedPointerId = e.isPrimary && e.button === 0 && e.target === e.currentTarget
    ? e.pointerId
    : null
}

function onBackdropPointerUp(e: PointerEvent) {
  const pressedHere = pressedPointerId === e.pointerId
  pressedPointerId = null

  // Touch pointers get implicit capture, so `target` is the pointerdown element
  if (pressedHere && e.target === e.currentTarget && !props.persistent) setClose()
}

// Fires when the gesture becomes a scroll, so the press must not count anymore
function onBackdropPointerCancel() {
  pressedPointerId = null
}

watch(open, (value) => {
  if (value) lockScroll()
  else unlockScroll()
}, { immediate: true })

// A dialog torn down while still open must release its lock, or the page stays
// frozen forever.
onScopeDispose(() => {
  if (open.value) unlockScroll()
})

provideDialogRootContext({
  open,
  setOpen: () => {
    open.value = true
  },
  setClose,
  titleId,
  descriptionId,
})

const [DefineTemplate, ReuseTemplate] = createReusableTemplate()

defineExpose({ setClose })
</script>

<template>
  <DefineTemplate>
    <Transition name="overlay" appear @after-leave="$emit('afterLeave')">
      <div v-if="open" class="fixed inset-0 z-(--dialog) bg-black/40 dark:bg-black/60" aria-hidden="true" />
    </Transition>

    <Transition name="content" appear>
      <div v-if="open" class="fixed inset-0 z-(--dialog) overflow-y-auto">
        <div
          v-bind="$attrs"
          class="flex min-h-full items-end justify-center p-4 sm:items-center sm:p-0"
          @pointerdown="onBackdropPointerDown"
          @pointerup="onBackdropPointerUp"
          @pointercancel="onBackdropPointerCancel"
        >
          <!-- panel -->
          <DialogPanel
            v-bind="getPtValue(pt, 'panel')"
            class="relative flex max-h-[80vh] flex-col overflow-hidden rounded-lg bg-surface shadow-xl sm:my-8"
          >
            <!-- header -->
            <div v-if="title" class="flex items-center justify-between bg-primary px-6 py-1.5 text-white">
              <!-- title -->
              <DialogTitle class="text-lg font-semibold">
                <template v-if="pt?.titleIcon">
                  <Icon v-if="typeof pt.titleIcon === 'string'" :name="pt.titleIcon" class="mr-2" />
                  <Icon v-else :name="pt.titleIcon.name" class="initial:mr-1.5" :class="[pt.titleIcon.class]" />
                </template>
                <span>{{ title }}</span>
              </DialogTitle>
              <!-- close button -->
              <div class="float-end -mr-2.5">
                <button
                  type="button"
                  class="btn btn-icon rounded-full text-white hover:bg-white/20"
                  @click="setClose();$emit('close')"
                >
                  <span class="sr-only">Close</span>
                  <Icon class="text-xl" name="ph:x-bold" />
                </button>
              </div>
            </div>
            <!-- content -->
            <slot :set-close />
          </DialogPanel>
        </div>
      </div>
    </Transition>
  </DefineTemplate>
  <template v-if="$slots.trigger">
    <slot name="trigger" />

    <Teleport to="#teleport" defer>
      <ReuseTemplate />
    </Teleport>
  </template>

  <ReuseTemplate v-else />
</template>
