<script setup lang="ts">
import Dropdown from '~/components/Dropdown.vue'
import ColorPallette from './ColorPallette.vue'
import ColorPreview from './ColorPreview.vue'

withDefaults(
  defineProps<{
    modelValue?: string
    placement?: string
    disabled?: boolean
    shouldAllowShortHexCode?: boolean
    pt?: {
      colorPallette?: any
      colorPreview?: any
    }
  }>(),
  {
    placement: 'bottom-start',
    disabled: false,
    shouldAllowShortHexCode: false,
    pt: undefined,
  },
)

defineEmits<{
  'update:modelValue': [v: string | undefined]
}>()

const isVisible = ref(false)

function handleUpdateVisibility(value: boolean) {
  isVisible.value = !!value
}

function toggleVisibility() {
  isVisible.value = !isVisible.value
}

defineExpose({
  setVisibility: handleUpdateVisibility,
  toggleVisibility,
})
</script>

<template>
  <Dropdown
    v-model:open="isVisible"
    :placement="placement as any"
    theme="no-arrow"
    :distance="8"
    :auto-hide="true"
    :disabled="disabled"
    @hide="handleUpdateVisibility(false)"
    @show="handleUpdateVisibility(true)"
  >
    <ColorPreview
      v-memo="[modelValue]"
      class="h-9 w-9 rounded-[--p-border-radius-sm] text-sm text-gray/50 shadow-[0_0.1rem_1.2rem_rgba(0,0,0,0.1)]"
      :class="{ 'cursor-pointer': !disabled }"
      :color="modelValue"
      v-bind="getPtValue(pt, 'colorPreview')"
    />
    <template #popover>
      <ColorPallette
        :model-value="modelValue"
        :disabled="disabled"
        :should-allow-short-hex-code="shouldAllowShortHexCode"
        v-bind="getPtValue(pt, 'colorPallette')"
        @update:model-value="$emit('update:modelValue', $event)"
        @close="handleUpdateVisibility(false)"
      />
    </template>
  </Dropdown>
</template>
