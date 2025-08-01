<script setup lang="ts">
import type { FactoryOpts, InputMask } from 'imask'

const props = defineProps<{
  maskOptions: FactoryOpts
}>()

const _unmasked = defineModel<string>({ default: '' })
const _maskedValue = defineModel<string>('masked', { default: '' })
const _typedValue = defineModel<InputMask<FactoryOpts>['typedValue']>('typed')

const inputRef = useTemplateRef('inputRef')
const { unmasked, masked, typed, mask } = useMask(inputRef as any, props.maskOptions)
syncRef(_unmasked, unmasked)
syncRef(_maskedValue, masked)
syncRef(_typedValue, typed)
defineExpose({ unmasked, masked, typed, mask })
</script>

<template>
  <input
    ref="inputRef"
    type="text"
    class="inputtext"
  >
</template>
