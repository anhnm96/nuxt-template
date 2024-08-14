<script setup lang="ts">
const emit = defineEmits<{
  close: []
}>()
const backdropLeaving = ref(false)
const contentLeaving = ref(false)

let resolve: (v?: unknown) => void
async function close(value: boolean, setOpen: (v: boolean) => void) {
  return new Promise((_resolve) => {
    resolve = _resolve
    setOpen(value)
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
  <Dialog v-slot="{ open, setOpen }">
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
        <div v-if="open" class="z-dialog fixed inset-0 overflow-y-auto">
          <slot :set-open="(v: boolean) => close(v, setOpen)" />
        </div>
      </Transition>
    </Teleport>
  </Dialog>
</template>
