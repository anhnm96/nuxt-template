<script setup lang="ts">
import { InputText } from 'primevue'

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
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'action': [event: Event]
}>()

const wrapperRef = useTemplateRef('wrapper')
const inputEl = computed(() => wrapperRef.value?.querySelector('input'))
function clearInput() {
  emit('update:modelValue', '')
  nextTick(() => {
    inputEl.value?.focus()
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
  <div ref="wrapper" class="group relative isolate [&_input]:w-full" :class="[inputPadding]">
    <div
      v-if="icon"
      class="absolute top-0 z-10 h-full w-8 grid place-items-center text-(--color-field-icon) group-focus-within:!text-primary"
      @click.stop
    >
      <Icon size="16" :name="icon" />
    </div>
    <slot>
      <InputText
        :model-value="modelValue"
        :disabled
        v-bind="getPtValue(pt, 'input')"
        @update:model-value="$emit('update:modelValue', $event!)"
      />
    </slot>
    <Button
      v-if="actionIcon"
      class="btn-icon absolute top-0 z-10 h-full w-8 text-(--color-field-icon) group-focus-within:!text-primary"
      :class="[clearable && modelValue ? 'right-7' : 'right-0']"
      type="button"
      :disabled
      @click.stop="$emit('action', $event)"
    >
      <slot name="actionIcon">
        <Icon size="18" :name="actionIcon" />
      </slot>
    </Button>
    <Button
      v-else-if="passwordReveal"
      class="btn-icon absolute top-0 z-10 h-full w-8 text-(--color-field-icon) group-focus-within:!text-primary"
      :class="[clearable && modelValue ? 'right-7' : 'right-0']"
      type="button"
      :disabled
      @click.stop="togglePasswordVisibility"
    >
      <Icon size="18" :name="isPasswordVisible ? 'ph:eye-closed' : 'ph:eye'" />
    </Button>
    <Button
      v-if="clearable && modelValue"
      class="btn-icon absolute right-0 top-0 h-full w-8 text-(--color-field-icon) group-focus-within:!text-primary"
      type="button" :disabled
      @click.stop="clearInput"
    >
      <Icon size="18" :name="clearIcon" />
    </Button>
  </div>
</template>
