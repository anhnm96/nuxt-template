<script setup lang="ts">
import type { FactoryOpts } from 'imask'
import type { CalendarLabels } from '~/components/base/calendar/useCalendar'
import type { CalendarPeriod } from '~/components/base/calendar/utils'
import { MaskedRange } from 'imask'
import Calendar from '~/components/base/calendar/Calendar.vue'
import Dropdown from '~/components/base/dropdown/Dropdown.vue'
import MaskedInput from './MaskedInput.vue'

/**
 * A date input. It shows a masked text field above a `Calendar`, for the `period` you set.
 *
 * `base/calendar/DESIGN.md` describes this wrapper as step two. The Calendar supplies the
 * grid. `Dropdown` supplies the open behaviour, the position, the click-outside behaviour
 * and the focus restore. A control does not supply them. This component replaces PrimeVue's
 * `DatePicker` for every period.
 *
 * This component has no time support. `Calendar` has no time support, and `granularity` is
 * reserved for `Calendar` in the react-aria sense. A `showTime` prop here would do nothing.
 */
const props = withDefaults(defineProps<{
  period?: CalendarPeriod
  minDate?: Date
  maxDate?: Date
  placeholder?: string
  disabled?: boolean
}>(), { period: 'date' })

/** The first day of the period. `Calendar` emits the same value. See ADR-0008. */
const modelValue = defineModel<Date | undefined>()

const { t } = useI18n()
const isOpen = ref(false)
const calendarRef = useTemplateRef('calendarRef')

const fieldId = useId()
/** Named so the field's `aria-controls` can point at the grid it opens. */
const calendarId = computed(() => `${fieldId}-calendar`)

/**
 * Focus moves into the grid only when the user presses `ArrowDown` or `ArrowUp`.
 *
 * The popover must not take focus from the field when it opens. The field is the primary
 * control. The mask stays usable while the popover is open. If the grid takes focus when the
 * popover opens, a user who clicked the field to type a date sends their keystrokes to the
 * grid. A screen-reader user also moves off the input that they just reached, with no
 * gesture of their own. This is the combobox contract: the popup is visible, DOM focus stays
 * on the input, and an explicit arrow key moves focus into the popup.
 *
 * This component handles the arrow keys. `Dropdown` does not handle them. Its own
 * `ArrowDown` opens the popover and then focuses the first focusable element in the popover.
 * That element is the « button in the header, not the roving cell. `manageKeyboard: false`
 * is the approved way to replace that behaviour. See ADR-0001, and the same method in
 * `Select`. It disables that one handler only. `Escape` continues to dismiss the popover,
 * because that handler runs before the gate. Thus this component controls the full hand-off.
 * It opens the popover if the popover is closed. Then it asks the Calendar for the cell that
 * must receive focus.
 */
async function handleFieldKeydown(event: KeyboardEvent) {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
  if (props.disabled) return

  // This stops two effects: the caret moves to the end of the mask, and the page scrolls.
  event.preventDefault()

  isOpen.value = true
  // Two ticks are necessary while the popover opens: one for the Teleport, one for Calendar.
  await nextTick()
  await nextTick()
  calendarRef.value?.focus()
}

/** `Calendar` uses `Date | null`. The date props in this app use `undefined`. */
const selected = computed<Date | null>({
  get: () => modelValue.value ?? null,
  set: value => (modelValue.value = value ?? undefined),
})

const labels = computed<Partial<CalendarLabels>>(() => ({
  quarters: [1, 2, 3, 4].map(no => t('datepicker.quarter_no', { no })) as
    [string, string, string, string],
}))

// #region mask
/**
 * The upper bound is 9999, not 2099. `DateRangePicker` writes "no end date" as the year
 * 9999. A mask that clamps to 2099 does more than show that year incorrectly.
 * `v-model:typed` writes the clamped value back. The model then becomes 2099, and
 * `isUnlimited` no longer recognises it. The previous quarter-only mask stopped at 2099
 * without this problem. The other periods used PrimeVue, which applied no year limit.
 */
const YEAR_BLOCK = { mask: MaskedRange, from: 1900, to: 9999 }
const S = DATE_SEPARATOR

/**
 * One entry for each period: how the user types the field, and how text and `Date` convert.
 *
 * `format` and `parse` are explicit. They do not use the built-in `Date` handling in imask.
 * Every period except `date` has a shape that imask does not know. imask has no quarter
 * mask. Also, the parsed value must land on the first day of the period, to match the value
 * that the Calendar emits.
 *
 * The code parses the text by hand. It does not use `dayjs(text, format, true)`. This app
 * does not load the `customParseFormat` plugin. Without that plugin, strict parsing falls
 * back to the lenient parser of `Date` and accepts invalid text.
 */
