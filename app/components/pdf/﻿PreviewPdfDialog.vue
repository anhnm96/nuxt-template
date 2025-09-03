<script setup lang="ts">
import { InputNumber } from 'primevue'
import VuePdfEmbed from 'vue-pdf-embed'
import Dialog from '~/components/dialog/Dialog.vue'

defineProps<{
  pdfUrl: string
}>()

const { t } = useI18n()

// default width is 600px ~ 100%
const width = ref(600)
const zoom = ref(100)

watch(zoom, (val) => {
  width.value = val * 6
})
</script>

<template>
  <Dialog
    :title="t('pdf.preview_pdf')"
    class="max-h-full w-full"
  >
    <!-- pdf preview -->
    <div class="flex justify-center overflow-auto rounded border border-abd bg-abg">
      <div class="mt-4">
        <VuePdfEmbed
          :source="pdfUrl"
          text-layer
          annotation-layer
          :width
        />
      </div>
    </div>
    <footer class="flex justify-center border border-abd p-4">
      <InputNumber
        v-model="zoom"
        show-buttons
        button-layout="horizontal"
        :step="10"
        :min="25"
        :max="500"
        suffix="%"
      >
        <template #decrementicon>
          <Icon class="text-xl" name="ph:minus" />
        </template>
        <template #incrementicon>
          <Icon class="text-xl" name="ph:plus" />
        </template>
      </InputNumber>
    </footer>
  </Dialog>
</template>
