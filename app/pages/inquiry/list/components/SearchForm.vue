<script setup lang="ts">
import type { StatusDetail } from '../types'
import { cloneDeep } from 'lodash-es'
import Button from '~/components/Button.vue'
import { getServiceLanguages } from '~/services/inquiries'
import { REPORT_INQUIRY_CATEGORY_OPTIONS, REPORT_INQUIRY_OPTION_ALL } from '../constants'
import { injectProductsRootContext } from '../index.vue'

const { t } = useI18n()
const id = useId()
const {
  defaultSearchForm,
  searchForm,
  appliedSearchForm,
  hasSearchFormSubmitted,
  services,
  isLoadingServices,
  searchFormCodes,
  showMore,
  isLoading: isLoadingList,
  isLoadingInquiryCodes,
  refetch,
} = injectProductsRootContext()!
const maxlength = {
  keyword: 100,
}

function submitSearchForm() {
  truncateFields(searchForm.value, maxlength)
  appliedSearchForm.value = cloneDeep(searchForm.value)
  hasSearchFormSubmitted.value = true
  refetch()
}

function resetSearchForm() {
  searchForm.value = cloneDeep(defaultSearchForm)
  searchForm.value.serviceId = services.value?.[0]?.gameId || ''
}

const categoryOptions = [{ code: REPORT_INQUIRY_OPTION_ALL, name: t('all') }]
  .concat(Object.entries(REPORT_INQUIRY_CATEGORY_OPTIONS)
    .map(([key, value]) => ({
      code: value,
      name: t(`report_inquiry_management_list.search_form.${key.toLowerCase()}`),
    })))

const statusOptions = computed(() => {
  const result = [{ code: 'all', name: t('all') }]

  if (searchFormCodes.value?.reportStatuses) {
    result.push(...searchFormCodes.value?.reportStatuses)
  }

  return result
})

// #region detail status
// map status to its detail status
const statusToDetailStatusMap = computed(() => {
  if (!searchFormCodes.value?.reportStatuses?.length) {
    return []
  }

  return searchFormCodes.value?.reportStatuses.reduce<Record<string, StatusDetail[]>>((acc, item) => {
    if (item.statusDetails.length > 0) {
      acc[item.code] = [...item.statusDetails]
    }

    return acc
  }, {})
})
const detailStatusOptions = computed(() => {
  const result: StatusDetail[] = []

  for (const status of Object.keys(statusToDetailStatusMap.value)) {
    if (searchForm.value.status !== status) {
      continue
    }

    const detailStatus = statusToDetailStatusMap.value[status as keyof typeof statusToDetailStatusMap.value] as StatusDetail[]

    // if detail status does not have reportTypeId, it means it is a common status
    if (!detailStatus?.[0]?.reportTypeId) {
      result.push(...detailStatus)
    } else {
      if (searchForm.value.category === 'all') {
        result.push(...detailStatus)
      } else {
        result.push(...detailStatus.filter(i => i.reportTypeId === searchForm.value.category))
      }
    }
  }

  return result
})

watch(detailStatusOptions, (newValue, oldValue) => {
  const codes = newValue.map(item => item.code)

  // init detail status on first mounted if it is empty
  if (oldValue?.length === 0) {
    if (searchForm.value.detailStatus.length === 0 || !searchForm.value.detailStatus.every(item => codes.includes(item))) {
      searchForm.value.detailStatus = codes
    }
  } else if (newValue) {
    // auto select all when detail list changed
    searchForm.value.detailStatus = codes
  }
})

// label for detail status tooltip
const selectedDetailStatusLabels = computed(() => {
  if (searchForm.value.detailStatus.length === 0) return ''
  return searchForm.value.detailStatus.length === detailStatusOptions.value.length
    ? t('all')
    : searchForm.value.detailStatus
      ?.map(status => detailStatusOptions.value.find(item => item.code === status)?.name)
      .join(', ')
})
// #endregion detail status

// #region language
const { data: languageOptions, isLoading: isLoadingServiceLanguages, refresh: _getServiceLanguages } = useQuery({
  key: () => ['services', searchForm.value.serviceId, 'languages'],
  query: () => getServiceLanguages(searchForm.value.serviceId),
  initialData: () => [],
  enabled: false,
})

