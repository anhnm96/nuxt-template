<script lang="ts">
import type { ShallowRef } from 'vue'
import { cloneDeep, pick } from 'lodash-es'
import { PAGE_SIZE_DEFAULT_VALUE } from '~/constants/pagination'
import { PAGE_MANAGEMENT_REGISTER } from '../register/index.vue'
import ListActions from './components/ListActions.vue'
import SearchForm from './components/SearchForm.vue'

export const PAGE_MANAGEMENT_LIST = 'PAGE_MANAGEMENT_LIST'

interface SearchFormFields {
  service?: string
  keyword?: string
}

interface ListContext {
  initialSearchForm: SearchFormFields
  searchForm: Ref<SearchFormFields>
  appliedSearchForm: Ref<SearchFormFields | undefined>
  selectedItems: Ref<number[]>
  data: ShallowRef<PaginatedResponse<Product, 'products'> | undefined>
  isLoading: Ref<boolean>
  orderBy: Ref<SortCriteria[keyof SortCriteria]>
  isFullViewMode: Ref<boolean>
  toggleFullViewMode: (value?: boolean) => void
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

const initialSearchForm: SearchFormFields = {
  service: undefined,
  keyword: undefined,
}

const searchForm = ref<SearchFormFields>(cloneDeep(initialSearchForm))
const appliedSearchForm = ref<SearchFormFields>()

const { isFullViewMode, toggleFullViewMode } = useFullViewMode()

const orderBy = ref<SortCriteria[keyof SortCriteria]>(LIST_SORT_BY.CREATED_AT_DESC)
const pageSize = ref(PAGE_SIZE_DEFAULT_VALUE)

const currentPage = ref(1)
const { data, isLoading, refetch } = useQuery({
  key: () => ['products', { page: currentPage.value }],
  query: () => fetchList(),
  enabled: computed(() => !!appliedSearchForm.value),
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
  selectedItems.value = []
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

  if (query.orderBy) orderBy.value = query.orderBy as any
  if (query.page) currentPage.value = Number(query.page)
  if (query.pageSize) pageSize.value = Number(query.pageSize)
  // enable fetch data
  appliedSearchForm.value = cloneDeep(searchForm.value)
}
init()

provideProductsRootContext({
  initialSearchForm,
  searchForm,
  appliedSearchForm,
  selectedItems,
  data,
  isLoading,
  toggleFullViewMode,
  isFullViewMode,
  orderBy,
  pageSize,
  currentPage,
  buildQueryParams,
  refetch,
})
</script>

<template>
  <div class="flex h-dvh flex-col overflow-hidden p-4 pb-0">
    <h1>Management List</h1>
    <SearchForm class="mt-4" />
    <!-- actions -->
    <ListActions />
    <div
      class="flex flex-1 flex-col overflow-hidden"
      :class="[isFullViewMode ? 'fixed inset-0 z-1 bg-white' : 'mt-4']"
    >
      <div class="h-full overflow-auto">
        <table class="isolate w-full border-separate border-spacing-0 border-l border-slate-200">
          <thead>
            <tr>
              <th class="pr-4 pl-6">
                <Checkbox
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
          <td v-if="isLoading" :colspan="headers.length + 1">
            <div
              class="sticky w-fit -translate-x-1/2 transform p-4 text-center"
              :class="isFullViewMode ? 'left-1/2' : 'left-[50vw]'"
            >
              <Spinner class="mx-auto text-3xl text-primary" />
            </div>
          </td>
          <tbody v-else-if="data">
            <td v-if="data.products.length === 0" :colspan="headers.length + 1">
              <div
                class="sticky w-fit -translate-x-1/2 transform p-4 text-center"
                :class="isFullViewMode ? 'left-1/2' : 'left-[50vw]'"
              >
                No search results found.
              </div>
            </td>
            <tr v-for="(product, index) in data.products" v-else :key="product.id">
              <td class="pr-4 pl-6 text-center">
                <input
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
              <td><DateTime :date="product.meta.createdAt" /></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="my-4 text-center">
        <Pagination
          v-if="data"
          v-model:current-page="currentPage"
          :total="data.total" :per-page="pageSize"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";

table th {
  @apply sticky top-0 z-10 bg-slate-50 border-t font-semibold;
}
table th,
table td {
  @apply border-r border-b border-slate-200 p-2;
}

tr:has(> td:first-child > input:checked) {
  @apply bg-sky-200;
}
</style>
