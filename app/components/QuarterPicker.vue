<script setup lang="ts">
import dayjs from 'dayjs/esm'
import { MaskedRange } from 'imask'
import { DatePicker } from 'primevue'
import Dropdown from './Dropdown.vue'
import MaskedInput from './MaskedInput.vue'

const props = defineProps<{
  modelValue: Date | undefined
  minDate?: Date
  maxDate?: Date
  placeholder?: string
  shouldRoundToQuarterEnd?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [v: Date | undefined]
}>()

const elementPopupRef = ref()
const quarterSelectorRef = useTemplateRef('quarterSelectorRef')
const datePickerRef = useTemplateRef('datePickerRef')
// state
const selectedQuarter = ref<number>()
const selectedYearView = ref<number>(dayjs().year())

interface QuarterOption {
  label: string
  value: number
  disabled: boolean
  isSelected: boolean
  tabIndex: number
}

const { t } = useI18n()
const modelValue = defineModel<Date | undefined>()
const { minDate, maxDate } = toRefs(props)
const quarterOptions = computed<{
  value: number
  label: string
  disabled?: boolean
}[]>(() => [
  { label: t('datepicker.quarter_no', { no: 1 }), value: 1 },
  { label: t('datepicker.quarter_no', { no: 2 }), value: 2 },
  { label: t('datepicker.quarter_no', { no: 3 }), value: 3 },
  { label: t('datepicker.quarter_no', { no: 4 }), value: 4 },
])
// use to render quarter selector
const quarterForm = computed<QuarterOption[]>(() => {
  const result: QuarterOption[] = []
  let activeItemIndex: null | number = null

  quarterOptions.value.forEach((option, index) => {
    const dateFromQuarter = $dayjs().year(selectedYearView.value).quarter(option.value).startOf('quarter')
    const isSelected = !!modelValue.value
      && selectedYearView.value === $dayjs(modelValue.value).year()
      && dateFromQuarter.isSame($dayjs(modelValue.value).startOf('quarter'))

    const standardQuarterConfig: QuarterOption = {
      label: option.label,
      value: option.value,
      disabled: false,
      isSelected,
      tabIndex: -1,
    }

    const isForceDisableOption = option.disabled
    const isValidWithMinDate = !minDate.value || dateFromQuarter.isAfter(minDate.value)
    const isValidWithMaxDate = !maxDate.value || dateFromQuarter.endOf('day').isBefore(maxDate.value)

    if (isForceDisableOption || !isValidWithMinDate || !isValidWithMaxDate) {
      result.push({ ...standardQuarterConfig, disabled: true, isSelected: false })

      return
    }

    if (((activeItemIndex === undefined || activeItemIndex === null) && option.value === 1) || isSelected) {
      activeItemIndex = index
    }

    result.push(standardQuarterConfig)
  })

  // modify tab index
  if (activeItemIndex !== null && activeItemIndex !== undefined) {
    result[activeItemIndex]!.tabIndex = 0
  }

  return result
})

/**
 * Watch primevue datepicker's DOM mutation when user interact with it.
 * handle show/hide quarter selector when user change viewing year or month
 * and update state accordingly.
 */
useMutationObserver(datePickerRef, (mutatedItems) => {
  const yearBlockEl = mutatedItems[0]?.target as any
  const selectionBlockEl = mutatedItems[mutatedItems.length - 1]?.target as any

  const monthSelectorEl = selectionBlockEl?.querySelector('.p-datepicker-month-view')

  if (monthSelectorEl && monthSelectorEl.style.display !== 'none') {
    replacePrimeVueMonthSelectorWithQuarterSelector()

    return
  }

  // update state when change viewing year
  if (quarterSelectorRef.value?.style.display !== 'none') {
    const viewYearButton = yearBlockEl.querySelector('button[data-pc-group-section="view"]')

    selectedYearView.value = +(viewYearButton?.innerHTML) || dayjs(modelValue.value).year() // re-assign current year view
  }

  // hide quarter picker when year selector is shown
  if (selectionBlockEl?.querySelector('.p-datepicker-year-view')) {
    quarterSelectorRef.value!.style.display = 'none'
    quarterSelectorRef.value!.querySelectorAll<HTMLElement>('*').forEach((el: HTMLElement) => el.setAttribute('tabindex', '-1'))
  }
}, {
  childList: true,
  subtree: true,
})

