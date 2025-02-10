<script lang="ts" setup>
const props = withDefaults(
  defineProps<{
    wrapperClass?: string
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

<script lang="ts">
export default {
  inheritAttrs: false,
}
</script>

<template>
  <label
    v-if="label || $slots.default" class="inline-flex items-center space-x-2"
    :class="wrapperClass"
    @click.stop="focus"
  >
    <input v-bind="$attrs" ref="inputRef" v-model="value" type="checkbox">
    <span v-if="label">{{ label }}</span>
    <span v-if="$slots.default"><slot /></span>
  </label>
  <input v-else v-bind="$attrs" ref="inputRef" v-model="value" type="checkbox">
</template>
