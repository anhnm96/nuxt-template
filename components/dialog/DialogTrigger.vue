<script setup lang="ts">
import { injectDialogRootContext } from './Dialog.vue'

const rootContext = injectDialogRootContext()

const id = useId()
rootContext.setContentId(id)
</script>

<template>
  <button
    aria-haspopup="dialog"
    :aria-expanded="rootContext.open.value || false"
    :aria-controls="rootContext.open.value ? id : undefined"
    @click="rootContext.setOpen(true)"
  >
    <slot />
  </button>
</template>
