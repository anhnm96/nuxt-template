<script setup lang="ts">
import dayjs from 'dayjs/esm'
import { DatePicker } from 'primevue'

type DatePickerViewMode = 'date' | 'month' | 'year' | 'quarter'
type UpdateEventParams = {} & { startDate?: Date, endDate?: Date, isUnlimited?: boolean }

const props = withDefaults(defineProps<{
  view?: DatePickerViewMode
  startDate?: Date
  endDate?: Date
  autoProcessDate?: boolean
  shouldSkipInvalid?: boolean
  unlimitedLabel?: string
  disabled?: boolean
  showUnlimitedCheckbox?: boolean
  showTime?: boolean
  minDate?: Date
  maxDate?: Date
}>(), { autoProcessDate: true, unlimitedLabel: 'Unlimited' })

const emit = defineEmits<{
  'update:startDate': [v?: Date]
  'update:endDate': [v?: Date]
  'update': [v: UpdateEventParams]
  'invalid': [v: InvalidEventParams]
  'show': [isEndDate?: boolean]
  'hide': [isEndDate?: boolean]
  'update:isUnlimited': [v: boolean]
}>()
const { t } = useI18n()
const DATE_UNLIMITED_YEAR = 9999
const TIME_UNLIMITED = `${DATE_UNLIMITED_YEAR}-12-31 23:59:59`

let shouldSkipInvalid = false
let internalLastEndDate: Date | undefined = props.endDate ? new Date(props.endDate.getTime()) : new Date()
const isUnlimited = ref(props.endDate && props.endDate.getFullYear() === (DATE_UNLIMITED_YEAR)) // @TODO

const isValid = computed(() => {
  if (!(props.startDate && props.endDate)) {
    return null
  }

  return compareDates(props.startDate, props.endDate) <= 0
})

const searchFormValue = ref({
  periodType: 'date' as DatePickerViewMode,
  startDate: dayjs().add(-6, 'day').startOf('day').toDate(),
  endDate: dayjs().endOf('day').toDate(),
})
// #region date range picker
const periodTypes = computed(() => {
  return [
    { value: 'date', label: `${t('filter.day')} (DAY)` },
    { value: 'month', label: `${t('filter.month')} (MONTH)` },
    { value: 'quarter', label: `${t('filter.quarter')} (QUARTER)` },
    { value: 'year', label: `${t('filter.year')} (YEAR)` },
  ]
})

const presetOptions = computed(() => {
  const currentDate = dayjs()

  if (searchFormValue.value.periodType === 'date') {
    return [1, 7, 30, 90, 180].map(count => ({
      value: `last_${count}_day`,
      label: t('datepicker.day_no', { count }),
    }))
  }

  if (searchFormValue.value.periodType === 'month') {
    return [1, 2, 3, 4].map(no => ({
      value: `previous_${no}_month`,
      label: JSON.parse(t('datepicker.month_names_short'))[currentDate.subtract(no - 1, 'month').month()],
    }))
  }

  if (searchFormValue.value.periodType === 'quarter') {
    return [1, 2, 3, 4].map(no => ({
      value: `previous_${no}_quarter`,
      label: t('datepicker.quarter_no', { no: currentDate.subtract(no - 1, 'quarter').quarter() }),
    }))
  }

  if (searchFormValue.value.periodType === 'year') {
    return [1, 2, 3, 4].map(no => ({
      value: `previous_${no}_year`,
      label: t('datepicker.year_no', { no: currentDate.subtract(no - 1, 'year').year() }),
    }))
  }

  return []
})

// init start date and end date when period type changed
function handleUpdatePeriodType(newValue: DatePickerViewMode) {
  searchFormValue.value.periodType = newValue

  if (newValue === 'date') {
    handleUpdateStartDate(dayjs().add(-6, 'day').startOf('day').toDate())
    handleUpdateEndDate(dayjs().endOf('day').toDate())
  } else {
    const { startDate, endDate } = getPresetDate?.(presetOptions.value[0]!.value) || {}
    handleUpdateStartDate(startDate)
    handleUpdateEndDate(endDate)
  }
}

