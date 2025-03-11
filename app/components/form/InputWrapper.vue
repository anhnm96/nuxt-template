<script setup lang="ts">
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
  pt?: Record<string, any>
}>()

const emit = defineEmits<{
  'update:modelValue': [value?: string]
  'action': [event: Event]
}>()

const wrapperRef = useTemplateRef('wrapper')
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
  useEventListener(inputEl, 'input', (e) => {
    const value = (e.target as HTMLInputElement).value
    if (value.length > 0 && !showClearIcon.value) {
      showClearIcon.value = true
    } else if (value.length === 0 && showClearIcon.value) {
      showClearIcon.value = false
    }
  })
}

onMounted(() => {
  if (inputEl.value?.value.length) {
    showClearIcon.value = true
  }
})

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
  <div ref="wrapper" class="group relative isolate [&_input]:w-full" :class="[inputPadding]">
    <slot>
      <input
        :value="modelValue"
        class="inputtext"
        v-bind="getPtValue(pt, 'input')"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      >
    </slot>
    <Button
      v-if="actionIcon"
      class="btn-icon absolute top-0 z-10 h-full w-8 group-focus-within:!text-primary"
      :class="[(clearable && (modelValue || showClearIcon)) ? 'right-7' : 'right-0']"
      type="button"
      @click="$emit('action', $event)"
    >
      <Icon size="18" :name="actionIcon" />
    </Button>
    <Button
      v-else-if="passwordReveal"
      class="btn-icon absolute top-0 z-10 h-full w-8 group-focus-within:!text-primary"
      :class="[(clearable && (modelValue || showClearIcon)) ? 'right-7' : 'right-0']"
      type="button"
      @click="togglePasswordVisibility"
    >
      <Icon size="18" :name="isPasswordVisible ? 'ph:eye-closed' : 'ph:eye'" />
    </Button>
    <Button
      v-if="clearable && (modelValue || showClearIcon)"
      class="btn-icon absolute right-0 top-0 h-full w-8 group-focus-within:!text-primary"
      type="button" @click="clearInput"
    >
      <Icon size="18" :name="clearIcon" />
    </Button>
  </div>
</template>
