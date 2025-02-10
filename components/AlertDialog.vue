<script lang="ts">
import Dialog from './dialog/Dialog.vue'

export interface AlertDialogProps {
  title?: string
  description?: string
  confirmText?: string
  severity?: 'success' | 'error' | 'warning' | 'info'
}
</script>

<script setup lang="ts">
const { severity = 'info' } = defineProps<AlertDialogProps>()
defineEmits<{
  afterLeave: []
  close: [value?: boolean]
}>()

const getVariant = computed(() => {
  const severityColor = useCssVar('--severity', document.documentElement)
  switch (severity) {
    case 'success':
      severityColor.value = 'var(--success)'
      return { icon: 'ph:check-circle-bold', color: '--success' }
    case 'error':
      severityColor.value = 'var(--danger)'
      return { icon: 'ph:x-circle-bold', color: '--danger' }
    case 'warning':
      severityColor.value = 'var(--warning)'
      return { icon: 'ph:warning-bold', color: '--warning' }
    default:
      severityColor.value = 'var(--info)'
      return { icon: 'ph:info-bold', color: '--info' }
  }
})
</script>

<template>
  <Dialog v-slot="{ setClose }" @after-leave="$emit('afterLeave')">
    <div class="h-full flex items-end justify-center px-4 sm:items-center sm:p-0">
      <!-- panel -->
      <DialogPanel
        role="alertdialog"
        class="inline-block transform overflow-hidden rounded-lg bg-white pb-4 pt-5 text-left align-bottom shadow-xl transition-all sm:my-8 sm:max-w-lg sm:w-full sm:py-6 sm:align-middle"
      >
        <div>
          <!-- icon -->
          <div class="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-slate-50">
            <Icon class="text-2xl text-[--severity]" :name="getVariant.icon" />
          </div>
          <div class="text-center">
            <!-- title -->
            <DialogTitle v-if="title" class="mt-3 px-4 text-lg text-gray-900 font-medium leading-6 sm:mt-5 sm:px-6">
              {{ title }}
            </DialogTitle>
            <!-- description -->
            <div v-if="description" class="mt-2 max-h-[40vh] overflow-auto px-4 outline-offset-2 sm:px-6">
              <DialogDescription class="whitespace-pre-line text-sm text-gray-500">
                {{ description }}
              </DialogDescription>
            </div>
          </div>
        </div>
        <div class="mt-5 px-4 sm:mt-6 sm:px-6">
          <button
            type="button"
            class="w-full inline-flex justify-center border border-transparent rounded-md bg-indigo-600 px-4 py-2 text-base text-white font-medium shadow-sm hover:bg-indigo-700 sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            @click="setClose();$emit('close', true)"
          >
            {{ confirmText || $t('confirm') }}
          </button>
        </div>
      </DialogPanel>
    </div>
  </Dialog>
</template>
