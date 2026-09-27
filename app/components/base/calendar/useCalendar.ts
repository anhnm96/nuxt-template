import type { MaybeRefOrGetter, Ref } from 'vue'
import type { WeekStartsOn } from './utils'
import {
  addDays,
  addMonths,
  addYears,
  buildMonthMatrix,
  compareDay,
  isSameDay,
  isSameMonth,
  isWithinBounds,
  MAX_SKIP_SCAN_DAYS,
  startOfDay,
  toMonthStart,
  weekNumberForRow,
  yearPage,
  yearPageStart,
  YEARS_PER_PAGE,
} from './utils'

export type CalendarMode = 'single' | 'multiple'
export type CalendarView = 'day' | 'month' | 'year'

/** Every user-facing string. Props, not `useI18n` lookups — see DESIGN.md. */
export interface CalendarLabels {
  previousMonth: string
  nextMonth: string
  previousYear: string
  nextYear: string
  previousYears: string
  nextYears: string
  chooseMonth: string
  chooseYear: string
  weekColumn: string
  /** Appended to a day's `aria-label`. */
  selected: string
  unavailable: string
}

export const DEFAULT_CALENDAR_LABELS: CalendarLabels = {
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  previousYear: 'Previous year',
  nextYear: 'Next year',
  previousYears: 'Previous years',
  nextYears: 'Next years',
  chooseMonth: 'Choose month',
  chooseYear: 'Choose year',
  weekColumn: 'Week',
  selected: 'selected',
  unavailable: 'unavailable',
}

/** One day cell. Everything the template needs, already resolved. */
export interface CalendarDay {
  date: Date
  key: string
  dayOfMonth: number
  /** Belongs to the previous or next month. Dimmed, but fully selectable. */
  isOutside: boolean
  isToday: boolean
  isSelected: boolean
  /** Unreachable: native `disabled`, skipped by the keyboard. */
  isDisabled: boolean
  /** Navigable but not selectable: `aria-disabled`, struck through. */
  isUnavailable: boolean
  /** The single `tabindex="0"` cell in the grid. */
  isTabbable: boolean
  /** Full date plus state, e.g. "Monday, 14 September 2026, selected". */
  label: string
}

export interface CalendarWeek {
  key: string
  /** ISO week of this row's Thursday. `null` when the column is hidden. */
  weekNumber: number | null
  days: CalendarDay[]
}

export interface CalendarPanelCell {
  value: number
  label: string
  isDisabled: boolean
  /** Matches the Visible Month — where the eye already is. */
  isCurrent: boolean
  isTabbable: boolean
}

export interface UseCalendarOptions {
  /** `Date | null` in single mode, `Date[]` in multiple. Written through on selection. */
  model: Ref<any>
  /** Owned by Calendar.vue — local state, or the parent's `v-model:visibleMonth`. */
  visibleMonth: Ref<Date>
  /** False when the parent owns `visibleMonth`; suppresses the follow-the-model rule. */
  followsModel: MaybeRefOrGetter<boolean>
  mode: MaybeRefOrGetter<CalendarMode>
  locale: MaybeRefOrGetter<string>
  weekStartsOn: MaybeRefOrGetter<WeekStartsOn>
  fixedWeeks: MaybeRefOrGetter<boolean>
  showWeekNumbers: MaybeRefOrGetter<boolean>
  deselectable: MaybeRefOrGetter<boolean>
  disabled: MaybeRefOrGetter<boolean>
  minDate: MaybeRefOrGetter<Date | undefined>
  maxDate: MaybeRefOrGetter<Date | undefined>
  isDateDisabled: MaybeRefOrGetter<((date: Date) => boolean) | undefined>
  isDateUnavailable: MaybeRefOrGetter<((date: Date) => boolean) | undefined>
  labels: MaybeRefOrGetter<CalendarLabels>
}

function toKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

