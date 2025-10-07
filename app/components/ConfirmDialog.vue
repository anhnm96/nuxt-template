<script lang="ts">
import type { AlertDialogProps } from './AlertDialog.vue'
import Dialog from './dialog/Dialog.vue'

export interface ConfirmDialogProps extends AlertDialogProps {
  cancelLabel?: string
}
</script>

<script setup lang="ts">
const props = withDefaults(defineProps<ConfirmDialogProps>(), {
  severity: 'info',
  title: 'Confirm',
  description: 'Are you sure to do this?',
})
defineEmits<{
  afterLeave: []
  close: [value?: boolean]
}>()

const getVariant = computed(() => {
  switch (props.severity) {
    case 'success':
      return { icon: 'ph:check-circle-bold', color: 'green' }
    case 'error':
      return { icon: 'ph:warning-bold', color: 'red' }
    case 'warn':
      return { icon: 'ph:warning-bold', color: 'orange' }
    default:
      return { icon: 'ph:info-bold', color: 'sky' }
  }
})
</script>

<template>
  <Dialog
    v-slot="{ setClose }"
    :pt="{
      panel: {
        role: 'alertdialog',
        class: 'w-full sm:max-w-xl ',
        style: { '--severity': `var(--color-${getVariant.color}-500)`,
                 '--severity-light': `var(--color-${getVariant.color}-100)` },
      },
    }"
    @after-leave="$emit('afterLeave')"
  >
    <!-- main -->
    <div class="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
      <!-- close button -->
      <div class="float-end -mt-2.5 -mr-2.5 hidden sm:block">
        <button
          type="button"
          class="btn btn-icon btn-text rounded-full"
          @click="setClose();$emit('close', false)"
        >
          <span class="sr-only">Close</span>
          <Icon class="text-xl" name="ph:x-bold" />
        </button>
      </div>
      <div class="sm:flex sm:items-start">
        <!-- icon -->
        <div class="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-(--severity-light) sm:mx-0 sm:size-10">
          <Icon class="text-2xl text-(--severity)" :name="getVariant.icon" />
        </div>
        <div class="mt-3 flex-grow text-center sm:mt-0 sm:ml-4 sm:text-left">
          <!-- title -->
          <DialogTitle class="text-lg leading-6 font-medium text-bold">
            {{ title }}
          </DialogTitle>
          <!-- description -->
          <div class="mt-2 max-h-[40vh] overflow-auto outline-offset-2">
            <DialogDescription v-if="Array.isArray(description)" class="space-y-0.5">
              <p v-for="(item, index) in description" :key="index" class="text-sm whitespace-pre-line">
                {{ item }}
              </p>
            </DialogDescription>
            <DialogDescription v-else class="text-sm whitespace-pre-line">
              {{ description }}
            </DialogDescription>
          </div>
        </div>
      </div>
    </div>
    <!-- action -->
    <div class="bg-abg px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
      <button
        type="button"
        class="btn w-full min-w-[80px] px-4 text-sm sm:ml-3 sm:w-auto"
        :class="[`btn-${severity}`]"
        @click="setClose();$emit('close', true)"
      >
        {{ confirmLabel || $t('confirm') }}
      </button>
      <button
        type="button"
        class="btn btn-outline mt-3 w-full min-w-[80px] px-4 text-sm sm:mt-0 sm:w-auto"
        @click="setClose();$emit('close', false)"
      >
        {{ cancelLabel || $t('cancel') }}
      </button>
    </div>
  </Dialog>
</template>
