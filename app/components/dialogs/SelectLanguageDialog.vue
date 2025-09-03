<script lang="ts" setup>
import { intersection } from 'lodash-es'
import { DEFAULT_MAIN_LOCALE, DEFAULT_OTHER_LOCALE } from '~/constants/language-locales'
import Dialog from '../dialog/Dialog.vue'

export interface LocaleItem {
  code: string
  name: string
}

const props = withDefaults(defineProps<{
  title?: string
  confirmLabel?: string
  singleSelect?: boolean
  disabledValues?: string[]
  initialSelectedValues?: string[]
  initializeDataFn?: () => Promise<{
    mainLocaleItems: string[]
    otherLocaleItems: string[]
  }>
}>(), {
  initialSelectedValues: () => [],
  initializeDataFn: async () => {
    return {
      mainLocaleItems: DEFAULT_MAIN_LOCALE,
      otherLocaleItems: DEFAULT_OTHER_LOCALE,
    } as any
  },
})

const emit = defineEmits<{
  afterLeave: []
  close: [value?: { selectedValues: string[], newlySelectedValues: string[] }]
}>()

const { t } = useI18n()

const initialMainLocaleItems = ref<LocaleItem[]>([])
const initialOtherLocaleItems = ref<LocaleItem[]>([])
const selectedValues = ref([...props.initialSelectedValues])

const mainLocaleItems = computed(() => {
  return initialMainLocaleItems.value.map(item => ({
    ...item,
    disabled: getLocalItemDisablePropValue(item.code),
  }))
})

const otherLocaleItems = computed(() => {
  return initialOtherLocaleItems.value.map(item => ({
    ...item,
    disabled: getLocalItemDisablePropValue(item.code),
  }))
})

// values that are included in both initialSelectedValues and disabledValues
const defaultSelectedDisabledValues = computed(() => {
  return intersection(props.initialSelectedValues, props.disabledValues)
})

// values that can be selected on the dialog
const selectableValues = computed(() => {
  return [
    ...initialMainLocaleItems.value.map(i => i.code),
    ...initialOtherLocaleItems.value.map(i => i.code),
  ].filter(i => !getLocalItemDisablePropValue(i))
})

const isSelectedAll = computed(() => {
  return selectedValues.value.length === selectableValues.value.length + defaultSelectedDisabledValues.value.length
})

function getLocalItemDisablePropValue(code: string) {
  if (props.singleSelect && props.initialSelectedValues.includes(code)) {
    return true
  }

  if (props.disabledValues?.includes(code)) {
    return true
  }

  return false
}

function handleSelectedValuesChange(values: string[]) {
  if (!props.singleSelect) {
    selectedValues.value = values

    return
  }

  selectedValues.value = [...props.initialSelectedValues, values[values.length - 1]!]
}

async function handleSubmit() {
  emit('close', {
    selectedValues: selectedValues.value.slice(),
    newlySelectedValues: selectedValues.value.filter(v => !props.initialSelectedValues.includes(v)),
  })
}

function toggleSelectAll(value: boolean) {
  if (value) {
    selectedValues.value = [...defaultSelectedDisabledValues.value, ...selectableValues.value]
  } else {
    selectedValues.value = [...defaultSelectedDisabledValues.value]
  }
}

async function init() {
  const initResult = await props.initializeDataFn()

  if (initResult === null) {
    close()

    return
  }

  initialMainLocaleItems.value = initResult.mainLocaleItems.map(code => ({
    name: t(`language.${code}`),
    code,
  }))
  initialOtherLocaleItems.value = initResult.otherLocaleItems.map(code => ({
    name: t(`language.${code}`),
    code,
  }))

  return true
}

init()
</script>

<template>
  <Dialog
    v-slot="{ setClose }" persistent :title="t('language.set_language')"
    :pt="{ panel: { class: 'sm:max-w-4xl sm:w-full' } }"
    @after-leave="$emit('afterLeave')"
  >
    <!-- content -->
    <div class="p-4">
      <h3 class="font-medium">
        {{ t('language.featured_languages') }}
      </h3>

      <!-- main locale items -->
      <div class="mt-1 grid grid-cols-4 border-t border-l border-slate-200">
        <div
          v-for="localeItem in mainLocaleItems"
          :key="localeItem.code"
          class="flex items-center border-r border-b border-slate-200 p-4"
        >
          <Checkbox
            :model-value="selectedValues"
            :label="localeItem.name"
            :disabled="localeItem.disabled"
            :value="localeItem.code"
            @update:model-value="handleSelectedValuesChange"
          />
        </div>
        <!-- blank cells -->
        <template v-if="mainLocaleItems.length % 4">
          <div
            v-for="i in 4 - (mainLocaleItems.length % 4)"
            :key="`blank-${i}`"
            class="border-r border-b border-slate-200"
          />
        </template>
      </div>

      <h2 class="mt-4 font-medium">
        {{ t('language.other_languages') }}
      </h2>
      <!-- other locale items -->
      <div class="mt-1 grid grid-cols-4 border-t border-l border-slate-200">
        <div
          v-for="localeItem in otherLocaleItems"
          :key="localeItem.code"
          class="flex items-center border-r border-b border-slate-200 p-4"
        >
          <Checkbox
            :model-value="selectedValues"
            :disabled="localeItem.disabled"
            :value="localeItem.code"
            @update:model-value="handleSelectedValuesChange"
          >
            {{ localeItem.name }}
          </Checkbox>
        </div>
        <!-- blank cells -->
        <template v-if="otherLocaleItems.length % 4">
          <div
            v-for="i in 4 - (otherLocaleItems.length % 4)"
            :key="`blank-${i}`"
            class="border-r border-b border-slate-200"
          />
        </template>
      </div>

      <!-- select all checkbox -->
      <div v-if="!singleSelect" class="mt-4 flex items-center">
        <Checkbox
          :model-value="isSelectedAll"
          @update:model-value="toggleSelectAll"
        >
          {{ t('select_all') }}
        </Checkbox>
      </div>
    </div>
    <div class="p-4 pt-0 text-center">
      <button
        type="button"
        class="btn btn-primary min-w-btn"
        @click="setClose();handleSubmit()"
      >
        {{ confirmLabel || $t('confirm') }}
      </button>
    </div>
  </Dialog>
</template>
