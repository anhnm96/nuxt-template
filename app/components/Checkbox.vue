<script lang="ts" setup>
import type { HTMLAttributes, LabelHTMLAttributes } from 'vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    labelProps?: PtSlot<LabelHTMLAttributes>
    labelTextProps?: PtSlot<HTMLAttributes>
    label?: string
    modelValue?: string | number | boolean | any[] | Set<any>
  }>(),
  {
    modelValue: false,
  },
)

const emit = defineEmits(['update:modelValue'])
const value = useInternalValue(props, emit)

const inputRef = useTemplateRef<HTMLInputElement>('inputRef')
function focus() {
  // MacOS FireFox and Safari do not focus the input when the label is clicked.
  // Skip when the browser already focused it: a script-driven focus() makes
  // Chromium force :focus-visible on, drawing a ring on plain mouse clicks.
  const input = inputRef.value
  if (!input || document.activeElement === input) return
  input.focus({ focusVisible: false })
}
</script>

<template>
  <label
    v-if="label || $slots.default" class="inline-flex items-start space-x-2"
    v-bind="normalizePt(labelProps)"
    @click.stop="focus"
  >
    <input v-bind="$attrs" ref="inputRef" v-model="value" type="checkbox" class="shrink-0">
    <span v-if="label" class="leading-tight" v-bind="normalizePt(labelTextProps)">{{ label }}</span>
    <template v-if="$slots.default"><slot /></template>
  </label>
  <input v-else v-bind="$attrs" ref="inputRef" v-model="value" type="checkbox">
</template>
