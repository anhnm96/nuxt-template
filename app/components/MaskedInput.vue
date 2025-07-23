<script setup lang="ts">
import type { FactoryArg } from 'imask'

const props = defineProps<{
  maskOptions: FactoryArg
}>()

const _rawValue = defineModel<string>({ default: '' })
const _maskedValue = defineModel<string>('masked', { default: '' })
const _typedValue = defineModel<string | number>('typed', { default: '' })

const inputRef = useTemplateRef('inputRef')
const { rawValue, maskedValue, typedValue } = useMask(inputRef as any, props.maskOptions)
syncRef(_rawValue, rawValue)
syncRef(_maskedValue, maskedValue)
syncRef(_typedValue, typedValue)
</script>

<template>
  <input
    ref="inputRef"
    type="text"
    class="inputtext"
  >
</template>
