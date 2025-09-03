<script lang="ts" setup>
import { Accordion, AccordionContent, AccordionHeader, AccordionPanel, Tag } from 'primevue'
import Checkbox from '~/components/Checkbox.vue'
import Tab from '~/components/tab/Tab.vue'
import TabIndicator from '~/components/tab/TabIndicator.vue'
import TabList from '~/components/tab/TabList.vue'
import TabPanel from '~/components/tab/TabPanel.vue'
import TabPanels from '~/components/tab/TabPanels.vue'
import Tabs from '~/components/tab/Tabs.vue'
import Dialog from '../dialog/Dialog.vue'

const props = withDefaults(defineProps<{
  title?: string
  firstTabLabel?: string
  secondTabLabel?: string
  confirmLabel?: string
  defaultCountryLocales?: string[]
  disabledCountryCodes?: string[]
  readonly?: boolean
  shouldSelectAllAsDefault?: boolean
  isSelectAllCheckboxVisible?: boolean
  initializeDataFn?: () => Promise<{ regions: CommonRegion[], countries: CommonCountry[] }>
}>(), {
  initializeDataFn: async () => {
    const data = await import('~/constants/country-locales')

    return { regions: data.REGIONS, countries: data.COUNTRIES } as any
  },
  isSelectAllCheckboxVisible: true,
})
const emit = defineEmits<{
  afterLeave: []
  close: [value?: string[]]
}>()

interface CommonRegion {
  code: string
  seq: number
  countryCodes: string[]
}
type CountryCodeMap = any
type CommonOption = any
interface CommonCountry {
  seq: number
  code: string
  codeAlpha3: string
}

const id = useId()
const { t } = useI18n()
const ALL_COUNTRY_LOCALE = 'all'
const selectedCountryLocales = ref(props.defaultCountryLocales?.map(code => code.toUpperCase())?.slice() || [])
// selected individual country locale from selectbox
const individualSelectedCountryLocale = ref(ALL_COUNTRY_LOCALE)

const regionList = ref<CommonRegion[]>([])
const countryCodeMap = ref<CountryCodeMap>({})
const allCountryLocales = computed(() => Object.keys(countryCodeMap.value))
const regionsAccordionValue = ref<number[]>([])

// check/uncheck all countries of region
function handleSelectRegion(region: CommonRegion, isChecked: boolean) {
  const countriesCodeItems = region.countryCodes.filter(countryCode => !props.disabledCountryCodes?.includes(countryCode))

  if (!isChecked) {
    selectedCountryLocales.value = selectedCountryLocales.value.filter(
      (item: string) => !countriesCodeItems.includes(item),
    )

    return
  }

  selectedCountryLocales.value.push(
    ...countriesCodeItems.filter((item: string) => !selectedCountryLocales.value.includes(item)),
  )
}

// check/select all countries
function handleCheckAllCountries(isChecked: boolean) {
  if (isChecked) {
    regionList.value.forEach((region: CommonRegion) => {
      handleSelectRegion(region, true)
    })

    individualSelectedCountryLocale.value = ALL_COUNTRY_LOCALE

    return
  }

  const disabledCheckedCountryCodes = selectedCountryLocales.value.filter(
    (item: string) => props.disabledCountryCodes?.includes(item),
  )

  selectedCountryLocales.value = disabledCheckedCountryCodes
  individualSelectedCountryLocale.value = ALL_COUNTRY_LOCALE
}

function handleSelectCountry(countryCode: string, isChecked: boolean) {
  // add all countries
  if (countryCode === ALL_COUNTRY_LOCALE) {
    return handleCheckAllCountries(true)
  }

  const index = selectedCountryLocales.value.findIndex((item: string) => item === countryCode)

  if (index === -1) {
    if (isChecked) {
      selectedCountryLocales.value.push(countryCode)
      individualSelectedCountryLocale.value = ALL_COUNTRY_LOCALE
    }

    return
  }

  selectedCountryLocales.value.splice(index, 1)
}

