<script lang="ts" setup>
import { injectDialogRootContext } from './Dialog.vue'

const { titleId, descriptionId, persistent, setClose } = injectDialogRootContext()

function handleClickOutside() {
  if (!persistent.value) setClose()
}
</script>

<template>
  <div
    v-click-outside="handleClickOutside"
    role="dialog"
    :aria-labelledby="titleId"
    :aria-describedby="descriptionId"
    aria-modal="true"
  >
    <slot />
  </div>
</template>
