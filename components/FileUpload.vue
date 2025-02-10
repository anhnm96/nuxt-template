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
  <Button
    v-bind="$attrs"
    class="btn-primary"
    content-class="gap-2"
    type="button" @click="inputRef?.click()"
  >
    <slot>
      <span>{{ label || $t('upload') }}</span>
      <Icon :name="icon" />
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
