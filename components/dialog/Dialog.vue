<script lang="ts">
import type { WritableComputedRef } from 'vue'

export interface DialogRootProps {
  /** The controlled open state of the dialog. Can be binded as `v-model:open`. */
  open?: boolean
  /**
   * The modality of the dialog When set to `true`, <br>
   * interaction with outside elements will be disabled and only dialog content will be visible to screen readers.
   */
  modal?: boolean
  closeOnEscape?: boolean
}

interface DialogRootContext {
  open: WritableComputedRef<boolean>
  modal: Ref<boolean>
  setOpen: () => void
  setClose: () => void
  contentId: Readonly<Ref<string>>
  setContentId: (id: string) => void
  titleId: Readonly<Ref<string>>
  setTitleId: (id: string) => void
  descriptionId: Readonly<Ref<string>>
  setDescriptionId: (id: string) => void
}

export const { provideContext: provideDialogRootContext, injectContext: injectDialogRootContext }
  = createContext<DialogRootContext>('DialogRoot')
// export const [provideDialogRootContext, injectDialogRootContext]
//   = createContext<DialogRootContext>('DialogRoot')
</script>

<script setup lang="ts">
const props = withDefaults(defineProps<DialogRootProps>(), {
  open: false,
  modal: true,
  closeOnEscape: true,
})

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()
const _open = useInternalValue(props, 'open', emit)
const { modal } = toRefs(props)

const contentId = ref('')
function setContentId(id: string) {
  contentId.value = id
}

const titleId = ref('')
function setTitleId(id: string) {
  titleId.value = id
}

const descriptionId = ref('')
function setDescriptionId(id: string) {
  descriptionId.value = id
}

function setClose() {
  _open.value = false
}

if (props.closeOnEscape) {
  const listener = (e: KeyboardEvent) => {
    if (e.key === 'Escape') _open.value = false
  }
  watch(_open, (val) => {
    if (val) window.addEventListener('keydown', listener)
  }, { immediate: true })
  onBeforeUnmount(() => {
    window.removeEventListener('keydown', listener)
  })
}

provideDialogRootContext({
  open: _open,
  setOpen: () => { _open.value = true },
  modal,
  setClose,
  contentId: readonly(contentId),
  setContentId,
  titleId: readonly(titleId),
  setTitleId,
  descriptionId: readonly(descriptionId),
  setDescriptionId,
})
</script>

<template>
  <slot :open="_open" :set-close="setClose" />
</template>
