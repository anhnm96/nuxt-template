<script setup lang="ts">
import { injectDialogRootContext } from './Dialog.vue'

withDefaults(defineProps<{ as?: string }>(), { as: 'p' })
const id = useId()
const { descriptionId } = injectDialogRootContext()
descriptionId.value = id
</script>

<template>
  <component :is="as" :id="id">
    <slot />
  </component>
</template>
