<script lang="ts" setup>
import { injectDialogRootContext } from './Dialog.vue'

const { titleId, descriptionId, persistent, setClose } = injectDialogRootContext()

function handleClickOutside() {
  if (!persistent.value) setClose()
}
</script>

<template>
  <div
    v-trap-focus
    v-click-outside="handleClickOutside"
    role="dialog"
    :aria-labelledby="titleId"
    :aria-describedby="descriptionId"
    aria-modal="true"
    tabindex="-1"
    class="focus:outline-none"
  >
    <slot />
  </div>
</template>
