<script lang="ts">
import Dialog from './dialog/Dialog.vue'

export interface AlertDialogProps {
  title?: string
  description?: string | string[]
  confirmText?: string
  severity?: 'info' | 'success' | 'warn' | 'error'
}
</script>

<script setup lang="ts">
const { severity = 'info' } = defineProps<AlertDialogProps>()
defineEmits<{
  afterLeave: []
  close: [value?: boolean]
}>()

const getVariant = computed(() => {
  switch (severity) {
    case 'success':
      return { icon: 'ph:check-circle-bold', color: 'green' }
    case 'error':
      return { icon: 'ph:x-circle-bold', color: 'red' }
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
      <!-- panel -->
      <DialogPanel
        role="alertdialog"
        :style="{ '--severity': `var(--color-${getVariant.color}-500)`,
                  '--severity-light': `var(--color-${getVariant.color}-100)`,
        }"
        class="w-full inline-block transform overflow-hidden rounded-lg bg-white pb-4 pt-5 text-left align-bottom shadow-xl transition-all sm:my-8 sm:max-w-lg sm:w-full sm:py-6 sm:align-middle"
      >
        <div>
          <!-- icon -->
          <div class="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-(--severity-light)">
            <Icon class="text-2xl text-(--severity)" :name="getVariant.icon" />
          </div>
          <div class="text-center mt-3 sm:mt-5">
            <!-- title -->
            <DialogTitle v-if="title" class="mb-2 px-4 text-lg font-medium leading-6 sm:px-6">
              {{ title }}
            </DialogTitle>
            <!-- description -->
            <div v-if="description" class="max-h-[40vh] overflow-auto px-4 outline-offset-2 sm:px-6">
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
        <div class="mt-5 px-4 sm:mt-6 sm:px-6">
          <button
            type="button"
            class="w-full px-4 shadow-sm btn text-base sm:text-sm"
            :class="[`btn-${severity}`]"
            @click="setClose();$emit('close', true)"
          >
            {{ confirmText || $t('confirm') }}
          </button>
        </div>
      </DialogPanel>
    </div>
  </Dialog>
</template>
