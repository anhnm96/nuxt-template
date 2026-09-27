<script setup lang="ts" generic="M extends CalendarMode = 'single'">
import type { CalendarLabels, CalendarMode } from './useCalendar'
import type { WeekStartsOn } from './utils'
import defu from 'defu'
import CalendarDayGrid from './CalendarDayGrid.vue'
import CalendarHeader from './CalendarHeader.vue'
import CalendarMonthPanel from './CalendarMonthPanel.vue'
import CalendarYearPanel from './CalendarYearPanel.vue'
import { provideCalendarContext } from './context'
import { DEFAULT_CALENDAR_LABELS, useCalendar } from './useCalendar'
import { toMonthStart } from './utils'

/** What `v-model` carries. `mode` is a string prop, so no Boolean-casting trap — see ADR-0006. */
type CalendarModel<Mode extends CalendarMode> = Mode extends 'multiple' ? Date[] : MaybeNull<Date>

const props = withDefaults(defineProps<{
  /** `'single' | 'multiple'`. Widens to `'range'` later without breaking call sites. */
  mode?: M
  /**
   * The month whose grid is drawn. Omit it and Calendar owns it; pass `v-model:visibleMonth`
   * and the parent does — which also switches off the follow-the-model rule below.
   */
  visibleMonth?: Date
  /** BCP 47 tag. Defaults to the app's i18n locale when one is installed, else `'en'`. */
  locale?: string
  weekStartsOn?: WeekStartsOn
  /** Always draw 6 rows, so the grid does not change height as you page. */
  fixedWeeks?: boolean
  /**
   * Let the body shrink to whatever view is showing, instead of holding the day grid's
   * height. Opting in accepts a jump on drill-down: a month panel is 4 rows, not 6.
   */
  autoHeight?: boolean
  showWeekNumbers?: boolean
  /** Single mode only: re-clicking the selected day clears it instead of doing nothing. */
  deselectable?: boolean
  disabled?: boolean
  /** Inclusive, compared at day granularity — the time component is ignored. */
  minDate?: Date
  maxDate?: Date
  /** Unreachable: skipped by the keyboard entirely. */
  isDateDisabled?: (date: Date) => boolean
  /** Navigable and announced, but not selectable. Struck through. */
  isDateUnavailable?: (date: Date) => boolean
  labels?: Partial<CalendarLabels>
  id?: string
}>(), {
  mode: 'single' as never,
  weekStartsOn: 0,
  fixedWeeks: true,
  autoHeight: false,
  showWeekNumbers: false,
  deselectable: false,
  disabled: false,
})

const emit = defineEmits<{ 'update:visibleMonth': [value: Date] }>()

const model = defineModel<CalendarModel<M>>()

// `useId` must run during setup, not inside the computed that reads it.
const generatedId = useId()
const id = computed(() => props.id ?? generatedId)

/**
 * `locale` is a formatting context, not a display string: it drives weekday names, month
 * names and the header's year/month ordering all at once, and there is exactly one correct
 * value app-wide. Forgetting to pass it is invisible to an English-reading developer, so
 * Calendar resolves it rather than defaulting to English. The guard keeps the component
 * mountable without the i18n plugin — which `Calendar.spec.ts` relies on.
 */
const i18nLocale = (() => {
  try {
    return useI18n().locale
  } catch {
    return ref('en')
  }
})()

const locale = computed(() => props.locale ?? unref(i18nLocale) ?? 'en')

const labels = computed<CalendarLabels>(() =>
  defu(props.labels ?? {}, DEFAULT_CALENDAR_LABELS))

/**
 * Seeded from the first selected date, else today. `controlled` is derived from the *prop*
 * rather than from a `defineModel` ref: a local fallback would become defined the first
 * time we paged, and silently switch the follow rule off.
 */
function seedMonth(): Date {
  // `CalendarModel<M>` stays unresolved while `M` is generic, so widen before inspecting it.
  const value = model.value as Date | Date[] | null | undefined
  const first = Array.isArray(value) ? value[0] : value
  return toMonthStart(first ?? new Date())
}

const localVisibleMonth = ref(seedMonth())
const controlled = computed(() => props.visibleMonth !== undefined)

