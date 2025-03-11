<script setup lang="ts">
import { injectDialogRootContext } from './Dialog.vue'

const rootContext = injectDialogRootContext()
</script>

<template>
  <button
    aria-haspopup="dialog"
    :aria-expanded="rootContext.open.value || false"
    @click="rootContext.setOpen()"
  >
    <slot />
  </button>
</template>
