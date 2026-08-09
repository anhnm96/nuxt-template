<script lang="ts" setup>
import { injectDialogRootContext } from './Dialog.vue'

const { titleId, descriptionId } = injectDialogRootContext()
</script>

<template>
  <div
    v-trap-focus
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