/**
 * Replace primevue month selector with custom quarter selector
 */
function replacePrimeVueMonthSelectorWithQuarterSelector() {
  const primeVueMonthSelectorEl = datePickerRef.value!.$el?.querySelector('.p-datepicker-month-view')

  primeVueMonthSelectorEl.style.display = 'none'
  quarterSelectorRef.value!.style.display = 'flex'
  primeVueMonthSelectorEl.before(quarterSelectorRef.value) // use `before` to keep event listener
}

/**
 * When Primevue DatePicker mounted, replace the month selector with quarter selector instead
 */
function onInitQuarterPicker() {
  replacePrimeVueMonthSelectorWithQuarterSelector()

  if (!modelValue.value) {
    return
  }

  selectedYearView.value = dayjs(modelValue.value).year()
}

/**
 * Trigger when user select quarter
 * Calculate month correcponding to selected quarter then click it to trigger `update:modelValue` event of Primevue DatePicker
 *
 */
async function handleSelectQuarter(quarter: number) {
  selectedQuarter.value = quarter
  const firstMonthSelectionElement = datePickerRef.value?.$el.querySelectorAll('.p-datepicker-month-view .p-datepicker-month')[(quarter - 1) * 3]
  // trigger `update:modelValue` event of primevue DatePicker
  firstMonthSelectionElement?.click()
  // hide popup
  elementPopupRef.value?.toggleShow(false)
}

/**
 * Handle user keyboard event when focusing on quarter selector
 *
 */
function onKeydownQuarter(event: KeyboardEvent, focusingOption: QuarterOption) {
  const allQuartersSelectionEl = quarterSelectorRef.value?.querySelectorAll<HTMLElement>('*') || []
  const currentFocusIndex = Array.from(allQuartersSelectionEl).indexOf(document.activeElement as HTMLElement)
  let currentMovementElement: HTMLElement | null | undefined = null

  // selection
  if (event.code === 'Enter' || event.code === 'Space') {
    handleSelectQuarter(focusingOption.value)

    return
  }

  // movenent
  switch (event.code) {
    case 'Tab': // move to prevoius year button
      currentMovementElement = document.querySelector<HTMLElement>('.p-datepicker-prev-button')
      event.preventDefault()
      break

    case 'ArrowLeft': // move to item in the left side
      currentMovementElement = allQuartersSelectionEl[currentFocusIndex - 1]
      break

    case 'ArrowRight': // move to item in the right side
      currentMovementElement = allQuartersSelectionEl[currentFocusIndex + 1]
      break

    default:
      break
  }

  // focus on element
  if (currentMovementElement && !currentMovementElement.classList.contains('p-disabled')) {
    currentMovementElement.focus()
  }
}

function emitUpdateModelValue(date?: Date) {
  const newDate = date
    ? props.shouldRoundToQuarterEnd
      ? $dayjs(date).endOf('quarter').toDate()
      : $dayjs(date).startOf('quarter').toDate()
    : undefined

  console.log('emit', newDate)
  emit('update:modelValue', newDate)
}

/**
 * Primevue DatePicker's `update:modelValue` event handler
 */
function handleSelectDate(date: Date) {
  console.log('handleSelectDate', date)
  if (!selectedQuarter.value) {
    return
  }

  selectedYearView.value = dayjs(date).year()
  emitUpdateModelValue(date)
}

function transformDateToQuarter(date?: Date) {
  console.log('transform', date)
  if (!date) return ''
  const dayObj = $dayjs(date)
  return `${dayObj.year()}.Q${dayObj.quarter()}`
}

function extractMaskedInputValue(value: string) {
  console.log('extractMaskedInputValue')
  const [year, quarter] = value.split(`${DATE_SEPARATOR}Q`)

  if (!(year && quarter)) {
    return
  }

  const yearNo = Number.parseInt(year)
  const quarterNo = Number.parseInt(quarter)

  if (!(yearNo && quarterNo)) {
    return
  }

  return [yearNo, quarterNo]
}