function processDate(date: Date | number | null, isEndDate?: boolean): Date | undefined {
  switch (searchFormValue.value.periodType) {
    case 'month':
      return roundDate(date, 'month', isEndDate)
    case 'quarter':
      return roundDate(date, 'quarter', isEndDate)
    case 'year':
      return roundDate(date, 'year', isEndDate)
    default:
      return roundDate(date, 'day', isEndDate)
  }
}

type ShowTooltipOptions = {} & {
  content?: string
  theme?: 'light' | 'error'
  duration?: number
  placement?: any // Placement;
}
type ShowTooltipFn = (tooltipOptions: ShowTooltipOptions, isEndDate?: boolean) => void
type InvalidEventParams = {} & { type: string, isEndDate?: boolean, showTooltip: ShowTooltipFn }
function handleDateInvalid(event: InvalidEventParams) {
  const message = event.isEndDate ? t('game_management_list.invalid_enddate') : t('game_management_list.invalid_startdate')

  event.showTooltip({ content: message }, event.isEndDate)
}
// #endregion date range picker

const DATE_RANGE_INVALID_TYPE = {
  START_DATE: 'START_DATE',
  END_DATE: 'END_DATE',
} as const

const dateFormat = computed(() => {
  if (searchFormValue.value.periodType === 'quarter' || searchFormValue.value.periodType === 'year') {
    return CALENDAR_DATE_WITH_YEAR_FORMAT
  }

  if (searchFormValue.value.periodType === 'month') {
    return CALENDAR_DATE_WITH_MONTH_FORMAT
  }

  return CALENDAR_DATE_FORMAT
})

const placeholder = computed(() => {
  if (searchFormValue.value.periodType === 'year') {
    return DATE_WITH_YEAR_PLACEHOLDER
  }

  if (searchFormValue.value.periodType === 'quarter') {
    return DATE_WITH_QUARTER_PLACEHOLDER
  }

  if (searchFormValue.value.periodType === 'month') {
    return DATE_WITH_MONTH_PLACEHOLDER
  }

  if (props.showTime) {
    return CALENDAR_DATE_TIME_PLACEHOLDER
  }

  return CALENDAR_DATE_PLACEHOLDER
})

function handleUpdateStartDate(date?: Date, shouldAlsoEmitUpdateEvent = true) {
  if (!date) {
    emit('update:startDate', date)

    return
  }

  let newStartDate: Date | undefined = new Date(date.getTime())

  // process date
  if (props.autoProcessDate) {
    newStartDate = processDate(newStartDate)
  }

  // emit update startDate
  emit('update:startDate', newStartDate)

  // emit update
  if (shouldAlsoEmitUpdateEvent) {
    handleUpdate(newStartDate)
  }

  // start date is after end date
  if (!shouldSkipInvalid && compareDates(newStartDate, props.endDate) > 0) {
    emit('invalid', { type: DATE_RANGE_INVALID_TYPE.START_DATE, showTooltip })
  }
}

function handleUpdateEndDate(date?: Date, shouldAlsoEmitUpdateEvent = true) {
  if (!date) {
    emit('update:endDate', date)

    return
  }

  let newEndDate: Date | undefined = new Date(date.getTime())

  // process date
  if (props.autoProcessDate) {
    newEndDate = processDate(newEndDate, true)
  }

  // emit update endDate
  emit('update:endDate', newEndDate)

  // emit update
  if (shouldAlsoEmitUpdateEvent) {
    handleUpdate(newEndDate, true)
  }

  // end date is before start date
  if (!shouldSkipInvalid && compareDates(props.startDate, newEndDate) > 0) {
    emit('invalid', { type: DATE_RANGE_INVALID_TYPE.END_DATE, isEndDate: true, showTooltip })
  }
}

function handleSetPresetDate(option: { value: string, label: string }) {
  const { startDate, endDate } = getPresetDate(option.value) || {}

  handleUpdateStartDate(startDate, false)
  handleUpdateEndDate(endDate, true)
}

