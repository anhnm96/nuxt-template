<script lang="ts" setup>
import type { InputHTMLAttributes, ReservedProps } from 'vue'

defineOptions({ inheritAttrs: false })

defineProps<{
  acceptedFileTypes?: string[]
  allowsMultiple?: boolean
  defaultCamera?: 'user' | 'environment'
  acceptDirectory?: boolean
  pt?: {
    input: InputHTMLAttributes & ReservedProps
  }
}>()

const emit = defineEmits<{
  change: [value: FileList]
}>()

const inputRef = useTemplateRef<HTMLInputElement>('input')

function handleSelectFile(event: Event) {
  const files = (event.target as HTMLInputElement).files
  if (!files) return
  emit('change', files)
}
</script>

<template>
  <Button
    v-bind="$attrs"
    class="btn-primary"
    content-class="gap-2"
    type="button" @click="inputRef?.click()"
  >
    <slot>
      <span>Upload</span>
      <Icon name="ph:upload" />
    </slot>
  </Button>
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
