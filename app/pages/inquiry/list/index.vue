<script lang="ts">
import type { ShallowRef } from 'vue'
import type { InquiryCodes, ReportInquiry } from './types'
import { cloneDeep, pick } from 'lodash-es'
import Tab from '~/components/tab/Tab.vue'
import TabList from '~/components/tab/TabList.vue'
import Tabs from '~/components/tab/Tabs.vue'
import { PAGE_SIZE_DEFAULT_VALUE } from '~/constants/pagination'
import { getCommonCodes, getInquiries, getServices } from '~/services/inquiries'
import ListActions from './components/ListActions.vue'
import SearchForm from './components/SearchForm.vue'
import { PAGE_INQUIRY_LIST, REPORT_INQUIRY_MANAGEMENT_LIST_SORT_BY, REPORT_INQUIRY_OPTION_ALL, TAB } from './constants'

interface SearchFormFields {
  serviceId: string
  category: string
  status: string
  detailStatus: string[]
  searchType: string
  keyword: string
  timePeriod: string
  language: string[]
  relay: string
}

type SortType = ValueOf<typeof REPORT_INQUIRY_MANAGEMENT_LIST_SORT_BY>

interface ListContext {
  activeTab: ShallowRef<ValueOf<typeof TAB>>
  defaultSearchForm: SearchFormFields
  searchForm: ShallowRef<SearchFormFields>
  appliedSearchForm: ShallowRef<SearchFormFields | undefined>
  hasSearchFormSubmitted: ShallowRef<boolean>
  services: ShallowRef<Service[]>
  isLoadingServices: ShallowRef<boolean>
  isInitialized: ShallowRef<boolean>
  selectedItems: Ref<number[]>
  data: ShallowRef<PaginatedResponse2<ReportInquiry>['data'] | undefined>
  searchFormCodes: Ref<InquiryCodes>
  isLoading: ShallowRef<boolean>
  isLoadingInquiryCodes: ShallowRef<boolean>
  sortType: ShallowRef<SortType>
  showMore: ShallowRef<boolean>
  pageSize: ShallowRef<number>
  currentPage: ShallowRef<number>
  // buildQueryParams: () => Record<string, string | number>
  refetch: () => void
}

export const [provideProductsRootContext, injectProductsRootContext]
  = createContext<ListContext>('Inquiries')
</script>

<script setup lang="ts">
definePageMeta({
  name: PAGE_INQUIRY_LIST,
})

const { t } = useI18n()
const route = useRoute()

const defaultSearchForm: SearchFormFields = {
  serviceId: '',
  category: REPORT_INQUIRY_OPTION_ALL,
  status: REPORT_INQUIRY_OPTION_ALL,
  detailStatus: [],
  // startDate: dayjs().add(-6, 'day').startOf('day').toDate(),
  // endDate: dayjs().endOf('day').toDate(),
  searchType: '',
  keyword: '',
  timePeriod: '',
  language: [],
  relay: REPORT_INQUIRY_OPTION_ALL,
}
const activeTab = shallowRef<ValueOf<typeof TAB>>(TAB.MY_INQUIRIES)
const searchForm = ref<SearchFormFields>(cloneDeep(defaultSearchForm))
const appliedSearchForm = shallowRef<SearchFormFields>()
//
// const selectedColumns = useLocalStorage(REPORT_INQUIRY_MANAGEMENT_LIST_COLUMNS, Object.values(REPORT_INQUIRY_MANAGEMENT_LIST_COLUMN)); // show hide columns
const showMore = shallowRef(false)
const sortType = shallowRef<SortType>(REPORT_INQUIRY_MANAGEMENT_LIST_SORT_BY.RECEIVED_DATE__DESC)
const pageSize = shallowRef(PAGE_SIZE_DEFAULT_VALUE)
const currentPage = shallowRef(0)
const hasSearchFormSubmitted = shallowRef(false)
const { data, isLoading, refetch } = useQuery({
  key: () => ['inquiries', activeTab.value, { page: currentPage.value }],
  query: () => fetchList(),
  enabled: hasSearchFormSubmitted,
  initialData: () => ({
    list: [],
    total: 0,
    skip: 0,
    limit: 0,
  }),
  refetchOnWindowFocus: false,
})

const {
  selectedItems,
  isAllSelected,
  canSelectAllItems,
  hasSelectedItem,
  toggleSelectAll,
  isItemChecked,
  selectItem,
} = useCheckbox({
  items: computed(() => data.value?.list || []),
  valueAdapter: i => i.seqNo,
  canSelectItemFn: () => true,
})