const visibleMonth = computed({
  get: () => props.visibleMonth ?? localVisibleMonth.value,
  set: (value: Date) => {
    localVisibleMonth.value = value
    emit('update:visibleMonth', value)
  },
})

const calendar = useCalendar({
  model,
  visibleMonth,
  followsModel: () => !controlled.value,
  // `withDefaults` cannot type a generic prop's default, so the fallback is restated here.
  mode: () => props.mode ?? 'single',
  locale,
  weekStartsOn: () => props.weekStartsOn,
  fixedWeeks: () => props.fixedWeeks,
  showWeekNumbers: () => props.showWeekNumbers,
  deselectable: () => props.deselectable,
  disabled: () => props.disabled,
  minDate: () => props.minDate,
  maxDate: () => props.maxDate,
  isDateDisabled: () => props.isDateDisabled,
  isDateUnavailable: () => props.isDateUnavailable,
  labels,
})

/**
 * `rowCount` tracks the visible month under `fixedWeeks: false`, so the pin follows the grid
 * instead of fighting it. The `1.25rem` is the weekday header row.
 */
const bodyStyle = computed(() => props.autoHeight
  ? undefined
  : { minHeight: `calc(${calendar.rowCount.value} * var(--calendar-cell) + 1.25rem)` })

provideCalendarContext({
  calendar,
  labels,
  id,
  disabled: computed(() => props.disabled),
  showWeekNumbers: computed(() => props.showWeekNumbers),
})
</script>

<template>
  <div
    :id="id"
    class="calendar"
    :data-disabled="disabled || undefined"
    :style="{ '--calendar-week-column': showWeekNumbers ? '2rem' : '0rem' }"
  >
    <CalendarHeader />

    <!--
      Views swap in place rather than in a popover: a popover would put `Dropdown` back
      inside a control (see base/select/DESIGN.md) and give `Escape` two meanings at once.
      That makes the body's size the Calendar's own problem — a month panel is 4 rows and
      3 columns against the day grid's 6 and 7, so an unpinned box jumps in both axes as
      you drill down.

      Width is always pinned. Height is pinned to the day grid's *actual* row count, not to
      a hardcoded 6, so the panels match the grid they replaced whether `fixedWeeks` is on
      or off. `autoHeight` opts out of the height pin entirely.
    -->
    <div class="calendar-body" :style="bodyStyle">
      <CalendarDayGrid v-if="calendar.view.value === 'day'">
        <template #day="slotProps">
          <slot name="day" v-bind="slotProps" />
        </template>
        <template #weekday="slotProps">
          <slot name="weekday" v-bind="slotProps" />
        </template>
      </CalendarDayGrid>
      <CalendarMonthPanel v-else-if="calendar.view.value === 'month'" />
      <CalendarYearPanel v-else />
    </div>
  </div>
</template>

<style scoped>
@reference "#main.css";

/*
  One cell size drives everything: the day grid's column width, the button inside it, the
  pinned body width and the pinned body height. Change `--calendar-cell` and they stay in
  step, which is what makes the component fit a container it was not designed for.
  `--calendar-cell-gap` is the breathing room between adjacent buttons.
*/
.calendar {
  --calendar-cell: 2.5rem;
  --calendar-cell-gap: 0.5rem;
  --calendar-week-column: 0rem;

  /*
    Type scales with the grid, so narrowing the calendar does not leave 14px labels fighting
    for room in a 34px column — which is what pushed the header's nav buttons out of the box
    the first time this was fitted to a sidebar. The ratio lands on exactly 14px at the
    default 2.5rem cell and exactly 12px at the width a 272px sidebar allows.

    It is a token rather than a `text-sm` utility because a scoped `.calendar` rule outranks
    a `text-xs` class on the same element, so the obvious consumer override silently loses.
    Override `--calendar-font-size` to break the ratio.
  */
  --calendar-font-size: calc(var(--calendar-cell) * 0.35);

  font-size: var(--calendar-font-size);

  @apply inline-block rounded-lg p-3 text-default select-none;

  &[data-disabled] {
    @apply opacity-60;
  }
}

.calendar-body {
  min-width: calc(7 * var(--calendar-cell) + var(--calendar-week-column));
}
</style>
