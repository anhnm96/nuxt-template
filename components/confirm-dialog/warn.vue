<script setup lang="ts">
const props = defineProps<{ resolve: (v: boolean) => void }>()

async function handleClose(value: boolean, setClose: () => void) {
  await setClose()
  props.resolve(value)
}
</script>

<template>
  <DialogTemplate v-slot="{ setClose }" :open="true" @close="resolve(false)">
    <div class="min-h-screen flex items-end justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
      <DialogPanel
        role="alertdialog"
        class="inline-block transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left align-bottom shadow-xl transition-all sm:(my-8 max-w-lg w-full p-6 align-middle)"
      >
        <div class="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
          <button type="button" class="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            <span class="sr-only">Close</span>
            <svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="sm:flex sm:items-start">
          <div class="mx-auto h-12 w-12 flex flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
            <svg class="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
            <h3 id="modal-title" class="text-lg text-gray-900 font-medium leading-6">
              Deactivate account
            </h3>
            <div class="mt-2">
              <p class="text-sm text-gray-500">
                Are you sure you want to deactivate your account? All of your data will be permanently removed from our servers forever. This action cannot be undone.
              </p>
            </div>
          </div>
        </div>
        <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          <button
            type="button"
            class="w-full inline-flex justify-center border border-transparent rounded-md bg-red-600 px-4 py-2 text-base text-white font-medium shadow-sm sm:ml-3 sm:w-auto hover:bg-red-700 sm:text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            @click="handleClose(true, setClose)"
          >
            Deactivate
          </button>
          <button
            type="button"
            class="mt-3 w-full inline-flex justify-center border border-gray-300 rounded-md bg-white px-4 py-2 text-base text-gray-700 font-medium shadow-sm sm:mt-0 sm:w-auto sm:text-sm hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            @click="handleClose(false, setClose)"
          >
            Cancel
          </button>
        </div>
      </DialogPanel>
    </div>
  </DialogTemplate>
</template>
