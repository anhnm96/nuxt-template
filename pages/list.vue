<script lang="ts">
// import { cloneDeep } from 'lodash-es'

export const PAGE_NAME = 'REPORT_HELP_MANAGEMENT_LIST'
</script>

<script lang="ts" setup>
definePageMeta({
  name: PAGE_NAME,
})

interface Product {
  id: number
  title: string
  description: string
  category: string
  price: string
  meta: {
    createdAt: string
    updatedAt: string
  }
}
const { t } = useI18n()
// const route = useRoute()

// interface SearchFormValue {
//   selectedService?: ''
//   keyword?: ''
// }
// interface ServiceOption {
//   label: string
//   value: string
// }
// const initialFormValue = {
//   selectedService: undefined,
//   keyword: undefined,
// }
const GAME_MANAGEMENT_LIST_SORT_BY = { CREATED_AT_DESC: 'created_at__desc', CREATED_AT_ASC: 'created_at__asc', UPDATED_AT_DESC: 'updated_at__desc', UPDATED_AT_ASC: 'updated_at__asc' }
const PAGE_SIZE_DEFAULT_VALUE = 100
const PAGE_SIZE_OPTIONS = [10, 50, 100]
// const serviceOptions = ref<ServiceOption[]>([])
// const searchFormValue = ref<SearchFormValue>(cloneDeep(initialFormValue))
// const appliedSearchFormValue = ref<SearchFormValue>(cloneDeep(initialFormValue))
const hasSearchFormSubmitted = ref(false)

const orderBy = ref(GAME_MANAGEMENT_LIST_SORT_BY.CREATED_AT_DESC)
const pageSize = ref(PAGE_SIZE_DEFAULT_VALUE)

const currentPage = ref(1)
const { data, isLoading } = useQuery<{ products: Product[], total: number }>({
  key: () => ['posts', { page: currentPage.value }],
  query: () => $fetch('https://dummyjson.com/products', {
    query: { limit: pageSize.value, skip: pageSize.value * currentPage.value },
  }),
})

const headers = ['title', 'description', 'category', 'price', 'createdAt']

const { selectedItems, isAllSelected, toggleSelectAll, isItemChecked, selectItem, hasSelectedItem }
  = useCheckbox(computed(() => data.value?.products || []), i => i.id)

const dialogStore = useDialogStore()
async function handleRemoveItem() {
  const result = await dialogStore.showConfirmDialog({ title: 'Confirm', description: `Do you want to delete ${selectedItems.value?.length} items?` })
  if (!result) return

  await Promise.all(selectedItems.value.map(i => fetch(`https://dummyjson.com/products/${i}`, { method: 'DELETE' })))
}

const orderOptions = computed(
  () => Object.values(GAME_MANAGEMENT_LIST_SORT_BY)
    .map(item => ({
      label: t(`game_management_list.sort.${item}`),
      value: item,
    })),
)

const pageSizeOptions = PAGE_SIZE_OPTIONS.map(i => (({
  label: `${i} ${t('game_management_list.item', i)}`,
  value: i,
})))

function handleChangeSortOrder() {
  if (!hasSearchFormSubmitted.value) {
    return
  }

  triggerFetchData({ page: currentPage.value })
}

function handleChangePageSize() {
  if (!hasSearchFormSubmitted.value) {
    return
  }

  triggerFetchData({ page: 0 })
}
function triggerFetchData(params: any) {

}
</script>

<template>
  <div class="p-4">
    List
    <div class="border border-slate-200 rounded-md bg-slate-50">
      <Button class="px-2">
        <Icon name="ph:magnifying-glass-bold" />
      </Button>
    </div>
    <!-- actions -->
    <div class="mt-4 flex justify-between">
      <Button
        class="min-w-btn btn-warning"
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
        v-model="orderBy"
        class="w-48"
        option-label="label"
        option-value="value"
        :scroll-height="orderOptions.length > 6 ? '18.5rem' : '19rem'"
        :options="orderOptions"
        @update:model-value="handleChangeSortOrder"
      />
      <!-- change page size -->
      <Select
        v-model="pageSize"
        class="w-24"
        option-label="label"
        option-value="value"
        :scroll-height="pageSizeOptions.length > 6 ? '18.5rem' : '19rem'"
        :options="pageSizeOptions"
        @update:model-value="handleChangePageSize"
      />
    </div>
    <table class="mt-4 w-full border-collapse border border-slate-200">
      <thead>
        <tr>
          <th class="pl-6 pr-4">
            <Checkbox
              class="inline-block h-[18px] w-[18px]"
              type="checkbox"
              :indeterminate="hasSelectedItem && !isAllSelected"
              :checked="isAllSelected"
              @change="toggleSelectAll"
            />
          </th>
          <th v-for="header in headers" :key="header">
            {{ header }}
          </th>
        </tr>
      </thead>
      <td v-if="isLoading" :colspan="headers.length" class="py-2">
        <Spinner class="mx-auto text-3xl text-primary" />
      </td>
      <tbody v-else-if="data">
        <tr v-for="(product, index) in data.products" :key="product.id">
          <td class="pl-6 pr-4 text-center">
            <input
              class="h-[18px] w-[18px]"
              type="checkbox"
              :checked="isItemChecked(product)"
              @click="selectItem(product, index, $event)"
            >
          </td>
          <td>{{ product.title }}</td>
          <td>
            <p class="line-clamp-2 break-all">
              {{ product.description }}
            </p>
          </td>
          <td>{{ product.category }}</td>
          <td>{{ product.price }}</td>
          <td>{{ product.meta.createdAt }}</td>
        </tr>
      </tbody>
    </table>
    <div class="mt-4 text-center">
      <Pagination
        v-if="data"
        v-model:current-page="currentPage"
        :total="data.total" :per-page="pageSize"
      />
    </div>
  </div>
</template>

<style scoped>
@reference "../assets/css/main.css";

table th,
table td {
  @apply border border-slate-200 p-2;
}
</style>