const MASKS: Record<CalendarPeriod, {
  pattern: string
  blocks: Record<string, unknown>
  format: (value: Date) => string
  parse: (text: string) => Date | undefined
}> = {
  date: {
    pattern: `Y${S}m${S}d`,
    blocks: {
      Y: YEAR_BLOCK,
      m: { mask: MaskedRange, from: 1, to: 12, maxLength: 2 },
      d: { mask: MaskedRange, from: 1, to: 31, maxLength: 2 },
    },
    format: value => $dayjs(value).format(`YYYY${S}MM${S}DD`),
    parse: (text) => {
      const [year, month, day] = text.split(S).map(Number)
      if (!(year && month && day)) return undefined
      const parsed = new Date(year, month - 1, day)
      // This rejects 2026.02.31. `new Date` changes that date to a date in March.
      const isReal = parsed.getFullYear() === year
        && parsed.getMonth() === month - 1
        && parsed.getDate() === day
      return isReal ? parsed : undefined
    },
  },
  month: {
    pattern: `Y${S}m`,
    blocks: { Y: YEAR_BLOCK, m: { mask: MaskedRange, from: 1, to: 12, maxLength: 2 } },
    format: value => $dayjs(value).format(`YYYY${S}MM`),
    parse: (text) => {
      const [year, month] = text.split(S).map(Number)
      if (!(year && month) || month > 12) return undefined
      return new Date(year, month - 1, 1)
    },
  },
  quarter: {
    pattern: `Y${S}Qn`,
    blocks: { Y: YEAR_BLOCK, n: { mask: MaskedRange, from: 1, to: 4 } },
    format: value => `${$dayjs(value).year()}${S}Q${$dayjs(value).quarter()}`,
    parse: (text) => {
      const [year, quarter] = text.split(`${S}Q`)
      const yearNo = Number(year)
      const quarterNo = Number(quarter)
      if (!yearNo || !quarterNo) return undefined
      return new Date(yearNo, (quarterNo - 1) * 3, 1)
    },
  },
  year: {
    pattern: 'Y',
    blocks: { Y: YEAR_BLOCK },
    format: value => String($dayjs(value).year()),
    parse: (text) => {
      const year = Number(text)
      if (!year) return undefined
      return new Date(year, 0, 1)
    },
  },
}

const maskOptions = computed<FactoryOpts>(() => {
  const config = MASKS[props.period]
  return {
    lazy: false,
    overwrite: true,
    autofix: true,
    mask: Date,
    /*
      There is no `min` or `max` here. This is deliberate. imask refuses the last character
      of a value that is outside those bounds. A valid but out-of-range value then shows as
      `2026.01.0_`. ADR-0007 is explicit: the component keeps such a value and shows it. The
      component does not correct it. Two better places already hold the bounds. The Calendar
      disables the cells, and the schema validates the value. The mask controls the shape of
      the input.

      `min` and `max` could not work reliably in any case. `MaskedInput` reads `maskOptions`
      one time only. A later change to `minDate` never reaches the mask.
    */
    pattern: config.pattern,
    blocks: config.blocks,
    format: (value: Date | null) => (value ? config.format(value) : ''),
    parse: config.parse,
  } as unknown as FactoryOpts
})

const maskedValue = computed(() =>
  (modelValue.value ? MASKS[props.period].format(modelValue.value) : ''))
// #endregion mask
</script>

<template>
  <Dropdown v-model:open="isOpen" :disabled :manage-keyboard="false">
    <!--
      The combobox roles, not just `aria-expanded`. `aria-expanded` is not supported on the
      implicit `textbox` role, so without `role="combobox"` a screen reader ignores it and
      the popup is never announced. `aria-haspopup` overrides the `"true"` (= menu) that
      `Dropdown` puts on every trigger: this popup is the Calendar's `role="grid"`.

      `aria-controls` only while the popover is up, because the id it names does not exist
      otherwise — the same reason `SelectControl` gates its own.
    -->
    <MaskedInput
      :id="fieldId"
      :key="period"
      v-model:typed="modelValue"
      :masked="maskedValue"
      role="combobox"
      aria-haspopup="grid"
      :aria-expanded="isOpen"
      :aria-controls="isOpen ? calendarId : undefined"
      :placeholder
      :disabled
      :mask-options
      @keydown="handleFieldKeydown"
    />
    <template #popover="{ toggleShow }">
      <!--
        The view that matches `period` is terminal. `Escape` therefore bubbles out of it and
        the Dropdown closes. A navigational panel consumes `Escape` to step back, and stops
        the propagation. See ADR-0005.
      -->
      <!--
        After focus is inside the popover, `Tab` cycles the tab ring of the popover: the six
        nav buttons and the one roving cell. Focus does not move to the page behind the open
        popup. The trap is inert while focus is still in the field, because its listener is
        on the Calendar. `Tab` from the field moves focus in the usual way.

        Use `.manual` because the default takes focus on mount. That default is correct for
        a modal dialog and incorrect here. The field must keep focus when the popover opens.
      -->
      <Calendar
        :id="calendarId"
        ref="calendarRef"
        v-model="selected"
        v-trap-focus.manual
        :period
        :min-date
        :max-date
        :disabled
        :labels
        @update:model-value="toggleShow(false)"
      />
    </template>
  </Dropdown>
</template>