const countryOptions = computed<CommonOption[]>(() => {
  const unSelectedCountryLocales = allCountryLocales.value.filter(
    (item: string) => !selectedCountryLocales.value.includes(item) && !props.disabledCountryCodes?.includes(item),
  )

  // case already checked all codes
  if (unSelectedCountryLocales.length === 0) {
    return []
  }

  // case no key is checked, or checked some of keys
  const filteredOption = [] as CommonOption[]

  for (const key of unSelectedCountryLocales) {
    const countryItem = countryCodeMap.value[key]

    if (countryItem) {
      filteredOption.push({
        value: countryItem.code,
        label: `${t(`country_${countryItem.code}`)} (${countryItem.code})`,
      })
    }
  }

  return [{ value: ALL_COUNTRY_LOCALE, label: t('all_countries') }, ...filteredOption]
})

const sortedSelectedCountryLocale = computed(() => {
  return selectedCountryLocales.value.slice().sort()
})

async function handleSubmit() {
  const result: string[] = []

  selectedCountryLocales.value.forEach((item: string) => {
    result.push(countryCodeMap.value[item]!.code)
  })

  emit('close', result)
}

function setDisplayCountries() {
  // update regionList
  const newRegionList = []

  for (const region of regionList.value) {
    const countryCodeItems = []

    if (region.countryCodes.some(code => selectedCountryLocales.value.includes(code))) {
      countryCodeItems.push(...region.countryCodes)
    }

    if (countryCodeItems.length > 0) {
      newRegionList.push({ ...region, countryCodeItems })
    }
  }

  regionList.value = newRegionList

  // update countryCodeMap
  const newCountryCodeMap = {} as CountryCodeMap

  for (const countryCode of allCountryLocales.value) {
    newCountryCodeMap[countryCode] = countryCodeMap.value[countryCode]!
  }

  countryCodeMap.value = newCountryCodeMap
}

async function init() {
  const initData = await props.initializeDataFn()
  regionList.value = initData.regions

  countryCodeMap.value = initData.countries.reduce((map: CountryCodeMap, obj: CommonCountry) => {
    map[obj.code] = obj

    return map
  }, {} as CountryCodeMap) || {}

  if (props.readonly) {
    setDisplayCountries()
  }

  // set accordion open by default
  regionsAccordionValue.value = regionList.value.map((_, index) => index)

  // is select all as default
  if (props.shouldSelectAllAsDefault && !props.defaultCountryLocales?.length) {
    handleCheckAllCountries(true)
  }
}

init()
</script>

