<script lang="ts">
export interface InfoProps {
  title?: string
  description?: string
  confirmText?: string
}
</script>

<script setup lang="ts">
const { title = 'Success', confirmText = 'Confirm' } = defineProps<InfoProps>()
const dialog = useDialogStore()
</script>

<template>
  <DialogTemplate @close="dialog.resolve?.('ok')">
    <div class="h-full flex items-end justify-center px-4 sm:items-center sm:p-0">
      <DialogPanel
        role="alertdialog"
        class="inline-block transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left align-bottom shadow-xl transition-all sm:my-8 sm:max-w-sm sm:w-full sm:p-6 sm:align-middle"
      >
        <div>
          <div class="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-100">
            <svg class="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div class="mt-3 text-center sm:mt-5">
            <DialogTitle class="text-lg text-gray-900 font-medium leading-6">
              {{ title }}
            </DialogTitle>
            <div class="mt-2">
              <DialogDescription class="text-sm text-gray-500">
                {{ description }}
              </DialogDescription>
            </div>
          </div>
        </div>
        <div class="mt-5 sm:mt-6">
          <button
            type="button"
            class="w-full inline-flex justify-center border border-transparent rounded-md bg-indigo-600 px-4 py-2 text-base text-white font-medium shadow-sm hover:bg-indigo-700 sm:text-sm focus:outline-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            @click="dialog.resolve('ok')"
          >
            {{ confirmText }}
          </button>
        </div>
      </DialogPanel>
    </div>
  </DialogTemplate>
</template>
