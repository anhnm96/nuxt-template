<script lang="ts" setup>
import defu from 'defu'
import Dropdown from '~/components/Dropdown.vue'
import ColorPallette from './ColorPallette.vue'

const props = defineProps<{
  modelValue?: string
  disabled?: boolean
  shouldAllowShortHexCode?: boolean
  shouldHandleIconClicked?: boolean
  shouldPreventSubmitEmptyValue?: boolean
  pt?: {
    preview?: any
    colorPallette?: any
    colorPreview?: any
    input?: any
  }
}>()

const emit = defineEmits<{
  'iconClick': [event: Event]
  'update:modelValue': [v: string | undefined]
}>()

const isOpen = ref(false)

function handleUpdateModelValue(value: string | undefined) {
  const isNotAcceptedEmptyValue = !value && props.shouldPreventSubmitEmptyValue

  if (isNotAcceptedEmptyValue) {
    return
  }

  emit('update:modelValue', value)
}
</script>

<template>
  <Dropdown v-model:open="isOpen">
    <InputWrapper
      icon="oui:color"
      :model-value="modelValue"
      :clearable="shouldPreventSubmitEmptyValue ? false : undefined"
      :disabled="disabled"
      :pt="defu(pt?.input, {
        icon: disabled ? '' : 'cursor-pointer',
        input: {
          readonly: true,
        },
      })"
      action-icon="action"
      :style="{ '--preview-color': modelValue }"
      @action="isOpen = true" @update:model-value="handleUpdateModelValue"
    >
      <template #actionIcon>
        <span
          v-if="modelValue"
          class="size-4 rounded bg-(--preview-color) flex items-center justify-center"
        />
        <span v-else class="size-4 text-[5px] border-abd rounded border bg-checkerboard" />
      </template>
    </InputWrapper>
    <template #popover>
      <ColorPallette
        v-trap-focus
        :model-value="modelValue"
        :disabled
        :should-allow-short-hex-code="shouldAllowShortHexCode"
        v-bind="getPtValue(pt, 'colorPallette')"
        @update:model-value="handleUpdateModelValue"
        @close="isOpen = false"
      />
    </template>
  </Dropdown>
</template>
