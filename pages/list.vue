<script lang="ts">
import type { ShallowRef } from 'vue'
import dayjs from 'dayjs'
import { cloneDeep } from 'lodash-es'
import { PAGE_SIZE_DEFAULT_VALUE } from '~/constants/pagination'

export const PAGE_MANAGEMENT_LIST = 'PAGE_MANAGEMENT_LIST'

interface SearchForm {
  category?: string
  keyword?: string
}

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

interface ProducsContext {
  searchForm: Ref<SearchForm>
  appliedSearchForm: Ref<SearchForm | undefined>
  selectedItems: Ref<string[]>
  data: ShallowRef<PaginatedResponse<Product, 'products'> | undefined>
  orderBy: Ref<SortCriteria[keyof SortCriteria]>
  pageSize: Ref<number>
  currentPage: Ref<number>
  refetch: () => void
}

export const LIST_SORT_BY = { CREATED_AT_DESC: 'created_at__desc', CREATED_AT_ASC: 'created_at__asc', UPDATED_AT_DESC: 'updated_at__desc', UPDATED_AT_ASC: 'updated_at__asc' } as const
export type SortCriteria = typeof LIST_SORT_BY

export const [provideProductsRootContext, injectProductsRootContext]
  = createContext<ProducsContext>('Products')
</script>

<script lang="ts" setup>
definePageMeta({
  name: PAGE_MANAGEMENT_LIST,
})

// const route = useRoute()

const initialSearchFormValue = {
  service: undefined,
  keyword: undefined,
}

const searchForm = ref<SearchForm>(cloneDeep(initialSearchFormValue))
const appliedSearchForm = ref<SearchForm>()

const orderBy = ref<SortCriteria[keyof SortCriteria]>(LIST_SORT_BY.CREATED_AT_DESC)
const pageSize = ref(PAGE_SIZE_DEFAULT_VALUE)

const currentPage = ref(1)
const { data, isLoading, refetch } = useQuery<PaginatedResponse<Product, 'products'>>({
  key: () => ['posts', { page: currentPage.value }],
  query: () => $fetch('https://dummyjson.com/products', {
    query: {
      orderBy: orderBy.value,
      limit: pageSize.value,
      skip: pageSize.value * currentPage.value,
    },
  }),
})

const headers = ['title', 'description', 'category', 'price', 'createdAt']

const { selectedItems, isAllSelected, toggleSelectAll, isItemChecked, selectItem, hasSelectedItem }
  = useCheckbox(computed(() => data.value?.products || []), i => i.id)

provideProductsRootContext({
  searchForm,
  appliedSearchForm,
  selectedItems,
  data,
  orderBy,
  pageSize,
  currentPage,
  refetch,
})
</script>

<template>
  <div class="p-4">
    <h1>Management List</h1>
    <SearchForm class="mt-4" />
    <!-- actions -->
    <ListActions />
    <div class="h-[500px] overflow-auto">
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
            <td>{{ dayjs(product.meta.createdAt).format('YYYY-MMM-DD HH:mm:ss') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
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

tr:has(> td:first-child > input:checked) {
  @apply bg-sky-200;
}
</style>