export function useCalendar(options: UseCalendarOptions) {
  const {
    model,
    visibleMonth,
    followsModel,
    mode,
    locale,
    weekStartsOn,
    fixedWeeks,
    showWeekNumbers,
    deselectable,
    disabled,
    minDate,
    maxDate,
    isDateDisabled,
    isDateUnavailable,
    labels,
  } = options

  /**
   * Read once at setup, deliberately not a prop. Tests pin it with `vi.setSystemTime`;
   * see DESIGN.md, "Today is ambient".
   */
  const today = startOfDay(new Date())

  const view = ref<CalendarView>('day')
  /** First year of the year panel's current page. */
  const yearPageAnchor = ref(yearPageStart(visibleMonth.value.getFullYear()))

  // #region formatters
  // One Intl instance per locale per format; rebuilt only when the locale changes.
  const monthYearFormat = computed(() =>
    new Intl.DateTimeFormat(toValue(locale), { year: 'numeric', month: 'long' }))
  const monthShortFormat = computed(() =>
    new Intl.DateTimeFormat(toValue(locale), { month: 'short' }))
  const dayLabelFormat = computed(() =>
    new Intl.DateTimeFormat(toValue(locale), {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }))
  const weekdayFormats = computed(() => ({
    narrow: new Intl.DateTimeFormat(toValue(locale), { weekday: 'narrow' }),
    short: new Intl.DateTimeFormat(toValue(locale), { weekday: 'short' }),
    long: new Intl.DateTimeFormat(toValue(locale), { weekday: 'long' }),
  }))

  /**
   * The header's month and year as ordered parts, so the two buttons render in locale
   * order — "September 2026" in English, "2026年9月" in Japanese, with no conditional.
   */
  const headingParts = computed(() =>
    monthYearFormat.value.formatToParts(visibleMonth.value)
      .map(part => ({ type: part.type, value: part.value })))

  const headingLabel = computed(() => monthYearFormat.value.format(visibleMonth.value))

  /**
   * The year the grid is actually showing. The month panel's header reads this, never
   * `focusedYear` — `pageBy` moves the Visible Month without touching the roving-focus
   * state, so a label bound to `focusedYear` goes stale and its own paging buttons look
   * like they do nothing.
   */
  const visibleYear = computed(() => visibleMonth.value.getFullYear())
  // #endregion formatters

  // #region selection
  const selectedDates = computed<Date[]>(() => {
    const value = model.value
    if (toValue(mode) === 'multiple') return Array.isArray(value) ? value : []
    return value ? [value as Date] : []
  })

  function isSelected(date: Date): boolean {
    return selectedDates.value.some(selected => isSameDay(selected, date))
  }
  // #endregion selection

  // #region day state
  function dayIsDisabled(date: Date): boolean {
    if (toValue(disabled)) return true
    if (!isWithinBounds(date, toValue(minDate), toValue(maxDate))) return true
    return toValue(isDateDisabled)?.(date) ?? false
  }

  /** Disabled wins: not selectable either way, and "unreachable" is the stronger claim. */
  function dayIsUnavailable(date: Date): boolean {
    if (dayIsDisabled(date)) return false
    return toValue(isDateUnavailable)?.(date) ?? false
  }

  function daySelectable(date: Date): boolean {
    return !dayIsDisabled(date) && !dayIsUnavailable(date)
  }
  // #endregion day state

  // #region focus
  /** Seeds the roving tabindex: the selection, else today, else the first usable day. */
  function seedFocus(month: Date): Date {
    const inMonth = selectedDates.value.find(date => isSameMonth(date, month))
    if (inMonth) return startOfDay(inMonth)
    if (isSameMonth(today, month)) return today

    const monthStart = toMonthStart(month)
    const daysInMonth = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth() + 1,
      0,
    ).getDate()
    for (let offset = 0; offset < daysInMonth; offset++) {
      const candidate = addDays(monthStart, offset)
      if (!dayIsDisabled(candidate)) return candidate
    }
    // Every day disabled: the grid still needs an entry point.
    return monthStart
  }

  const focusedDate = ref<Date>(seedFocus(visibleMonth.value))
  const focusedMonth = ref(visibleMonth.value.getMonth())
  const focusedYear = ref(visibleMonth.value.getFullYear())
  /**
   * Bumped only by keyboard movement. Cells watch it to move real DOM focus, so paging
   * driven by the model or by the parent never steals focus from elsewhere.
   */
  const focusRequest = ref(0)
  /**
   * The last request some cell actually acted on. A request is a one-shot token rather than
   * a level, because a cell must also be able to take focus when it *mounts* — the target
   * of `PageDown`, or of `Escape` out of a panel, does not exist yet when the request is
   * made. Without the token, that mount-time path would fire on every later remount and
   * yank focus into the grid while the user was clicking a nav button.
   */
  let claimedFocusRequest = 0

  function requestFocus() {
    focusRequest.value++
  }

  /** True at most once per `requestFocus()`; the first tabbable cell to ask wins. */
  function claimFocusRequest(): boolean {
    if (claimedFocusRequest === focusRequest.value) return false
    claimedFocusRequest = focusRequest.value
    return true
  }

  function setVisibleMonth(month: Date) {
    const next = toMonthStart(month)
    if (isSameMonth(next, visibleMonth.value)) return
    visibleMonth.value = next
  }

  /** Moves the roving focus, paging the Visible Month when it leaves it. */
  function focusOn(date: Date) {
    focusedDate.value = startOfDay(date)
    setVisibleMonth(date)
    requestFocus()
  }

  /**
   * Repeated-delta scan: `delta` is reapplied until a non-disabled day is found, so the
   * up/down arrows keep their column. Bounded by `MAX_SKIP_SCAN_DAYS` and by min/max —
   * without both, arrowing out of a fully disabled range never terminates, because arrows
   * page across month boundaries.
   */
  function moveFocusBy(delta: number) {
    if (toValue(disabled) || delta === 0) return
    let candidate = focusedDate.value
    for (let travelled = 0; travelled < MAX_SKIP_SCAN_DAYS; travelled += Math.abs(delta)) {
      candidate = addDays(candidate, delta)
      if (!isWithinBounds(candidate, toValue(minDate), toValue(maxDate))) return
      if (!dayIsDisabled(candidate)) {
        focusOn(candidate)
        return
      }
    }
  }

  /** Jumps to `target`, then scans one day at a time in `direction` for a usable day. */
  function moveFocusTo(target: Date, direction: 1 | -1 = 1) {
    if (toValue(disabled)) return
    let candidate = startOfDay(target)
    for (let step = 0; step < MAX_SKIP_SCAN_DAYS; step++) {
      if (!isWithinBounds(candidate, toValue(minDate), toValue(maxDate))) return
      if (!dayIsDisabled(candidate)) {
        focusOn(candidate)
        return
      }
      candidate = addDays(candidate, direction)
    }
  }
  // #endregion focus

  // #region grid
  const matrix = computed(() => buildMonthMatrix({
    visibleMonth: visibleMonth.value,
    weekStartsOn: toValue(weekStartsOn),
    fixedWeeks: toValue(fixedWeeks),
  }))

  /**
   * The rendered grid. `isDateDisabled` / `isDateUnavailable` are consumer functions called
   * ~42 times per build; this `computed` is the memo — it re-runs only when the month, the
   * bounds, the predicates or the selection change.
   */
  const weeks = computed<CalendarWeek[]>(() => matrix.value.map((row) => {
    const days = row.map<CalendarDay>((date) => {
      const isDisabled = dayIsDisabled(date)
      const isUnavailable = dayIsUnavailable(date)
      const selected = isSelected(date)
      const parts = [dayLabelFormat.value.format(date)]
      if (selected) parts.push(toValue(labels).selected)
      if (isUnavailable) parts.push(toValue(labels).unavailable)

      return {
        date,
        key: toKey(date),
        dayOfMonth: date.getDate(),
        isOutside: !isSameMonth(date, visibleMonth.value),
        isToday: isSameDay(date, today),
        isSelected: selected,
        isDisabled,
        isUnavailable,
        isTabbable: !isDisabled && isSameDay(date, focusedDate.value),
        label: parts.join(', '),
      }
    })

    return {
      key: toKey(row[0]!),
      weekNumber: toValue(showWeekNumbers) ? weekNumberForRow(row) : null,
      days,
    }
  }))

  /**
   * How many rows the day grid draws — 6 under `fixedWeeks`, else the month's natural 4–6.
   * The body's pinned height derives from this rather than assuming 6, so the panels match
   * the grid they replaced even when `fixedWeeks` is off.
   */
  const rowCount = computed(() => matrix.value.length)

  /**
   * False when nothing in the grid can take focus — every day is disabled by the bounds or
   * by `isDateDisabled`. `seedFocus` still names an entry point, but a natively disabled
   * button cannot be focused, so the grid itself has to become the tab stop or the user
   * cannot reach the arrow keys that would page out of the dead month.
   */
  const hasTabbableDay = computed(() =>
    weeks.value.some(week => week.days.some(day => day.isTabbable)))

  /** Weekday column headers, in `weekStartsOn` order. */
  const weekdays = computed(() => {
    // 2024-01-07 is a Sunday, so offsetting from it lands on the right weekday names.
    const sunday = new Date(2024, 0, 7)
    const formats = weekdayFormats.value
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(sunday, (toValue(weekStartsOn) + index) % 7)
      return {
        key: date.getDay(),
        date,
        narrow: formats.narrow.format(date),
        short: formats.short.format(date),
        long: formats.long.format(date),
      }
    })
  })
  // #endregion grid

  // #region panels
  function monthIsDisabled(year: number, month: number): boolean {
    if (toValue(disabled)) return true
    const min = toValue(minDate)
    const max = toValue(maxDate)
    const first = new Date(year, month, 1)
    const last = new Date(year, month + 1, 0)
    if (min && compareDay(last, min) < 0) return true
    if (max && compareDay(first, max) > 0) return true
    return false
  }

  function yearIsDisabled(year: number): boolean {
    if (toValue(disabled)) return true
    const min = toValue(minDate)
    const max = toValue(maxDate)
    if (min && year < min.getFullYear()) return true
    if (max && year > max.getFullYear()) return true
    return false
  }

  /**
   * Nearest selectable month to `preferred`, searching outward. A panel's single
   * `tabindex="0"` must not land on a natively disabled button — that button cannot take
   * focus, so `Tab` would skip the whole panel and its arrow keys would be unreachable.
   */
  function seedFocusedMonth(year: number, preferred: number): number {
    if (!monthIsDisabled(year, preferred)) return preferred
    for (let step = 1; step < 12; step++) {
      const after = preferred + step
      if (after < 12 && !monthIsDisabled(year, after)) return after
      const before = preferred - step
      if (before >= 0 && !monthIsDisabled(year, before)) return before
    }
    // Every month out of range: the header's paging buttons are the way out.
    return preferred
  }

  /** The same, over the year panel's current page. */
  function seedFocusedYear(anchor: number, preferred: number): number {
    const years = yearPage(anchor)
    if (years.includes(preferred) && !yearIsDisabled(preferred)) return preferred
    return years.find(year => !yearIsDisabled(year)) ?? years[0]!
  }

  const monthCells = computed<CalendarPanelCell[]>(() => {
    const year = visibleMonth.value.getFullYear()
    return Array.from({ length: 12 }, (_, month) => ({
      value: month,
      label: monthShortFormat.value.format(new Date(year, month, 1)),
      isDisabled: monthIsDisabled(year, month),
      isCurrent: month === visibleMonth.value.getMonth(),
      isTabbable: month === focusedMonth.value,
    }))
  })

  const yearCells = computed<CalendarPanelCell[]>(() =>
    yearPage(yearPageAnchor.value).map(year => ({
      value: year,
      label: String(year),
      isDisabled: yearIsDisabled(year),
      isCurrent: year === visibleMonth.value.getFullYear(),
      isTabbable: year === focusedYear.value,
    })))

  const yearPageLabel = computed(() => {
    const cells = yearCells.value
    return `${cells[0]!.value} - ${cells[cells.length - 1]!.value}`
  })

  function setView(next: CalendarView) {
    if (toValue(disabled)) return
    view.value = next
    if (next === 'month') {
      focusedMonth.value = seedFocusedMonth(
        visibleMonth.value.getFullYear(),
        visibleMonth.value.getMonth(),
      )
    }
    if (next === 'year') {
      const anchor = yearPageStart(visibleMonth.value.getFullYear())
      yearPageAnchor.value = anchor
      focusedYear.value = seedFocusedYear(anchor, visibleMonth.value.getFullYear())
    }
    requestFocus()
  }

  /** Panels navigate, never commit: year drills to months, month drills to days. */
  function selectMonth(month: number) {
    if (monthIsDisabled(visibleMonth.value.getFullYear(), month)) return
    setVisibleMonth(new Date(visibleMonth.value.getFullYear(), month, 1))
    focusedDate.value = seedFocus(visibleMonth.value)
    view.value = 'day'
    requestFocus()
  }

  function selectYear(year: number) {
    if (yearIsDisabled(year)) return
    setVisibleMonth(new Date(year, visibleMonth.value.getMonth(), 1))
    view.value = 'month'
    focusedMonth.value = seedFocusedMonth(year, visibleMonth.value.getMonth())
    requestFocus()
  }
  // #endregion panels

  // #region navigation
  function pageBy(months: number) {
    if (toValue(disabled)) return
    setVisibleMonth(addMonths(visibleMonth.value, months))
  }

  function pageYearsBy(pages: number) {
    if (toValue(disabled)) return
    const anchor = yearPageAnchor.value + pages * YEARS_PER_PAGE
    yearPageAnchor.value = anchor
    // The first year of a page is often out of bounds; land on one that can take focus.
    focusedYear.value = seedFocusedYear(anchor, anchor)
    requestFocus()
  }

  /** A nav button is dead when everything it would reach is out of bounds. */
  const canPagePrevMonth = computed(() => {
    if (toValue(disabled)) return false
    const min = toValue(minDate)
    if (!min) return true
    // Day 0 of the current month is the last day of the previous one.
    const lastOfPrev = new Date(
      visibleMonth.value.getFullYear(),
      visibleMonth.value.getMonth(),
      0,
    )
    return compareDay(lastOfPrev, min) >= 0
  })

  const canPageNextMonth = computed(() => {
    if (toValue(disabled)) return false
    const max = toValue(maxDate)
    if (!max) return true
    return compareDay(addMonths(visibleMonth.value, 1), max) <= 0
  })

  const canPagePrevYear = computed(() => {
    if (toValue(disabled)) return false
    const min = toValue(minDate)
    if (!min) return true
    return addYears(visibleMonth.value, -1).getFullYear() >= min.getFullYear()
  })

  const canPageNextYear = computed(() => {
    if (toValue(disabled)) return false
    const max = toValue(maxDate)
    if (!max) return true
    return addYears(visibleMonth.value, 1).getFullYear() <= max.getFullYear()
  })

  /**
   * Year paging asks whether any selectable year lies in that *direction*, not whether the
   * adjacent page's boundary year happens to be selectable.
   *
   * Testing the boundary year strands the user: with `minDate` in 2030 and the grid on 2026,
   * the next page (2028–2039) holds every selectable year, but its first year — 2028 — is
   * before the bound, so the button would be dead and the valid years unreachable. Testing
   * the adjacent page's *contents* fixes that one case but still blocks a range several
   * pages away, since every page in between is empty. Only the direction test lets the user
   * travel across those empty pages to the range.
   */
  const canPagePrevYears = computed(() => {
    if (toValue(disabled)) return false
    const min = toValue(minDate)
    return !min || min.getFullYear() <= yearPageAnchor.value - 1
  })

  const canPageNextYears = computed(() => {
    if (toValue(disabled)) return false
    const max = toValue(maxDate)
    return !max || max.getFullYear() >= yearPageAnchor.value + YEARS_PER_PAGE
  })
  // #endregion navigation

  // #region commit
  /**
   * Never rewrites the model to enforce validity — only the user's own click or keypress
   * changes it. See ADR-0007.
   */
  function select(date: Date) {
    if (!daySelectable(date)) return
    const day = startOfDay(date)

    if (toValue(mode) === 'multiple') {
      const current = selectedDates.value
      const without = current.filter(selected => !isSameDay(selected, day))
      const next = without.length === current.length ? [...current, day] : without
      model.value = next.sort(compareDay)
      return
    }

    if (isSelected(day)) {
      if (toValue(deselectable)) model.value = null
      return
    }

    model.value = day
    // The Visible Month follows an Outside Day into its own month.
    if (toValue(followsModel)) setVisibleMonth(day)
  }
  // #endregion commit

  // Re-seed the roving tabindex whenever the month changes under it — paging with the
  // buttons must still leave the grid with exactly one entry point.
  watch(visibleMonth, (month) => {
    if (!isSameMonth(focusedDate.value, month)) focusedDate.value = seedFocus(month)
  })

  // Single mode only: a value set from outside pulls the grid to it, but only when it is
  // not already in the Visible Month. Multiple mode never follows — the user is
  // accumulating dates and paging deliberately.
  watch(() => model.value, (value) => {
    if (!toValue(followsModel) || toValue(mode) !== 'single' || !value) return
    if (!isSameMonth(value as Date, visibleMonth.value)) setVisibleMonth(value as Date)
  })

  return {
    today,
    view,
    weeks,
    rowCount,
    hasTabbableDay,
    weekdays,
    monthCells,
    yearCells,
    yearPageLabel,
    headingParts,
    headingLabel,
    visibleYear,
    focusedDate,
    focusedMonth,
    focusedYear,
    focusRequest,
    canPagePrevMonth,
    canPageNextMonth,
    canPagePrevYear,
    canPageNextYear,
    canPagePrevYears,
    canPageNextYears,
    select,
    selectMonth,
    selectYear,
    setView,
    setVisibleMonth,
    pageBy,
    pageYearsBy,
    moveFocusBy,
    moveFocusTo,
    requestFocus,
    claimFocusRequest,
    isSelected,
    dayIsDisabled,
    dayIsUnavailable,
  }
}

export type UseCalendarReturn = ReturnType<typeof useCalendar>