function fetchList() {
  if (!appliedSearchForm.value) throw new Error('appliedSearchForm is not set')
  selectedItems.value = []
  navigateTo({ name: PAGE_INQUIRY_LIST, query: camelToSnakeKeys(buildQueryParams()) })

  const query = {
    serviceIds: [appliedSearchForm.value.serviceId],
    reportDiv: appliedSearchForm.value.category === REPORT_INQUIRY_OPTION_ALL ? '' : appliedSearchForm.value.category,
    statusInfo: {
      status: appliedSearchForm.value.status !== REPORT_INQUIRY_OPTION_ALL ? [appliedSearchForm.value.status] : undefined,
      statusDetail: appliedSearchForm.value.detailStatus.length > 0 ? appliedSearchForm.value.detailStatus : undefined,
    },
    // periodInfo: {
    //   period: appliedSearchForm.value.timePeriod,
    //   from: appliedSearchForm.value.startDate!.toISOString(),
    //   to: appliedSearchForm.value.endDate!.toISOString(),
    // },
    searchType: appliedSearchForm.value.searchType,
    searchValue: appliedSearchForm.value.keyword,
    languageCode: appliedSearchForm.value.language,
    relay: appliedSearchForm.value.relay === REPORT_INQUIRY_OPTION_ALL ? '' : appliedSearchForm.value.relay === 'Y',

    adviser: activeTab.value === TAB.MY_INQUIRIES,
    page: currentPage.value,
    size: pageSize.value,
    sort: sortType.value.toUpperCase(),
  }
  console.log('fetchList', query)

  return getInquiries(query)
}

function handleSelectTab(value: ValueOf<typeof TAB>) {
  if (activeTab.value === value) return

  activeTab.value = value

  if (!isNaN(route.query.page as any)) {
    Object.assign(searchForm.value, appliedSearchForm.value)
    refetch()
  }
}

// build query params based on search form state
function buildQueryParams() {
  return {
    ...appliedSearchForm.value,
    // startDate: appliedSearchFormFields.value.startDate && new Date(appliedSearchFormFields.value.startDate).getTime(),
    // endDate: appliedSearchFormFields.value.endDate && new Date(appliedSearchFormFields.value.endDate).getTime(),

    showMore: showMore.value.toString(),
    activeTab: activeTab.value,
    sortType: sortType.value,
    page: currentPage.value,
    pageSize: pageSize.value,
  }
}

const { data: services, isLoading: isLoadingServices, refetch: _getServices } = useQuery({
  key: () => ['services'],
  query: () => getServices().then((response) => {
    searchForm.value.serviceId = response[0]?.gameId || ''
    return response
  }),
  enabled: false,
  initialData: () => [],
})

const { data: searchFormCodes, isLoading: isLoadingInquiryCodes } = useQuery({
  key: () => ['inquiries', 'codes'],
  query: () => getCommonCodes().then((data) => {
    searchForm.value.searchType = data.reportSearchTypes[0]!.code
    searchForm.value.timePeriod = data.reportDatePeriodTypes[0]!.code

    return data
  }),
  initialData: () => ({
    reportTypes: [],
    reportStatuses: [],
    reportSearchTypes: [],
    reportRelayStatus: [],
    reportDatePeriodTypes: [],
  }),
})

const isInitialized = shallowRef(false)
;(async function init() {
  await _getServices()
  // parse query from url
  const query = snakeToCamelKeys(route.query as Record<string, string>)

  // check if it is redirected from other page
  if (!query.page) {
    isInitialized.value = true
    return
  }

  // set search form value based on query params
  Object.assign(searchForm.value, pick(query, Object.keys(defaultSearchForm)))

  if (query.activeTab) activeTab.value = Number(query.activeTab) as any
  if (query.showMore) showMore.value = query.showMore === 'true'
  if (query.sortType) sortType.value = query.sortType as any
  if (query.page) currentPage.value = Number(query.page)
  if (query.pageSize) pageSize.value = Number(query.pageSize)
  appliedSearchForm.value = cloneDeep(searchForm.value)
  isInitialized.value = true

  // enable fetch data
  hasSearchFormSubmitted.value = true
})()

provideProductsRootContext({
  activeTab,
  defaultSearchForm,
  searchForm,
  appliedSearchForm,
  hasSearchFormSubmitted,
  services,
  isLoadingServices,
  isInitialized,
  selectedItems,
  data,
  searchFormCodes,
  isLoading,
  isLoadingInquiryCodes,
  sortType,
  showMore,
  pageSize,
  currentPage,
  refetch,
})
</script>

<template>
  <main class="h-full flex flex-col px-4 pb-8">
    <Tabs v-slot="{ activeItem }" :value="activeTab">
      <TabList class="border-b border-abd">
        <div
          :style="{
            width: `${activeItem.size}px`,
            transform: `translateX(${activeItem.position}px)`,
          }"
          class="absolute bottom-0 left-0 h-0.5 rounded-full bg-primary transition-[width,transform] duration-300"
        />
        <Tab :value="TAB.MY_INQUIRIES" @click="handleSelectTab(TAB.MY_INQUIRIES)">
          {{ t('report_inquiry_management_list.my_inquiries') }}
        </Tab>
        <Tab :value="TAB.ALL_INQUIRIES" @click="handleSelectTab(TAB.ALL_INQUIRIES)">
          {{ t('report_inquiry_management_list.all_inquiries') }}
        </Tab>
      </TabList>
    </Tabs>
    <!-- search form -->
    <SearchForm class="mt-4" />
    <!-- search form actions -->
    <ListActions />
  </main>
</template>
