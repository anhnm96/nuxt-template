<script lang="ts" setup>
import type { InputHTMLAttributes, ReservedProps } from 'vue'

defineOptions({ inheritAttrs: false })

withDefaults(defineProps<{
  acceptedFileTypes?: string[]
  allowsMultiple?: boolean
  defaultCamera?: 'user' | 'environment'
  acceptDirectory?: boolean
  label?: string
  icon?: string
  pt?: {
    input: InputHTMLAttributes & ReservedProps
  }
}>(), {
  label: 'Upload',
  icon: 'ph:upload',
})

const emit = defineEmits<{
  change: [value: FileList]
}>()

const inputRef = useTemplateRef('input')

function handleSelectFile(event: Event) {
  const files = (event.target as HTMLInputElement).files
  if (!files) return
  emit('change', files)
}
</script>

<template>
  <button
    v-bind="$attrs"
    class="btn btn-primary gap-1"
    type="button" @click="inputRef?.click()"
  >
    <slot>
      <span>{{ label }}</span>
      <Icon :name="icon" size="14" class="translate-x-1/4" />
    </slot>
  </button>
  <input
    ref="input"
    type="file" class="hidden"
    :accept="acceptedFileTypes?.toString()"
    :multiple="allowsMultiple"
    :capture="defaultCamera"
    :webkitdirectory="acceptDirectory ? '' : undefined"
    v-bind="pt?.input"
    @change="handleSelectFile"
  >
</template>