watch(() => searchForm.value.serviceId, async (newValue, oldValue) => {
  await _getServiceLanguages()
  const languageCodes = languageOptions.value.map(item => item.code)
  // init language on first mounted if it is empty
  if (!oldValue) {
    if (searchForm.value.language.length === 0 || !searchForm.value.language.every(item => languageCodes.includes(item))) {
      searchForm.value.language = languageCodes
    }
  } else if (newValue) {
    // auto select all when serviceId changed
    searchForm.value.language = languageCodes
  }
})
// #endregion language

// relay options
const relayOptions = computed(() => {
  return searchFormCodes.value.reportRelayStatus.reduce((acc, item) => {
    acc.push({ name: item.code, code: item.code })
    return acc
  }, [{ name: t('all'), code: REPORT_INQUIRY_OPTION_ALL }])
})
</script>

<template>
  <div class="@container">
    <!-- main search form -->
    <div class="relative flex flex-wrap gap-2 border border-abd rounded-md bg-abg p-4 @5xl:flex-nowrap">
      <!-- form fields -->
      <div class="flex-grow">
        <!-- row 1 -->
        <div class="flex flex-wrap gap-1">
          <!-- service -->
          <div class="w-50 flex flex-col gap-1">
            <Label :for="`select_game-${id}`">
              {{ t('game_dialog.game_name') }}
            </Label>
            <Select
              v-model="searchForm.serviceId"
              :label-id="`select_game-${id}`"
              option-label="gameName"
              option-value="gameId"
              :placeholder="t('game_dialog.placeholder_select')"
              :reset-filter-on-hide="false"
              :options="services"
              :filter="services.length > 6"
              :loading="isLoadingServices"
            />
          </div>
          <!-- category -->
          <div class="w-50 flex flex-col gap-1">
            <Label :for="`category-${id}`">
              {{ t('report_inquiry_management_list.search_form.category') }}
            </Label>
            <Select
              v-model="searchForm.category"
              :label-id="`category-${id}`"
              option-label="name"
              option-value="code"
              :placeholder="t('game_dialog.placeholder_select')"
              :reset-filter-on-hide="false"
              :options="categoryOptions"
            />
          </div>
          <!-- status -->
          <div class="w-50 flex flex-col gap-1">
            <Label :for="`status-${id}`">
              {{ t('report_inquiry_management_list.search_form.status') }}
            </Label>
            <Select
              v-model="searchForm.status"
              :input-id="`status-${id}`"
              option-label="name"
              option-value="code"
              class="w-50"
              :placeholder="t('game_dialog.placeholder_select')"
              :reset-filter-on-hide="false"
              :options="statusOptions"
              :filter="searchFormCodes.reportStatuses.length > 6"
              :loading="isLoadingInquiryCodes"
            />
          </div>
          <!-- detail status -->
          <div class="w-50 flex flex-col gap-1">
            <Label :for="`detailStatus-${id}`">
              {{ t('report_inquiry_management_list.search_form.detail_status') }}
            </Label>
            <div>
              <MultiSelect
                v-model="searchForm.detailStatus"
                :input-id="`detailStatus-${id}`"
                option-label="name"
                option-value="code"
                class="w-50"
                :placeholder="detailStatusOptions.length === 0 ? '-' : t('game_dialog.placeholder_select')"
                :reset-filter-on-hide="false"
                :selected-items-label="t('all')"
                :max-selected-labels="detailStatusOptions.length - 1"
                :options="detailStatusOptions"
                :filter="detailStatusOptions.length > 6"
                :show-toggle-all="detailStatusOptions.length > 6"
                :pt="{ label: 'block' }"
                :loading="isLoadingInquiryCodes"
              />
              <Tooltip v-if="selectedDetailStatusLabels">
                {{ selectedDetailStatusLabels }}
              </Tooltip>
            </div>
          </div>
        </div>
        <!-- row 2 -->
        <div class="mt-4 flex flex-wrap gap-1">
          <!-- time period -->
          <div class="w-50 flex flex-col gap-1">
            <Label :for="`timePeriod-${id}`">
              {{ t('report_inquiry_management_list.search_form.time_period') }}
            </Label>
            <Select
              v-model="searchForm.timePeriod"
              :label-id="`timePeriod-${id}`"
              option-label="name"
              option-value="code"
              :placeholder="t('game_dialog.placeholder_select')"
              :reset-filter-on-hide="false"
              :options="searchFormCodes.reportDatePeriodTypes"
              :scroll-height="searchFormCodes.reportDatePeriodTypes.length > 6 ? '18.5rem' : '19rem'"
              :filter="searchFormCodes.reportDatePeriodTypes.length > 6"
              :loading="isLoadingInquiryCodes"
            />
          </div>
          <div class="flex gap-1">
            <!-- search type -->
            <div class="w-50 flex flex-col gap-1">
              <Label :for="`searchType-${id}`">
                {{ t('report_inquiry_management_list.search_form.search_type') }}
              </Label>
              <Select
                v-model="searchForm.searchType"
                :label-id="`searchType-${id}`"
                option-label="name"
                option-value="code"
                :placeholder="t('game_dialog.placeholder_select')"
                :reset-filter-on-hide="false"
                :options="searchFormCodes.reportSearchTypes"
                :scroll-height="searchFormCodes.reportSearchTypes.length > 6 ? '18.5rem' : '19rem'"
                :filter="searchFormCodes.reportSearchTypes.length > 6"
                :loading="isLoadingInquiryCodes"
              />
            </div>

            <!-- keyword search -->
            <div class="flex flex-grow flex-col gap-1">
              <div class="flex items-center gap-1">
                <Label :for="`keyword-${id}`">
                  {{ t('report_inquiry_management_list.search_form.keyword') }}
                </Label>
              </div>
              <div class="flex items-end gap-1 @5xl:flex-nowrap">
                <!-- keyword input -->
                <InputWrapper
                  v-model="searchForm.keyword"
                  class="max-w-150 min-w-50 w-full"
                >
                  <input
                    :id="`keyword-${id}`"
                    v-model="searchForm.keyword"
                    type="text"
                    class="inputtext w-full"
                    :placeholder="t('placeholder.max_length_count', { length: maxlength.keyword })"
                    :class="{ invalid: searchForm.keyword.length > maxlength.keyword }"
                    @keypress.enter="submitSearchForm"
                  >
                </InputWrapper>
                <!-- characters counter -->
                <CharacterCounter :value="searchForm.keyword" :max-length="maxlength.keyword" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- form actions -->
      <div class="flex items-center gap-1">
        <!-- refresh -->
        <button
          class="btn btn-icon btn-outline"
          @click="resetSearchForm"
        >
          <Icon name="mdi:refresh" />
        </button>
        <!-- submit -->
        <Button
          class="btn-icon btn-primary"
          :loading="isLoadingList"
          :disabled="isLoadingServices"
          @click="submitSearchForm"
        >
          <Icon name="tabler:search" />
        </Button>
        <!-- expand -->
        <Button
          class="absolute bottom-2 right-0 btn-link"
          :label="showMore ? t('game_management_list.hide') : t('game_management_list.show_more')"
          :icon="{ name: 'tabler:chevron-down', class: ['transition-transform', showMore ? 'rotate-180' : ''] }"
          @click="showMore = !showMore"
        />
      </div>
    </div>
    <!-- row 3 -->
    <div
      v-if="showMore"
      class="mt-2 flex flex-wrap gap-4 border border-abd rounded-md bg-abg p-4"
    >
      <!-- language -->
      <div class="w-50 flex flex-col gap-1">
        <Label :for="`language-${id}`">
          {{ t('report_inquiry_management_list.search_form.language') }}
        </Label>
        <MultiSelect
          v-model="searchForm.language"
          :input-id="`language-${id}`"
          option-label="name"
          option-value="code"
          :placeholder="t('game_dialog.placeholder_select')"
          :reset-filter-on-hide="false"
          :selected-items-label="t('all')"
          :max-selected-labels="languageOptions.length - 1"
          :options="languageOptions"
          :filter="languageOptions.length > 6"
          :show-toggle-all="languageOptions.length > 6"
          :pt="{ label: 'block' }"
          :loading="isLoadingServiceLanguages"
        />
      </div>
      <!-- relay -->
      <div class="w-50 flex flex-col gap-1">
        <Label :for="`relay-${id}`">
          {{ t('report_inquiry_management_list.search_form.relay') }}
        </Label>
        <Select
          v-model="searchForm.relay"
          :label-id="`relay-${id}`"
          option-label="name"
          option-value="code"
          :placeholder="t('game_dialog.placeholder_select')"
          :reset-filter-on-hide="false"
          :options="relayOptions"
          :loading="isLoadingInquiryCodes"
        />
      </div>
    </div>
  </div>
</template>
