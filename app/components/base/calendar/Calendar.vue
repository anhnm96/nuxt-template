<script setup lang="ts" generic="M extends CalendarMode = 'single'">
import type { CalendarLabels, CalendarMode } from './useCalendar'
import type { CalendarPeriod, WeekStartsOn } from './utils'
import CalendarDayGrid from './CalendarDayGrid.vue'
import CalendarHeader from './CalendarHeader.vue'
import CalendarMonthPanel from './CalendarMonthPanel.vue'
import CalendarQuarterPanel from './CalendarQuarterPanel.vue'
import CalendarYearPanel from './CalendarYearPanel.vue'
import { provideCalendarContext } from './context'
import { DEFAULT_CALENDAR_LABELS, useCalendar } from './useCalendar'
import { startOfPeriod } from './utils'

/** What `v-model` carries. `mode` is a string prop, so no Boolean-casting trap — see ADR-0006. */
type CalendarModel<Mode extends CalendarMode> = Mode extends 'multiple' ? Date[] : MaybeNull<Date>

const props = withDefaults(defineProps<{
  /** `'single' | 'multiple'`. Widens to `'range'` later without breaking call sites. */
  mode?: M
  /**
   * The unit one selection covers. Changes what `v-model` means — the value is always
   * `startOf(period)` — and which view commits. See ADR-0008.
   */
  period?: CalendarPeriod
  /**
   * The Date the calendar is scrolled to. Omit it and Calendar owns it; pass
   * `v-model:visibleDate` and the parent does — which also switches off the
   * follow-the-model rule below. Not named `visibleMonth`: the paging unit is a month, a
   * year or twelve years depending on `period`.
   */
  visibleDate?: Date
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
  period: 'date',
  weekStartsOn: 0,
  fixedWeeks: true,
  autoHeight: false,
  showWeekNumbers: false,
  deselectable: false,
  disabled: false,
})

const emit = defineEmits<{ 'update:visibleDate': [value: Date] }>()

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

/**
 * A spread rather than `defu`, because `defu` widens the `quarters` tuple to `string[]` and
 * drops the compile-time guarantee that an override supplies all four names.
 *
 * Undefined values are filtered first. A bare spread lets an explicit `undefined` win over
 * the default — and `Partial<CalendarLabels>` accepts one, so `:labels="{ quarters: cond
 * ? names : undefined }"` type-checks and then throws when the quarter panel indexes it.
 */
const labels = computed<CalendarLabels>(() => {
  const overrides = Object.fromEntries(
    Object.entries(props.labels ?? {}).filter(([, value]) => value !== undefined),
  ) as Partial<CalendarLabels>

  return { ...DEFAULT_CALENDAR_LABELS, ...overrides }
})

/**
 * Seeded from the first selected date, else today. `controlled` is derived from the *prop*
 * rather than from a `defineModel` ref: a local fallback would become defined the first
 * time we paged, and silently switch the follow rule off.
 */
function seedMonth(): Date {
  // `CalendarModel<M>` stays unresolved while `M` is generic, so widen before inspecting it.
  const value = model.value as Date | Date[] | null | undefined
  const first = Array.isArray(value) ? value[0] : value
  return startOfPeriod(first ?? new Date(), 'month')
}

const localVisibleDate = ref(seedMonth())
const controlled = computed(() => props.visibleDate !== undefined)

const visibleDate = computed({
  get: () => props.visibleDate ?? localVisibleDate.value,
  set: (value: Date) => {
    localVisibleDate.value = value
    emit('update:visibleDate', value)
  },
})

const calendar = useCalendar({
  model,
  visibleDate,
  followsModel: () => !controlled.value,
  // `withDefaults` cannot type a generic prop's default, so the fallback is restated here.
  mode: () => props.mode ?? 'single',
  period: () => props.period,
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

/**
 * Hands focus to the roving cell — the selected day, or today, or the terminal panel's
 * current cell. A popover wrapper calls this when the user asks to enter the grid.
 *
 * It exists because `Dropdown.focusOnOpen` focuses the *first focusable element* in the
 * popover, which is the header's « button, not the grid. And the Calendar cannot simply
 * focus itself on mount: it is used inline, where stealing the page's focus on render is
 * wrong — and in a popover over a text field, opening is not itself a request for focus.
 * So the wrapper asks, and the roving cell answers.
 */
function focus() {
  calendar.requestFocus()
}

defineExpose({ focus })

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
      <CalendarQuarterPanel v-else-if="calendar.view.value === 'quarter'" />
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
