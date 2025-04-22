<script lang="ts">
import Dialog from './dialog/Dialog.vue'

export interface AlertDialogProps {
  title?: string
  description?: string | string[]
  confirmLabel?: string
  severity?: Severity
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
  <Dialog
    v-slot="{ setClose }"
    :pt="{
      panel: {
        role: 'alertdialog',
        class: 'w-full px-4 pb-4 pt-5 sm:min-w-sm sm:max-w-xl sm:w-auto sm:p-6',
        style: { '--severity': `var(--color-${getVariant.color}-500)`,
                 '--severity-light': `var(--color-${getVariant.color}-100)` },
      },
    }"
    @after-leave="$emit('afterLeave')"
  >
    <!-- main -->
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
    <!-- action -->
    <div class="mt-5 sm:mt-6">
      <button
        type="button"
        class="w-full px-4 shadow-sm btn text-sm"
        :class="[`btn-${severity}`]"
        @click="setClose();$emit('close', true)"
      >
        {{ confirmLabel || $t('confirm') }}
      </button>
    </div>
  </Dialog>
</template>
