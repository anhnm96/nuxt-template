<script lang="ts" setup>
import { injectDialogRootContext } from './Dialog.vue'

const { titleId, descriptionId } = injectDialogRootContext()
</script>

<template>
  <div
    role="dialog"
    :aria-labelledby="titleId"
    :aria-describedby="descriptionId"
    aria-modal="true"
  >
    <slot />
  </div>
</template>
