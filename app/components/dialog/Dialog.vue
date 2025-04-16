<script lang="ts">
export interface DialogRootProps {
  open?: boolean
  persistent?: boolean
  closeOnEscape?: boolean
}

interface DialogRootContext {
  open: WritableComputedRef<boolean>
  persistent: boolean
  setOpen: () => void
  setClose: () => void
  titleId: Readonly<Ref<string>>
  setTitleId: (id: string) => void
  descriptionId: Readonly<Ref<string>>
  setDescriptionId: (id: string) => void
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

const emit = defineEmits<{
  'afterLeave': []
  'update:open': [value: boolean]
}>()

const _open = useInternalValue(props, emit, 'open')

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

provideDialogRootContext({
  open: _open,
  setOpen: () => {
    _open.value = true
  },
  persistent: props.persistent,
  setClose,
  titleId: readonly(titleId),
  setTitleId,
  descriptionId: readonly(descriptionId),
  setDescriptionId,
})

const [DefineTemplate, ReuseTemplate] = createReusableTemplate()
</script>

<template>
  <DefineTemplate>
    <Transition name="overlay" appear @after-leave="setClose();$emit('afterLeave')">
      <div v-if="_open" class="fixed inset-0 bg-gray-500/75" aria-hidden="true" />
    </Transition>

    <Transition name="content" appear>
      <div v-if="_open" class="fixed inset-0 z-dialog overflow-y-auto">
        <slot :set-close />
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
