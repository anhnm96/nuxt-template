<script setup lang="ts">
import Button from '~/components/Button.vue'
import Dialog from '~/components/dialog/Dialog.vue'
import DialogTrigger from '~/components/dialog/DialogTrigger.vue'
import { PAGE_SIZE_OPTIONS } from '~/constants/pagination'
import { selfAssignReportInquiry } from '~/services/inquiries'
import { REPORT_INQUIRY_MANAGEMENT_LIST_SORT_BY, TAB } from '../constants'
import { injectProductsRootContext } from '../index.vue'
import ChangeStatusAnswerDialog from './ChangeStatusAnswerDialog.vue'

const { t } = useI18n()
const dialogStore = useDialogStore()

const {
  data,
  selectedItems,
  sortType,
  pageSize,
  currentPage,
  hasSearchFormSubmitted,
  appliedSearchForm,
  activeTab,
  refetch,
} = injectProductsRootContext()!

const toast = useToast()
async function handleRemoveItem() {
  const result = await dialogStore.showConfirm({
    title: 'Confirm',
    description: t('messages.delete'),
    severity: 'warn',
  })
  if (!result) return

  await Promise.all(selectedItems.value.map(i => fetch(`https://dummyjson.com/products/${i}`, { method: 'DELETE' })))
  // TODO: refetch
  toast.show({ description: `Removed ${selectedItems.value.length} items` })
  selectedItems.value = []
}

const orderOptions = computed(
  () => Object.entries(REPORT_INQUIRY_MANAGEMENT_LIST_SORT_BY)
    .map(([key, value]) => ({
      label: t(`report_inquiry_management_list.sort_type.${key.toLowerCase()}`),
      value,
    })),
)

const pageSizeOptions = PAGE_SIZE_OPTIONS.map(i => (({
  label: `${i} ${t('game_management_list.item', i)}`,
  value: i,
})))

function handleChangeSortOrder(value: typeof orderOptions.value[number]['value']) {
  if (!hasSearchFormSubmitted.value) return

  sortType.value = value
  refetch()
}

function handleChangePageSize(value: number) {
  if (!hasSearchFormSubmitted.value) return

  pageSize.value = value
  currentPage.value = 0
  refetch()
}

async function handleShowDownloadDialog() {
  // const result = await dialogStore.showDialog({
  //   component: shallowRef(FileDownloadDialog),
  //   props: {},
  // });

  // const response = await downloadReportInquiry({
  //   ...appliedSearchPayload.value!,
  //   password: result.openPassword,
  //   reason: result.downloadReason,
  // });
  const { data } = { data: {} }

  const fileName = t('report_inquiry_management_list.title')

  // const startDate = formatDateTime(appliedSearchPayload.value!.periodInfo.from, 'YYYYMMDD');
  // const endDate = formatDateTime(appliedSearchPayload.value!.periodInfo.to, 'YYYYMMDD');

  // fileName += `_(${startDate}~${endDate})_${formatDateTime(Date.now(), 'YYYYMMDD')}.xlsx`;
  // save binary file
  const type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  const blob = new Blob([data as any], { type })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')

  link.href = url
  link.download = fileName
  link.click()

  URL.revokeObjectURL(url)
}

async function handleShowAssignDialog() {
  // const result = await dialogStore.showDialog({
  //   component: shallowRef(AssignDialog),
  //   group: REPORT_INQUIRY_MANAGEMENT_LIST,
  // });

  // if (result && activeTab.value === REPORT_INQUIRY_MANAGEMENT_LIST_TAB.MY_INQUIRIES) {
  //   triggerFetchData({ page: 0 });
  // }
}

async function handleSendAnswerSuccess() {
  if (activeTab.value === TAB.MY_INQUIRIES) {
    refetch()
  }
}

