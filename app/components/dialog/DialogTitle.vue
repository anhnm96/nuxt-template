<script setup lang="ts">
import { injectDialogRootContext } from './Dialog.vue'

withDefaults(defineProps<{ as?: string }>(), { as: 'h2' })
const id = useId()
const { titleId } = injectDialogRootContext()
titleId.value = id
</script>

<template>
  <component :is="as" :id="id">
    <slot />
  </component>
</template>
