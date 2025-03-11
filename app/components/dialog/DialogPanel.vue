<script lang="ts" setup>
import { injectDialogRootContext } from './Dialog.vue'

const { titleId, descriptionId, persistent, setClose } = injectDialogRootContext()
const panel = useTemplateRef('panel')

function closeDialog(e: MouseEvent) {
  if (!persistent && panel.value!.parentElement! === e.target) setClose()
}

onMounted(() => {
  panel.value?.parentElement!.addEventListener('click', closeDialog)
})

onBeforeUnmount(() => {
  panel.value?.parentElement!.removeEventListener('click', closeDialog)
})
</script>

<template>
  <div
    ref="panel"
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