function handleToggleUnlimited(value: boolean) {
  if (value) {
    internalLastEndDate = props.endDate || internalLastEndDate
    isUnlimited.value = true
    const unlimitedDate = new Date(TIME_UNLIMITED)

    emit('update:isUnlimited', true)
    handleUpdateEndDate(unlimitedDate)

    return
  }

  if (props.startDate && compareDates(props.startDate, internalLastEndDate) > 0) {
    internalLastEndDate = new Date(props.startDate.getTime())
  }

  isUnlimited.value = false

  emit('update:isUnlimited', false)
  handleUpdateEndDate(internalLastEndDate)
}

function handleUpdate(date?: Date, isEndDate?: boolean) {
  const startDate = isEndDate ? props.startDate : date
  const endDate = isEndDate ? date : props.endDate

  emit('update', {
    startDate,
    endDate,
    isUnlimited: isUnlimited.value,
  })
}

function showTooltip(tooltipOptions: ShowTooltipOptions, isEndDate?: boolean) {
  // const datePickerElRef = isEndDate ? endDateRef : startDateRef;

  // datePickerElRef.value?.showTooltip(tooltipOptions);
}

function validate() {
  // valid
  if (isValid.value) {
    return true
  }

  // end date before start date
  if (isValid.value === false) {
    showTooltip({
      content: t('error.end_date_before_start_date'),
    }, true)

    return false
  }

  // start date or end date is empty
  showTooltip({
    content: t('error.required'),
  }, !!props.startDate)

  return false
}

// hide tooltip when view is changed
watch(() => props.view, async () => {
  shouldSkipInvalid = true
  await nextTick()
  shouldSkipInvalid = false
})

function setUnlimitedValue(value: boolean) {
  isUnlimited.value = value
}

defineExpose({
  isValid,
  startDate: computed(() => props.startDate),
  endDate: computed(() => props.endDate),

  showTooltip,
  setUnlimitedValue,
  validate,
})
</script>

<template>
  <div>
    <!-- period type -->
    <div class="w-50 flex flex-col gap-1">
      <Label for="period_type">
        {{ t('game_management_list.period_type') }}
      </Label>
      <Select
        :model-value="searchFormValue.periodType"
        label-id="period_type"
        option-label="label"
        option-value="value"
        :scroll-height="periodTypes.length > 6 ? '18.5rem' : '19rem'"
        :options="periodTypes"
        @update:model-value="handleUpdatePeriodType"
      />
    </div>
    <template v-if="searchFormValue.periodType !== 'quarter'">
      <!-- start date -->
      <DatePicker
        :model-value="startDate"
        :view="searchFormValue.periodType"
        :date-format
        :placeholder
        :disabled :min-date :max-date
        @update:model-value="handleUpdateStartDate($event as Date | undefined)"
      />
      <!-- end date -->
      <DatePicker
        :model-value="endDate"
        :date-format
        :view="searchFormValue.periodType"
        :placeholder
        :disabled="disabled || (isUnlimited && showUnlimitedCheckbox)" :min-date :max-date
        @update:model-value="handleUpdateEndDate($event as Date | undefined)"
      />
    </template>
    <template v-else>
      <QuarterPicker
        :model-value="startDate" :min-date :max-date :placeholder
        :disabled
        @update:model-value="handleUpdateStartDate($event as Date)"
      />
      <QuarterPicker
        :model-value="endDate" :min-date :max-date :placeholder
        :disabled="disabled || (isUnlimited && showUnlimitedCheckbox)"
        @update:model-value="handleUpdateEndDate($event as Date)"
      />
    </template>

    <!-- unlimited checkbox -->
    <slot v-if="showUnlimitedCheckbox" name="unlimited-toggle">
      <Checkbox
        :model-value="isUnlimited"
        :disabled
        :label="unlimitedLabel"
        @update:model-value="handleToggleUnlimited"
      />
    </slot>

    <div class="flex gap-2">
      <button
        v-for="option in presetOptions"
        :key="option.value"
        class="btn btn-outline whitespace-nowrap"
        @click="handleSetPresetDate(option)"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>
