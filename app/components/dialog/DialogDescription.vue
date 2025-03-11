<script lang="ts" setup>
import { injectDialogRootContext } from './Dialog.vue'

withDefaults(defineProps<{ as?: string }>(), { as: 'p' })
const id = useId()
const ctx = injectDialogRootContext()
ctx.setDescriptionId(id)
</script>

<template>
  <component :is="as" :id="id">
    <slot />
  </component>
</template>
