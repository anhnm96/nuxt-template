<script lang="ts">
import type { AlertDialogProps } from './AlertDialog.vue'
import Dialog from './dialog/Dialog.vue'

interface ConfirmDialogProps extends AlertDialogProps {
  cancelText?: string
}
</script>

<script setup lang="ts">
withDefaults(defineProps<ConfirmDialogProps>(), {
  title: 'Confirm',
  description: 'Are you sure to do this?',
})
defineEmits<{
  afterLeave: []
  close: [value?: boolean]
}>()
</script>

<template>
  <Dialog v-slot="{ setClose }" @after-leave="$emit('afterLeave')">
    <div class="h-full flex items-end justify-center px-4 sm:items-center sm:p-0">
      <DialogPanel
        role="alertdialog"
        class="inline-block transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left align-bottom shadow-xl transition-all sm:my-8 sm:max-w-2xl sm:w-full sm:p-6 sm:align-middle"
      >
        <div class="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
          <button
            type="button"
            class="flex rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-hidden focus:ring-2 focus:ring-offset-4 focus:ring-indigo-500"
            @click="setClose();$emit('close', false)"
          >
            <span class="sr-only">Close</span>
            <Icon class="text-xl" name="ph:x-bold" />
          </button>
        </div>
        <div class="sm:flex sm:items-start">
          <!-- icon -->
          <div class="mx-auto h-12 w-12 flex flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
            <Icon class="text-2xl text-red-600" name="ph:warning-bold" />
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
            class="w-full inline-flex justify-center border border-transparent rounded-md bg-red-600 px-4 py-2 text-base text-white font-medium shadow-sm sm:ml-3 sm:w-auto hover:bg-red-700 sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            @click="setClose();$emit('close', true)"
          >
            {{ confirmText || $t('confirm') }}
          </button>
          <button
            type="button"
            class="mt-3 w-full inline-flex justify-center border border-gray-300 rounded-md bg-white px-4 py-2 text-base text-gray-700 font-medium shadow-sm sm:mt-0 sm:w-auto sm:text-sm hover:text-gray-500 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            @click="setClose();$emit('close', false)"
          >
            {{ cancelText || $t('cancel') }}
          </button>
        </div>
      </DialogPanel>
    </div>
  </Dialog>
</template>
