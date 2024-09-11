<script setup lang="ts">
defineEmits<{
  close: []
}>()
</script>

<template>
  <Dialog v-slot="{ open }">
    <slot name="trigger" />
    <Teleport to="body">
      <Transition
        name="overlay"
        appear
        @before-leave="$emit('close')"
      >
        <div v-if="open" class="fixed inset-0 bg-gray-500 bg-opacity-75" aria-hidden="true" />
      </Transition>

      <Transition
        name="content"
        appear
      >
        <div v-if="open" class="fixed inset-0 z-dialog overflow-y-auto">
          <slot />
        </div>
      </Transition>
    </Teleport>
  </Dialog>
</template>