<template>
  <Dialog
    v-slot="{ setClose }" persistent
    :title="$t('country_select.title')"
    :pt="{ panel: { class: 'sm:max-w-4xl sm:w-full' } }"
    @after-leave="$emit('afterLeave')"
  >
    <!-- content -->
    <Tabs value="0">
      <TabList class="mx-4 border-b border-abd">
        <TabIndicator />
        <Tab value="0">
          {{ firstTabLabel || $t('region_select') }}
        </Tab>
        <Tab value="1">
          {{ secondTabLabel || $t('select_individual_country') }}
        </Tab>
      </TabList>
      <TabPanels keep-alive class="mt-4">
        <!-- tab select region -->
        <TabPanel value="0">
          <div class="flex max-h-[50vh] flex-col overflow-y-auto px-4" :class="!readonly && isSelectAllCheckboxVisible ? 'h-91' : 'h-100'">
            <Accordion
              :value="regionsAccordionValue"
              multiple
              class="space-y-2"
            >
              <template #expandicon>
                <Icon class="text-lg" name="lucide:chevron-down" />
              </template>
              <template #collapseicon>
                <Icon class="rotate-180 text-lg" name="lucide:chevron-down" />
              </template>
              <AccordionPanel
                v-for="(region, index) in regionList"
                :key="region.code"
                :value="index"
              >
                <AccordionHeader>
                  <div class="flex items-center gap-1.5">
                    <!-- select all countries in region -->
                    <Checkbox
                      v-if="!readonly"
                      :model-value="isSubset(region.countryCodes.filter(i => !disabledCountryCodes?.includes(i)), selectedCountryLocales)"
                      :label="$t(`region_${region.code}`)"
                      @update:model-value="handleSelectRegion(region, $event)"
                    />
                    <!-- selected countries in region counter -->
                    <Badge
                      severity="primary"
                      :class="{ 'bg-slate-400': region.countryCodes.filter((item: string) =>
                        selectedCountryLocales.includes(item),
                      ).length <= 0 }"
                      :value="
                        `${region.countryCodes.filter((item: string) =>
                          selectedCountryLocales.includes(item),
                        ).length} / ${region.countryCodes.length} ${$t('country_select.counter_unit')}`
                      "
                    />
                  </div>
                </AccordionHeader>
                <AccordionContent>
                  <div class="flex flex-wrap gap-4">
                    <template v-for="countryCodeItem in region.countryCodes" :key="countryCodeItem">
                      <div
                        v-if="props.readonly && selectedCountryLocales.includes(countryCodeItem)"
                        class="flex items-center"
                      >
                        <label
                          :for="`${countryCodeItem}__${id}`"
                          class="ml-1.5"
                        >
                          <span>{{ $t(`country_${countryCodeItem}`) }}</span>
                          <span> ({{
                            countryCodeItem
                          }})</span>
                        </label>
                      </div>
                      <div
                        v-else-if="!readonly"
                        class="flex items-center"
                      >
                        <Checkbox
                          :model-value="selectedCountryLocales.includes(countryCodeItem)"
                          :disabled="disabledCountryCodes?.includes(countryCodeItem)"
                          @update:model-value="handleSelectCountry(countryCodeItem, $event)"
                        >
                          <div>
                            <span>{{ $t(`country_${countryCodeItem}`) }}</span>
                            <span> ({{
                              countryCodeItem
                            }})</span>
                          </div>
                        </Checkbox>
                      </div>
                    </template>
                  </div>
                </AccordionContent>
              </AccordionPanel>
            </Accordion>
          </div>
          <!-- select all countries -->
          <div v-if="!readonly && isSelectAllCheckboxVisible" class="flex h-9 items-end px-4">
            <Checkbox
              :model-value="selectedCountryLocales.length > 0
                && isSubset(allCountryLocales, selectedCountryLocales)"
              :label="$t('select_all')"
              @update:model-value="handleCheckAllCountries"
            />
          </div>
        </TabPanel>
        <!-- tab search invidual country -->
        <TabPanel value="1">
          <div class="h-100 max-h-[50vh] overflow-y-auto">
            <div v-if="!readonly" class="mb-4 flex gap-4 pl-4">
              <!-- individual country select -->
              <Select
                v-model="individualSelectedCountryLocale"
                reset-filter-on-hide filter
                option-label="label"
                option-value="value"
                placeholder=""
                class="w-full"
                :options="countryOptions"
                :scroll-height="countryOptions.length > 6 ? '18.5rem' : '19rem'"
                :empty-filter-message="$t('messages.no_search_data')"
                :empty-message="$t('messages.no_search_data')"
              />
              <!-- add button -->
              <Button
                :disabled="!individualSelectedCountryLocale || countryOptions.length === 0"
                class="btn-primary btn-lg mr-6 min-w-[100px]"
                @click="handleSelectCountry(individualSelectedCountryLocale, true)"
              >
                {{ $t('add') }}
              </Button>
            </div>
            <div class="flex flex-wrap gap-2 px-4">
              <!-- tag -->
              <Tag
                v-for="countryCode in sortedSelectedCountryLocale"
                :key="countryCode"
                class="inline-flex cursor-default items-center border border-slate-200 bg-slate-50 text-sm !font-normal hover:bg-slate-200/60"
                severity="secondary"
              >
                {{ $t(`country_${countryCode}`) + (countryCodeMap[countryCode]?.code ? ` (${countryCodeMap[countryCode]?.code})` : '') }}
                <Icon
                  v-if="!readonly && !disabledCountryCodes?.includes(countryCode)"
                  name="ph:x-bold"
                  class="ml-1 cursor-pointer"
                  @click.stop="handleSelectCountry(countryCode, false)"
                />
              </Tag>
            </div>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>
    <div class="p-4 text-center">
      <button
        v-if="!readonly"
        type="button"
        class="btn-primary btn min-w-btn"
        @click="setClose();handleSubmit()"
      >
        {{ confirmLabel || $t('register') }}
      </button>
    </div>
  </Dialog>
</template>
