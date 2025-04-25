<script lang="ts" setup>
import type { LabelHTMLAttributes } from 'vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    labelProps?: LabelHTMLAttributes
    label?: string
    modelValue?: string | number | boolean | any[] | Set<any>
  }>(),
  {
    modelValue: false,
  },
)

const emit = defineEmits(['update:modelValue'])
const value = useInternalValue(props, emit)

const inputRef = ref()
function focus() {
  // MacOS FireFox and Safari do not focus when clicked
  inputRef.value.focus()
}
</script>

<template>
  <label
    v-if="label || $slots.default" class="inline-flex items-center space-x-2"
    v-bind="labelProps"
    @click.stop="focus"
  >
    <input v-bind="$attrs" ref="inputRef" v-model="value" type="checkbox">
    <span v-if="label">{{ label }}</span>
    <template v-if="$slots.default"><slot /></template>
  </label>
  <input v-else v-bind="$attrs" ref="inputRef" v-model="value" type="checkbox">
</template>
