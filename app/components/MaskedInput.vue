<script setup lang="ts">
import type { FactoryArg, InputMask } from 'imask'
import imask from 'imask/holder'
import { InputText } from 'primevue'
import 'imask/masked/number'
import 'imask/masked/pattern'
import 'imask/masked/regexp'
import 'imask/masked/function'
import 'imask/masked/factory'
import 'imask/masked/dynamic'

const props = defineProps<{
  modelValue: string | number
  isNumber?: boolean
  maskOptions: FactoryArg
}>()

const emits = defineEmits<{
  'update:modelValue': [v?: string | number]
}>()

const id = useId()
let mask: InputMask<any> | null = null
const maskedValue = ref('')
const value = ref(props.isNumber ? Number(props.modelValue || 0) : props.modelValue || '')

// process new value and then flush
function resolveValue(newValue: string | number) {
  if (!mask) {
    return
  }

  mask.value = props.isNumber ? (newValue || 0).toString() : newValue?.toString() ?? ''
  flush()
}

// flush reactive values (value & maskedValue)
function flush() {
  if (!mask) {
    return
  }

  value.value = props.isNumber ? +mask.unmaskedValue : mask.unmaskedValue
  maskedValue.value = mask.displayValue
}

watch(value, value => emits('update:modelValue', value))

onMounted(() => {
  mask = imask(document.getElementById(id)!, {
    mask: '#x',
    blocks: {
      x: {
        mask: /^[0-9a-f]{0,6}$/i,
      },
    },
    lazy: true,
  })
  mask.on('accept', flush)
  resolveValue(value.value)
})

onBeforeUnmount(() => {
  mask?.destroy()
  mask = null
})

defineExpose({
  resolveValue,
})
</script>

<template>
  <InputText
    :id
    :model-value="maskedValue"
    type="text"
  />
</template>
