<script setup lang="ts">
import VuePdfEmbed from 'vue-pdf-embed'
import Dialog from '~/components/dialog/Dialog.vue'

const props = defineProps<{
  selector: string
}>()

defineEmits<{
  afterLeave: []
  close: []
}>()

const { t } = useI18n()
const id = useId()
const dialogRef = useTemplateRef('dialogRef')

const pdfUrl = ref<string | null>()
const exportPdfOptions = ref({
  jsPDF: { format: 'a4', orientation: 'portrait' },
})
const formatOptions = ['a0', 'a1', 'a2', 'a3', 'a4', 'a5']
  .map(v => ({ value: v, label: v.toUpperCase() }))
const orientationOptions = ['portrait', 'landscape']
  .map(v => ({ value: v, label: t(`pdf.${v}`) }))
let canvas: HTMLCanvasElement | null = null

async function handleExport() {
  exportPdf(canvas!, exportPdfOptions.value)

  dialogRef.value?.setClose()
}

watch(exportPdfOptions, async (newOptions) => {
  if (pdfUrl.value) {
    URL.revokeObjectURL(pdfUrl.value)
  }

  const { blob, canvas: _canvas } = await getPdf(props.selector, newOptions)

  canvas = _canvas

  pdfUrl.value = URL.createObjectURL(blob)
}, { immediate: true, deep: true })
</script>

<template>
  <Dialog
    ref="dialogRef"
    :title="t('pdf.export_pdf')" class="min-w-200"
    @after-leave="$emit('afterLeave')"
  >
    <div class="flex gap-4 p-4">
      <!-- pdf preview -->
      <div class="flex h-113 flex-grow justify-center overflow-auto rounded border border-abd bg-abg">
        <div class="mt-4">
          <VuePdfEmbed
            v-if="pdfUrl"
            :source="pdfUrl"
            text-layer
            annotation-layer
          />
          <div class="h-px" />
        </div>
      </div>
      <!-- options -->
      <div>
        <div class="grid grid-cols-[auto_200px] items-center gap-4">
          <Label :for="`page-format--${id}`">
            {{ t('pdf.page_format') }}:
          </Label>
          <Select
            v-model="exportPdfOptions.jsPDF.format"
            class="w-50"
            :label-id="`page-format--${id}`"
            :options="formatOptions"
            option-label="label"
            option-value="value"
            scroll-height="23rem"
          />
          <Label :for="`page-orientation--${id}`">
            {{ t('pdf.orientation') }}:
          </Label>
          <Select
            v-model="exportPdfOptions.jsPDF.orientation"
            class="w-50"
            option-label="label"
            option-value="value"
            :options="orientationOptions"
            :label-id="`page-orientation--${id}`"
          />
        </div>
      </div>
    </div>
    <footer class="flex justify-center p-4">
      <!-- confirm -->
      <button
        class="btn btn-primary min-w-30"
        @click="handleExport"
      >
        {{ t('export') }}
      </button>
    </footer>
  </Dialog>
</template>
