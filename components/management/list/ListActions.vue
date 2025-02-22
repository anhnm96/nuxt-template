<script setup lang="ts">
import { PAGE_SIZE_OPTIONS } from '~/constants/pagination'
import { injectProductsRootContext, LIST_SORT_BY } from '~/pages/list.vue'

const { t } = useI18n()
const dialogStore = useDialogStore()

const {
  appliedSearchForm,
  data,
  selectedItems,
  orderBy,
  pageSize,
  currentPage,
  refetch,
} = injectProductsRootContext()!

const toast = useToast()
async function handleRemoveItem() {
  const result = await dialogStore.showConfirmDialog({
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
  () => Object.values(LIST_SORT_BY)
    .map(item => ({
      label: t(`game_management_list.sort.${item}`),
      value: item,
    })),
)

const pageSizeOptions = PAGE_SIZE_OPTIONS.map(i => (({
  label: `${i} ${t('game_management_list.item', i)}`,
  value: i,
})))

function handleChangeSortOrder(value: typeof orderOptions.value[number]['value']) {
  if (!appliedSearchForm.value) {
    return
  }

  orderBy.value = value
  refetch()
}

function handleChangePageSize(value: number) {
  if (!appliedSearchForm.value) {
    return
  }

  pageSize.value = value
  currentPage.value = 0
}
</script>

<template>
  <div class="mt-4 gap-4 flex-wrap flex justify-between">
    <Button
      class="min-w-btn btn-warn"
      :disabled="selectedItems.length === 0"
      @click="handleRemoveItem"
    >
      <span>Delete</span>
      <Icon name="ph:trash" />
    </Button>
    <NuxtLink class="btn min-w-btn btn-primary gap-1" to="/register">
      <span>Register</span>
      <Icon name="ph:pencil-line" />
    </NuxtLink>
  </div>
  <!-- list edit -->
  <div class="mt-4 flex items-center justify-between gap-4">
    <h4 class="font-medium">
      Post list
    </h4>
    <!-- items count -->
    <I18nT keypath="list.result" tag="span" class="ml-auto">
      <template #count>
        <span :class="{ 'text-primary font-medium': data?.products.length || 0 > 0 }">{{ data?.products.length }}</span>
      </template>
    </I18nT>
    <!-- download excel file -->
    <Button
      class="btn-link !text-primary"
      :disabled="data?.products.length === 0"
    >
      <Icon name="file-icons:microsoft-excel" class="text-xl" />
      <span>{{ t('game_management_list.download_excel') }}</span>
      <Icon name="mingcute:download-2-line" class="text-xl" />
    </Button>
    <!-- change sort order -->
    <Select
      :model-value="orderBy"
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
