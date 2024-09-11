<script lang="ts">
import type { InfoProps } from './info.vue'

export interface WarnProps extends InfoProps {
  cancelText?: string
}
</script>

<script setup lang="ts">
const { title = 'Waning', description = 'Are you sure to do this?', confirmText = 'Yes', cancelText = 'No' } = defineProps<WarnProps>()

const dialog = useDialogStore()
async function handleClose(value: boolean) {
  dialog.resolve?.(value)
}
</script>

<template>
  <DialogTemplate @close="handleClose(false)">
    <div class="h-full flex items-end justify-center px-4 sm:items-center sm:p-0">
      <DialogPanel
        role="alertdialog"
        class="inline-block transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left align-bottom shadow-xl transition-all sm:(my-8 max-w-lg w-full p-6 align-middle)"
      >
        <div class="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
          <button
            type="button"
            class="flex rounded-md bg-white text-gray-400 hover:text-gray-500 focus:(outline-none ring-2 ring-offset-4 ring-indigo-500)"
            @click="handleClose(false)"
          >
            <span class="sr-only">Close</span>
            <Icon class="text-xl" name="ph:x-bold" />
          </button>
        </div>
        <div class="sm:flex sm:items-start">
          <div class="mx-auto h-12 w-12 flex flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
            <Icon class="text-2xl text-red-600" name="ph:warning-bold" />
          </div>
          <div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
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
        <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          <button
            type="button"
            class="w-full inline-flex justify-center border border-transparent rounded-md bg-red-600 px-4 py-2 text-base text-white font-medium shadow-sm sm:ml-3 sm:w-auto hover:bg-red-700 sm:text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            @click="handleClose(true)"
          >
            {{ confirmText }}
          </button>
          <button
            type="button"
            class="mt-3 w-full inline-flex justify-center border border-gray-300 rounded-md bg-white px-4 py-2 text-base text-gray-700 font-medium shadow-sm sm:mt-0 sm:w-auto sm:text-sm hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            @click="handleClose(false)"
          >
            {{ cancelText }}
          </button>
        </div>
      </DialogPanel>
    </div>
  </DialogTemplate>
</template>
