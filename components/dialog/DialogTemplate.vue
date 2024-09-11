<script setup lang="ts">
const emit = defineEmits<{
  close: []
}>()
const backdropLeaving = ref(false)
const contentLeaving = ref(false)

watch([backdropLeaving, contentLeaving], (newValues) => {
  if (newValues[0] === false && newValues[1] === false) {
    emit('close')
  }
})
</script>

<template>
  <Dialog v-slot="{ open }">
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
          <slot />
        </div>
      </Transition>
    </Teleport>
  </Dialog>
</template>
