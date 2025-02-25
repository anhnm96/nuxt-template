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
  <Dialog v-slot="{ setClose }" @after-leave="$emit('afterLeave')">
    <div class="h-full flex items-end justify-center px-4 sm:items-center sm:p-0">
      <DialogPanel
        role="alertdialog"
        :style="{ '--severity': `var(--color-${getVariant.color}-500)`,
                  '--severity-light': `var(--color-${getVariant.color}-100)`,
        }"
        class="relative w-full inline-block overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left align-bottom shadow-xl transition-all sm:my-8 sm:max-w-xl sm:p-6 sm:align-middle"
      >
        <div class="float-end hidden -mr-2.5 -mt-2.5 sm:block">
          <button
            type="button"
            class="rounded-full btn btn-icon btn-text"
            @click="setClose();$emit('close', false)"
          >
            <span class="sr-only">Close</span>
            <Icon class="text-xl" name="ph:x-bold" />
          </button>
        </div>
        <div class="sm:flex sm:items-start">
          <!-- icon -->
          <div class="mx-auto h-12 w-12 flex flex-shrink-0 items-center justify-center rounded-full bg-(--severity-light) sm:mx-0 sm:h-10 sm:w-10">
            <Icon class="text-2xl text-(--severity)" :name="getVariant.icon" />
          </div>
          <div class="mt-3 flex-grow text-center sm:ml-4 sm:mt-0 sm:text-left">
            <!-- title -->
            <DialogTitle class="text-lg text-gray-900 font-medium leading-6">
              {{ title }}
            </DialogTitle>
            <!-- description -->
            <div class="mt-2 max-h-[40vh] overflow-auto outline-offset-2">
              <DialogDescription v-if="Array.isArray(description)" class="space-y-0.5">
                <p v-for="(item, index) in description" :key="index" class="whitespace-pre-line text-sm">
                  {{ item }}
                </p>
              </DialogDescription>
              <DialogDescription v-else class="whitespace-pre-line text-sm">
                {{ description }}
              </DialogDescription>
            </div>
          </div>
        </div>
        <!-- action -->
        <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          <button
            type="button"
            class="btn w-full min-w-[80px] px-4 text-base sm:ml-3 sm:w-auto sm:text-sm shadow-sm"
            :class="[`btn-${severity}`]"
            @click="setClose();$emit('close', true)"
          >
            {{ confirmLabel || $t('confirm') }}
          </button>
          <button
            type="button"
            class="btn mt-3 w-full min-w-[80px] shadow-sm btn-outline px-4 text-base sm:mt-0 sm:w-auto sm:text-sm"
            @click="setClose();$emit('close', false)"
          >
            {{ cancelLabel || $t('cancel') }}
          </button>
        </div>
      </DialogPanel>
    </div>
  </Dialog>
</template>