/**
 * Whenever input value (mask input) is valid pattern, calculate corresponding date
 * and emit `update:modelValue` event
 */
// watch(() => elementRef.value?.maskedValue, (newValue) => {
// if (!newValue) {
//   emitUpdateModelValue(undefined)

//   return
// }

// const [year, quarter] = extractMaskedInputValue(newValue) || []

//   if (!(year && quarter)) {
//     return
//   }

//   selectedQuarter.value = quarter
//   selectedYearView.value = year

//   const dateFromYearAndQuarter = dayjs().year(year).quarter(quarter).startOf('quarter')

//   const isValidWithMinDate = !minDate.value || dateFromYearAndQuarter.isAfter(minDate.value)
//   const isValidWithMaxDate = !maxDate.value || dateFromYearAndQuarter.endOf('day').isBefore(maxDate.value)

//   if (
//     !dateFromYearAndQuarter.isValid()
//     || !isValidWithMinDate
//     || !isValidWithMaxDate
//   ) {
//     console.log('watch reflect')

//     return
//   }

//   emitUpdateModelValue(dateFromYearAndQuarter.toDate())
// })
const maskOptions = {
  lazy: false,
  overwrite: true,
  autofix: true,
  mask: Date,
  min: props.minDate,
  pattern: `Y${DATE_SEPARATOR}Qn`,
  blocks: {
    Y: {
      mask: MaskedRange,
      from: 1900,
      to: 2099,
    },
    n: {
      mask: MaskedRange,
      from: 1,
      to: 4,
    },
  },
  // define date -> str convertion
  format: transformDateToQuarter,
  // define str -> date convertion
  parse: (str: string) => {
    const [year, quarter] = extractMaskedInputValue(str) || []
    if (!(year && quarter)) {
      return
    }
    const dateFromYearAndQuarter = $dayjs().year(year).quarter(quarter).startOf('quarter')
    return dateFromYearAndQuarter.toDate()
  },
} as any

const maskedValue = computed(() => (transformDateToQuarter(modelValue.value)))

watch(() => props.minDate, (newValue) => {
  if (compareDates(newValue, modelValue.value) === 1) {
    if (props.shouldRoundToQuarterEnd) {
      modelValue.value = $dayjs(newValue).endOf('quarter').toDate()
    } else {
      modelValue.value = $dayjs(newValue).startOf('quarter').toDate()
    }
  }
})

watch(() => props.maxDate, (newValue) => {
  if (compareDates(modelValue.value, newValue) === 1) {
    if (props.shouldRoundToQuarterEnd) {
      modelValue.value = $dayjs(newValue).endOf('quarter').toDate()
    } else {
      modelValue.value = $dayjs(newValue).startOf('quarter').toDate()
    }
  }
})
</script>

<template>
  <Dropdown ref="elementPopupRef">
    <MaskedInput
      v-model:typed="modelValue"
      :masked="maskedValue"
      :aria-expanded="elementPopupRef?.isPopoverVisible"
      :placeholder
      :disabled
      :mask-options
    />
    <template #popover>
      <DatePicker
        ref="datePickerRef"
        :model-value="modelValue"
        :min-date="minDate"
        :max-date="maxDate"
        view="month"
        inline
        :disabled
        @update:model-value="handleSelectDate($event as Date)"
        @vue:mounted="onInitQuarterPicker"
      />
      <!-- Custom Quarter select -->
      <div ref="quarterSelectorRef" class="mt-2 flex gap-1">
        <template v-for="quarter in quarterForm" :key="quarter.value">
          <button
            class="p-datepicker-month w-1/4 min-w-10"
            :tabindex="quarter.tabIndex"
            :class="{
              'p-disabled': quarter.disabled,
              'p-datepicker-month-selected': quarter.isSelected,
            }"
            @click="handleSelectQuarter(quarter.value)"
            @keydown="onKeydownQuarter($event, quarter)"
          >
            Q{{ quarter.value }}
          </button>
        </template>
      </div>
    </template>
  </Dropdown>
</template>