async function handleSelfAssign() {
  const result = await dialogStore.showConfirm({
    description: t('report_inquiry_management_list.confirm_assign_to_me'),
    confirmLabel: t('report_inquiry_management_list.assign_to_me'),
  })

  if (!result) return

  try {
    await selfAssignReportInquiry({
      reportSeqNos: selectedItems.value,
      serviceId: appliedSearchForm.value!.serviceId!,
    })

    // show success message
    dialogStore.showAlert({
      description: [t('report_inquiry_management_list.assign_dialog.update_success')],
      severity: 'success',
    })
  } catch {
    dialogStore.showAlert({
      description: t('messages.save_fail'),
      severity: 'error',
    })
  }
}
</script>

<template>
  <div class="mt-4 gap-4 flex-wrap flex justify-end">
    <Button
      class="btn-warn mr-auto"
      :disabled="selectedItems.length === 0"
      label="Delete"
      :icon="{ name: 'ph:trash' }"
      @click="handleRemoveItem"
    />
    <!-- change assignee -->
    <Button
      :label="t('report_inquiry_management_list.change_assignee')"
      class="min-w-25 px-6 btn-primary"
      :disabled="selectedItems.length === 0"
      @click="handleShowAssignDialog"
    />
    <!-- change status / answer -->
    <Dialog
      v-if="activeTab === TAB.MY_INQUIRIES"
      :title="`${t('report_inquiry_management_list.change_status_dialog.change_status')} / ${t('report_inquiry_management_list.change_status_dialog.answer')}`"
      :pt="{ panel: { class: 'w-250' } }"
    >
      <template #trigger>
        <DialogTrigger
          class="min-w-25 px-6 btn-primary"
          :disabled="selectedItems.length === 0"
        >
          {{ t('report_inquiry_management_list.change_status_dialog.change_status') }} / {{ t('report_inquiry_management_list.change_status_dialog.answer') }}
        </DialogTrigger>
      </template>
      <template #default="{ setClose }">
        <ChangeStatusAnswerDialog @close="setClose();$event && handleSendAnswerSuccess()" />
      </template>
    </Dialog>

    <!-- self assign -->
    <Button
      v-else
      :label="t('report_inquiry_management_list.assign_to_me')"
      class="min-w-25 px-6 btn-primary"
      :disabled="selectedItems.length === 0"
      @click="handleSelfAssign"
    />
    <NuxtLink class="btn min-w-btn btn-primary gap-1" to="/">
      <span>Register</span>
      <Icon class="translate-x-1/4" name="ph:pencil-line" />
    </NuxtLink>
  </div>
  <!-- list edit -->
  <div class="mt-4 flex items-center justify-between gap-4">
    <h4 class="font-medium">
      Post list
    </h4>
    <!-- items count -->
    <I18nT keypath="list.result" :plural="data?.list.length" tag="span" class="ml-auto">
      <template #count>
        <span :class="{ 'text-primary font-medium': data?.list.length || 0 > 0 }">{{ data?.list.length }}</span>
      </template>
    </I18nT>
    <!-- download excel file -->
    <Button
      class="btn-link !text-primary"
      :disabled="data?.list.length === 0"
      @click="handleShowDownloadDialog"
    >
      <Icon name="file-icons:microsoft-excel" class="text-xl" />
      <span>{{ t('game_management_list.download_excel') }}</span>
      <Icon name="mingcute:download-2-line" class="text-xl" />
    </Button>
    <!-- change sort order -->
    <Select
      :model-value="sortType"
      class="w-48"
      option-label="label"
      option-value="value"
      :scroll-height="orderOptions.length > 6 ? '18.5rem' : '19rem'"
      :options="orderOptions"
      @update:model-value="handleChangeSortOrder"
    />
    <!-- change page size -->
    <Select
      :model-value="pageSize"
      class="w-24"
      option-label="label"
      option-value="value"
      :scroll-height="pageSizeOptions.length > 6 ? '18.5rem' : '19rem'"
      :options="pageSizeOptions"
      @update:model-value="handleChangePageSize"
    />
  </div>
</template>
