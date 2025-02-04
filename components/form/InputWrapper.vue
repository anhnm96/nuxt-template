<script setup lang="ts">
defineOptions({ inheritAttrs: false })
const {
  clearable = true,
  clearIcon = 'ph:x-circle',
  ...props
} = defineProps<{
  clearable?: boolean
  passwordReveal?: boolean
  clearIcon?: string
  modelValue?: string
  icon?: string
  actionIcon?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value?: string]
  'action': [event: Event]
}>()

const wrapperRef = useTemplateRef<HTMLDivElement>('wrapper')
const inputEl = computed(() => wrapperRef.value?.querySelector('input'))
function clearInput() {
  emit('update:modelValue', '')
  if (!props.modelValue) {
    inputEl.value!.value = ''
    inputEl.value!.dispatchEvent(new Event('input', { bubbles: true }))
  }
  nextTick(() => {
    inputEl.value?.focus()
  })
}

const showClearIcon = ref(false)
const slots = useSlots()
if (slots.default) {
  useMutationObserver(inputEl, (mutations) => {
    if (mutations[0]?.attributeName === 'value') {
      if ((mutations[0].target as HTMLInputElement).value.length === 0) {
        showClearIcon.value = false
      } else {
        showClearIcon.value = true
      }
    }
  }, {
    attributes: true,
  })
}

const isPasswordVisible = ref(false)
function togglePasswordVisibility() {
  isPasswordVisible.value = !isPasswordVisible.value
  if (isPasswordVisible.value) {
    inputEl.value!.type = 'text'
  } else {
    inputEl.value!.type = 'password'
  }
}

const hasRightIcon = computed(() => props.passwordReveal || props.actionIcon)
const inputPadding = computed(() => {
  const cls = []
  if (props.icon) {
    cls.push('[&_input]:!pl-8')
  }
  if (hasRightIcon.value && clearable) {
    cls.push('[&_input]:!pr-15')
  } else if (clearable || hasRightIcon.value) {
    cls.push('[&_input]:!pr-8')
  }
  return cls.join(' ')
})
</script>

<template>
  <div ref="wrapper" class="relative" :class="[inputPadding]">
    <slot>
      <input
        v-bind="$attrs" :value="modelValue"
        class="inputtext"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      >
    </slot>
    <Button
      v-if="actionIcon"
      class="btn-icon absolute top-0 z-10 h-full w-8"
      :class="[(clearable && (modelValue || showClearIcon)) ? 'right-7' : 'right-0']"
      type="button"
      @click="$emit('action', $event)"
    >
      <Icon :name="actionIcon" class="text-primary" />
    </Button>
    <Button
      v-else-if="passwordReveal"
      class="btn-icon absolute top-0 z-10 h-full w-8"
      :class="[(clearable && (modelValue || showClearIcon)) ? 'right-7' : 'right-0']"
      type="button"
      @click="togglePasswordVisibility"
    >
      <Icon :name="isPasswordVisible ? 'ph:eye-closed' : 'ph:eye'" class="text-primary" />
    </Button>
    <Button
      v-if="clearable && (modelValue || showClearIcon)"
      class="btn-icon absolute right-0 top-0 h-full w-8"
      type="button" @click="clearInput"
    >
      <Icon :name="clearIcon" class="text-primary" />
    </Button>
  </div>
</template>
