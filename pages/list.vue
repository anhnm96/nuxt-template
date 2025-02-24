<script lang="ts">
import type { ShallowRef } from 'vue'
import dayjs from 'dayjs'
import { cloneDeep, pick } from 'lodash-es'
import { PAGE_SIZE_DEFAULT_VALUE } from '~/constants/pagination'
import { PAGE_MANAGEMENT_REGISTER } from './register.vue'

export const PAGE_MANAGEMENT_LIST = 'PAGE_MANAGEMENT_LIST'

interface SearchForm {
  service?: string
  keyword?: string
}

interface Product {
  id: number
  title: string
  description: string
  category: string
  price: string
  stock: number
  meta: {
    createdAt: string
    updatedAt: string
  }
}

interface ListContext {
  initialSearchForm: SearchForm
  searchForm: Ref<SearchForm>
  appliedSearchForm: Ref<SearchForm | undefined>
  selectedItems: Ref<number[]>
  data: ShallowRef<PaginatedResponse<Product, 'products'> | undefined>
  isLoading: Ref<boolean>
  orderBy: Ref<SortCriteria[keyof SortCriteria]>
  pageSize: Ref<number>
  currentPage: Ref<number>
  buildQueryParams: () => Record<string, string | number>
  refetch: () => void
}

export const LIST_SORT_BY = { CREATED_AT_DESC: 'created_at__desc', CREATED_AT_ASC: 'created_at__asc', UPDATED_AT_DESC: 'updated_at__desc', UPDATED_AT_ASC: 'updated_at__asc' } as const
export type SortCriteria = typeof LIST_SORT_BY

export const [provideProductsRootContext, injectProductsRootContext]
  = createContext<ListContext>('Products')
</script>

<script lang="ts" setup>
definePageMeta({
  name: PAGE_MANAGEMENT_LIST,
})

const route = useRoute()

const initialSearchForm: SearchForm = {
  service: undefined,
  keyword: undefined,
}

const searchForm = ref<SearchForm>(cloneDeep(initialSearchForm))
const appliedSearchForm = ref<SearchForm>()

const orderBy = ref<SortCriteria[keyof SortCriteria]>(LIST_SORT_BY.CREATED_AT_DESC)
const pageSize = ref(PAGE_SIZE_DEFAULT_VALUE)

const currentPage = ref(1)
const { data, isLoading, refetch } = useQuery({
  key: () => ['products', { page: currentPage.value }],
  query: () => fetchList(),
  enabled: !!appliedSearchForm.value,
})

// build query params based on search form state
function buildQueryParams() {
  return {
    ...(appliedSearchForm.value || initialSearchForm),

    orderBy: orderBy.value,
    page: currentPage.value,
    pageSize: pageSize.value,
  }
}

function fetchList() {
  navigateTo({ name: PAGE_MANAGEMENT_LIST, query: camelToSnakeKeys(buildQueryParams()) })

  return $fetch<PaginatedResponse<Product, 'products'>>(`https://dummyjson.com/products/search`, {
    query: {
      q: searchForm.value.keyword,
      service: searchForm.value.service,
      orderBy: orderBy.value,
      limit: pageSize.value,
      skip: pageSize.value * currentPage.value,
    },
  })
}

const headers = ['title', 'description', 'category', 'price', 'stock', 'createdAt']

const {
  selectedItems,
  isAllSelected,
  canSelectAllItems,
  hasSelectedItem,
  toggleSelectAll,
  isItemChecked,
  selectItem,
} = useCheckbox({
  items: computed(() => data.value?.products || []),
  valueAdapter: i => i.id,
  canSelectItemFn: i => i.stock > 0,
})

function init() {
  // parse query from url
  const query = snakeToCamelKeys(route.query as Record<string, string>)

  // check if it is redirected from other page
  if (!query.page) {
    return
  }

  // set search form value based on query params
  Object.assign(searchForm.value, pick(query, Object.keys(initialSearchForm)))
  appliedSearchForm.value = cloneDeep(searchForm.value)

  if (query.orderBy) orderBy.value = query.orderBy as any
  if (query.page) currentPage.value = Number(query.page)
  if (query.pageSize) pageSize.value = Number(query.pageSize)
  // fetch data
  refetch()
}
init()

provideProductsRootContext({
  initialSearchForm,
  searchForm,
  appliedSearchForm,
  selectedItems,
  data,
  isLoading,
  orderBy,
  pageSize,
  currentPage,
  buildQueryParams,
  refetch,
})
</script>

<template>
  <div class="p-4 h-screen">
    <h1>Management List</h1>
    <SearchForm class="mt-4" />
    <!-- actions -->
    <ListActions />
    <div class="mt-4 h-[500px] overflow-auto">
      <table class=" w-full border-collapse border border-slate-200">
        <thead>
          <tr>
            <th class="pl-6 pr-4">
              <Checkbox
                class="inline-block h-[18px] w-[18px]"
                type="checkbox"
                :indeterminate="hasSelectedItem && !isAllSelected"
                :checked="isAllSelected"
                :disabled="!canSelectAllItems"
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
                :disabled="product.stock === 0"
                @click="selectItem(product, index, $event)"
              >
            </td>
            <td>
              <NuxtLink
                class="btn btn-link line-clamp-2 break-all"
                :to="{ name: PAGE_MANAGEMENT_REGISTER, query: camelToSnakeKeys({ ...buildQueryParams(), id: product.id }) }"
              >
                {{ product.title }}
              </NuxtLink>
            </td>
            <td>
              <p class="line-clamp-2 break-all">
                {{ product.description }}
              </p>
            </td>
            <td>{{ product.category }}</td>
            <td>{{ product.price }}</td>
            <td>{{ product.stock }}</td>
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

table {
  @apply border-collapse;
}
table th {
  @apply sticky top-0 z-10 bg-slate-50;
}
table th,
table td {
  @apply border border-slate-200 p-2;
}

tr:has(> td:first-child > input:checked) {
  @apply bg-sky-200;
}
</style>
