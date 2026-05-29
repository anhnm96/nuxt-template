<script lang="ts">
import type { ModelRef, ShallowRef } from 'vue'

export interface DialogRootProps {
  open?: boolean
  persistent?: boolean
  closeOnEscape?: boolean
  title?: string
  pt?: {
    panel?: Record<string, any>
    titleIcon?: {
      name: string
      size?: string
      class?: string | string[]
    } | string
  }
}

interface DialogRootContext {
  open: ModelRef<boolean>
  persistent: boolean
  setOpen: () => void
  setClose: () => void
  titleId: ShallowRef<string | undefined>
  descriptionId: ShallowRef<string | undefined>
}

export const [provideDialogRootContext, injectDialogRootContext]
  = createContext<DialogRootContext>('DialogRoot')
</script>

<script setup lang="ts">
defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<DialogRootProps>(), {
  open: false,
  persistent: false,
  closeOnEscape: true,
})

defineEmits<{
  'afterLeave': []
  'update:open': [value: boolean]
  'close': []
}>()

const open = defineModel('open', { default: false })

const titleId = shallowRef<string>()
const descriptionId = shallowRef<string>()

function setClose() {
  open.value = false
}

function getScrollbarWidth() {
  // Create a temporary, hidden div with scroll enabled
  const scrollDiv = document.createElement('div')
  scrollDiv.style.visibility = 'hidden'
  scrollDiv.style.overflow = 'scroll' // force scrollbar
  scrollDiv.style.position = 'absolute'
  scrollDiv.style.top = '-9999px'
  scrollDiv.style.width = '100px'
  scrollDiv.style.height = '100px'

  document.body.appendChild(scrollDiv)

  // Create inner div to measure the scrollbar size
  const innerDiv = document.createElement('div')
  innerDiv.style.width = '100%'
  scrollDiv.appendChild(innerDiv)

  const scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth

  // Clean up
  document.body.removeChild(scrollDiv)

  return scrollbarWidth
}

let scrollY = 0
watch(open, (value) => {
  if (value) {
    const scrollbarWidth = getScrollbarWidth()
    document.body.style.paddingRight = `${scrollbarWidth}px` // prevent layout shift
    scrollY = window.scrollY
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.left = '0'
    document.body.style.right = '0'
  } else {
    document.body.style.paddingRight = ''
    document.body.style.position = ''
    document.body.style.top = ''
    document.body.style.left = ''
    document.body.style.right = ''
    window.scrollTo(0, scrollY)
  }
}, { immediate: true })

provideDialogRootContext({
  open,
  setOpen: () => {
    open.value = true
  },
  persistent: props.persistent,
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
        <div class="flex min-h-full items-end justify-center p-4 sm:items-center sm:p-0">
          <!-- panel -->
          <DialogPanel
            v-bind="pt?.panel"
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
