<script setup lang="ts">
const emit = defineEmits<{
  close: []
}>()
const backdropLeaving = ref(false)
const contentLeaving = ref(false)

let resolve: () => void
async function close(setClose: () => void) {
  return new Promise<void>((_resolve) => {
    resolve = _resolve
    setClose()
  })
}
watch([backdropLeaving, contentLeaving], (newValues) => {
  if (newValues[0] === false && newValues[1] === false) {
    emit('close')
    resolve?.()
  }
})
</script>

<template>
  <Dialog v-slot="{ open, setClose }">
    <slot name="trigger" />
    <Teleport to="body">
      <Transition
        name="overlay"
        appear
        @before-leave="backdropLeaving = true"
        @after-leave="backdropLeaving = false"
      >
        <div v-if="open" class="fixed inset-0 bg-gray-500 bg-opacity-75" aria-hidden="true" />
      </Transition>

      <Transition
        name="content"
        appear
        @before-leave="contentLeaving = true"
        @after-leave="contentLeaving = false"
      >
        <div v-if="open" class="fixed inset-0 z-dialog overflow-y-auto">
          <slot :set-close="() => close(setClose)" />
        </div>
      </Transition>
    </Teleport>
  </Dialog>
</template>
