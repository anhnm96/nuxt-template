import type { MaybeRefOrGetter, Ref } from 'vue'
import type { CalendarPeriod, WeekStartsOn } from './utils'
import {
  addDays,
  addMonths,
  addYears,
  buildMonthMatrix,
  compareDay,
  isSameDay,
  isSameMonth,
  isSamePeriod,
  isWithinPeriodBounds,
  MAX_SKIP_SCAN_DAYS,
  quarterIndexOf,
  quartersOfYear,
  startOfDay,
  startOfPeriod,
  weekNumberForRow,
  yearPage,
  yearPageStart,
  YEARS_PER_PAGE,
} from './utils'

export type { CalendarPeriod } from './utils'

export type CalendarMode = 'single' | 'multiple'
export type CalendarView = 'day' | 'month' | 'quarter' | 'year'

/**
 * The view that commits, for a given period. Views coarser than it stay navigational;
 * finer ones do not exist. Quarter is deliberately absent from the `date` chain — nobody
 * wants a four-step drill-down to pick a day.
 */
const TERMINAL_VIEW: Record<CalendarPeriod, CalendarView> = {
  date: 'day',
  month: 'month',
  quarter: 'quarter',
  year: 'year',
}

/** The unit the header's arrows page by, which is not always a month. */
const PAGING_UNIT: Record<CalendarPeriod, CalendarPeriod> = {
  date: 'month',
  month: 'year',
  quarter: 'year',
  year: 'year',
}

/** Every user-facing string. Props, not `useI18n` lookups — see DESIGN.md. */
export interface CalendarLabels {
  previousMonth: string
  nextMonth: string
  previousYear: string
  nextYear: string
  previousYears: string
  nextYears: string
  chooseMonth: string
  chooseQuarter: string
  chooseYear: string
  weekColumn: string
  /**
   * Quarter names, Q1–Q4. A prop rather than a lookup because `Intl` has no quarter
   * formatting and dayjs's `Q` token is not localised — there is nothing to derive.
   */
  quarters: [string, string, string, string]
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
  chooseQuarter: 'Choose quarter',
  chooseYear: 'Choose year',
  weekColumn: 'Week',
  quarters: ['Q1', 'Q2', 'Q3', 'Q4'],
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
  /** The Date this cell stands for — the period's first day. */
  date: Date
  label: string
  /** Label plus the year, for the accessible name: "Q3 2026". */
  ariaLabel: string
  isDisabled: boolean
  isUnavailable: boolean
  /**
   * Only ever set on a *navigational* panel: the period the Visible Date points at, i.e.
   * where the view below is parked. Meaningless on a terminal panel, because nothing below
   * consumes the Visible Date there — so Current and Today never collide.
   */
  isCurrent: boolean
  isSelected: boolean
  isToday: boolean
  isTabbable: boolean
}

export interface UseCalendarOptions {
  /** `Date | null` in single mode, `Date[]` in multiple. Written through on selection. */
  model: Ref<any>
  /** Owned by Calendar.vue — local state, or the parent's `v-model:visibleDate`. */
  visibleDate: Ref<Date>
  /** False when the parent owns `visibleDate`; suppresses the follow-the-model rule. */
  followsModel: MaybeRefOrGetter<boolean>
  mode: MaybeRefOrGetter<CalendarMode>
  /** The unit one selection covers. Drives the terminal view and every comparison. */
  period: MaybeRefOrGetter<CalendarPeriod>
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
    visibleDate,
    followsModel,
    mode,
    period,
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

  /** Which view commits. Everything coarser stays navigational. */
  const terminalView = computed(() => TERMINAL_VIEW[toValue(period)])
  /** Month at `period: 'date'`, otherwise a year — what the header's arrows move by. */
  const pagingUnit = computed(() => PAGING_UNIT[toValue(period)])

  const view = ref<CalendarView>(TERMINAL_VIEW[toValue(period)])

  function isTerminal(candidate: CalendarView): boolean {
    return candidate === terminalView.value
  }
  /** First year of the year panel's current page. */
  const yearPageAnchor = ref(yearPageStart(visibleDate.value.getFullYear()))

  // #region formatters
  // One Intl instance per locale per format; rebuilt only when the locale changes.
  const monthYearFormat = computed(() =>
    new Intl.DateTimeFormat(toValue(locale), { year: 'numeric', month: 'long' }))
  const monthShortFormat = computed(() =>
    new Intl.DateTimeFormat(toValue(locale), { month: 'short' }))
  const monthLongFormat = computed(() =>
    new Intl.DateTimeFormat(toValue(locale), { month: 'long' }))
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
    monthYearFormat.value.formatToParts(visibleDate.value)
      .map(part => ({ type: part.type, value: part.value })))

  const headingLabel = computed(() => monthYearFormat.value.format(visibleDate.value))

  /**
   * The year the grid is actually showing. The month panel's header reads this, never
   * `focusedYear` — `pageBy` moves the Visible Date without touching the roving-focus
   * state, so a label bound to `focusedYear` goes stale and its own paging buttons look
   * like they do nothing.
   */
  const visibleYear = computed(() => visibleDate.value.getFullYear())
  // #endregion formatters

  // #region selection
  const selectedDates = computed<Date[]>(() => {
    const value = model.value
    if (toValue(mode) === 'multiple') return Array.isArray(value) ? value : []
    return value ? [value as Date] : []
  })

  /** Compared at period granularity — a stored 15 August matches Q3 without being rewritten. */
  function isSelected(date: Date): boolean {
    return selectedDates.value.some(selected => isSamePeriod(selected, date, toValue(period)))
  }
  // #endregion selection

  // #region unit state
  /**
   * Is the `unit`-sized period holding `date` unreachable?
   *
   * Bounds are compared at `unit` granularity, so a period that merely overlaps the range
   * counts as in bounds — with `minDate` on 15 June, June is selectable.
   *
   * The consumer predicates describe the unit being *selected*, so they only apply to the
   * terminal unit. A day-level predicate cannot speak for a whole month, and letting it try
   * would disable months because of whatever their 1st happens to be.
   */
  function unitIsDisabled(date: Date, unit: CalendarPeriod): boolean {
    if (toValue(disabled)) return true
    if (!isWithinPeriodBounds(date, unit, toValue(minDate), toValue(maxDate))) return true
    if (unit !== toValue(period)) return false
    return toValue(isDateDisabled)?.(startOfPeriod(date, unit)) ?? false
  }

  /** Disabled wins: not selectable either way, and "unreachable" is the stronger claim. */
  function unitIsUnavailable(date: Date, unit: CalendarPeriod): boolean {
    if (unitIsDisabled(date, unit)) return false
    if (unit !== toValue(period)) return false
    return toValue(isDateUnavailable)?.(startOfPeriod(date, unit)) ?? false
  }

  const dayIsDisabled = (date: Date) => unitIsDisabled(date, 'date')
  const dayIsUnavailable = (date: Date) => unitIsUnavailable(date, 'date')
  // #endregion unit state

  // #region focus
  /** Seeds the roving tabindex: the selection, else today, else the first usable day. */
  function seedFocus(month: Date): Date {
    const inMonth = selectedDates.value.find(date => isSameMonth(date, month))
    if (inMonth) return startOfDay(inMonth)
    if (isSameMonth(today, month)) return today

    const monthStart = startOfPeriod(month, 'month')
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

  const focusedDate = ref<Date>(seedFocus(visibleDate.value))
  /**
   * Seeded through the same bounds check `setView` uses, not straight from the Visible
   * Date. A panel is the *initial* view whenever `period` is not `date`, so these are a
   * real entry point rather than a placeholder — and a `tabindex="0"` on a natively
   * disabled button leaves the panel with nothing focusable at all.
   */
  const focusedMonth = ref(seedFocusedMonth(
    visibleDate.value.getFullYear(),
    visibleDate.value.getMonth(),
  ))
  const focusedYear = ref(seedFocusedYear(
    yearPageAnchor.value,
    visibleDate.value.getFullYear(),
  ))
  /** Index 0–3 within the visible year. */
  const focusedQuarter = ref(seedFocusedQuarter(
    visibleDate.value.getFullYear(),
    quarterIndexOf(visibleDate.value),
  ))
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

  function setVisibleDate(date: Date) {
    const unit = pagingUnit.value
    const next = startOfPeriod(date, unit)
    if (isSamePeriod(next, visibleDate.value, unit)) return
    visibleDate.value = next
  }

  /** Moves the roving focus, paging the Visible Date when it leaves it. */
  function focusOn(date: Date) {
    focusedDate.value = startOfDay(date)
    setVisibleDate(date)
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
      if (!isWithinPeriodBounds(candidate, 'date', toValue(minDate), toValue(maxDate))) return
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
      if (!isWithinPeriodBounds(candidate, 'date', toValue(minDate), toValue(maxDate))) return
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
    visibleMonth: visibleDate.value,
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
        isOutside: !isSameMonth(date, visibleDate.value),
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
  /**
   * One shape for every panel cell. `isCurrent` is set only on a *navigational* panel and
   * Selected/Today only on a *terminal* one, so bold-primary can serve both roles without
   * ever meaning two things on the same grid.
   */
  function panelCell(date: Date, unit: CalendarPeriod, parts: {
    value: number
    label: string
    ariaLabel: string
    isCurrent: boolean
    isTabbable: boolean
  }): CalendarPanelCell {
    const terminal = toValue(period) === unit
    return {
      value: parts.value,
      date,
      label: parts.label,
      ariaLabel: parts.ariaLabel,
      isDisabled: unitIsDisabled(date, unit),
      isUnavailable: unitIsUnavailable(date, unit),
      isCurrent: !terminal && parts.isCurrent,
      isSelected: terminal && isSelected(date),
      isToday: terminal && isSamePeriod(date, today, unit),
      isTabbable: parts.isTabbable,
    }
  }

  /**
   * Nearest selectable index to `preferred`, searching outward. A panel's single
   * `tabindex="0"` must not land on a natively disabled button — that button cannot take
   * focus, so `Tab` would skip the whole panel and its arrow keys would be unreachable.
   */
  function seedIndex(count: number, preferred: number, isDisabled: (i: number) => boolean) {
    if (!isDisabled(preferred)) return preferred
    for (let step = 1; step < count; step++) {
      const after = preferred + step
      if (after < count && !isDisabled(after)) return after
      const before = preferred - step
      if (before >= 0 && !isDisabled(before)) return before
    }
    // Everything out of range: the header's paging buttons are the way out.
    return preferred
  }

  function seedFocusedMonth(year: number, preferred: number): number {
    return seedIndex(12, preferred, i => unitIsDisabled(new Date(year, i, 1), 'month'))
  }

  function seedFocusedQuarter(year: number, preferred: number): number {
    const quarters = quartersOfYear(year)
    return seedIndex(4, preferred, i => unitIsDisabled(quarters[i]!, 'quarter'))
  }

  /** The same, over the year panel's current page. */
  function seedFocusedYear(anchor: number, preferred: number): number {
    const years = yearPage(anchor)
    const usable = (year: number) => !unitIsDisabled(new Date(year, 0, 1), 'year')
    if (years.includes(preferred) && usable(preferred)) return preferred
    return years.find(usable) ?? years[0]!
  }

  const monthCells = computed<CalendarPanelCell[]>(() => {
    const year = visibleDate.value.getFullYear()
    return Array.from({ length: 12 }, (_, month) => {
      const date = new Date(year, month, 1)
      return panelCell(date, 'month', {
        value: month,
        label: monthShortFormat.value.format(date),
        ariaLabel: `${monthLongFormat.value.format(date)} ${year}`,
        isCurrent: month === visibleDate.value.getMonth(),
        isTabbable: month === focusedMonth.value,
      })
    })
  })

  const quarterCells = computed<CalendarPanelCell[]>(() => {
    const year = visibleDate.value.getFullYear()
    const names = toValue(labels).quarters
    return quartersOfYear(year).map((date, index) => panelCell(date, 'quarter', {
      value: index,
      label: names[index]!,
      // "Q3 2026" — a bare "Q3" is the announce-a-naked-number problem the day cells avoid.
      ariaLabel: `${names[index]} ${year}`,
      isCurrent: false,
      isTabbable: index === focusedQuarter.value,
    }))
  })

  const yearCells = computed<CalendarPanelCell[]>(() =>
    yearPage(yearPageAnchor.value).map((year) => {
      const date = new Date(year, 0, 1)
      return panelCell(date, 'year', {
        value: year,
        label: String(year),
        ariaLabel: String(year),
        isCurrent: year === visibleDate.value.getFullYear(),
        isTabbable: year === focusedYear.value,
      })
    }))

  const yearPageLabel = computed(() => {
    const cells = yearCells.value
    return `${cells[0]!.value} - ${cells[cells.length - 1]!.value}`
  })

  /**
   * Where a view's roving tabindex should start. Split out of `setView` because a view can
   * also be entered without it — at mount, and when `period` changes underneath.
   */
  function seedFocusFor(next: CalendarView) {
    const year = visibleDate.value.getFullYear()
    if (next === 'month') {
      focusedMonth.value = seedFocusedMonth(year, visibleDate.value.getMonth())
    }
    if (next === 'quarter') {
      focusedQuarter.value = seedFocusedQuarter(year, quarterIndexOf(visibleDate.value))
    }
    if (next === 'year') {
      const anchor = yearPageStart(year)
      yearPageAnchor.value = anchor
      focusedYear.value = seedFocusedYear(anchor, year)
    }
  }

  function setView(next: CalendarView) {
    if (toValue(disabled)) return
    view.value = next
    seedFocusFor(next)
    requestFocus()
  }

  /** `Escape` returns here. From the terminal view itself it bubbles — see DESIGN.md. */
  function returnToTerminalView() {
    if (isTerminal(view.value)) return false
    setView(terminalView.value)
    return true
  }

  /**
   * A panel either commits or drills down, depending on whether it is the terminal view for
   * the current `period`. Only the terminal view ever touches the model.
   */
  function selectMonth(month: number) {
    const date = new Date(visibleDate.value.getFullYear(), month, 1)
    if (unitIsDisabled(date, 'month')) return
    if (isTerminal('month')) {
      commit(date)
      return
    }
    setVisibleDate(date)
    focusedDate.value = seedFocus(visibleDate.value)
    view.value = 'day'
    requestFocus()
  }

  /** Quarter is terminal or it does not exist — it is never a step in another chain. */
  function selectQuarter(index: number) {
    const date = quartersOfYear(visibleDate.value.getFullYear())[index]
    if (!date || unitIsDisabled(date, 'quarter')) return
    commit(date)
  }

  function selectYear(year: number) {
    const date = new Date(year, 0, 1)
    if (unitIsDisabled(date, 'year')) return
    if (isTerminal('year')) {
      commit(date)
      return
    }
    setVisibleDate(new Date(year, visibleDate.value.getMonth(), 1))
    // Drill to whichever view sits directly below the year panel for this period.
    const next: CalendarView = toValue(period) === 'quarter' ? 'quarter' : 'month'
    setView(next)
  }
  // #endregion panels

  // #region navigation
  function pageBy(months: number) {
    if (toValue(disabled)) return
    setVisibleDate(addMonths(visibleDate.value, months))
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
      visibleDate.value.getFullYear(),
      visibleDate.value.getMonth(),
      0,
    )
    return compareDay(lastOfPrev, min) >= 0
  })

  const canPageNextMonth = computed(() => {
    if (toValue(disabled)) return false
    const max = toValue(maxDate)
    if (!max) return true
    return compareDay(addMonths(visibleDate.value, 1), max) <= 0
  })

  const canPagePrevYear = computed(() => {
    if (toValue(disabled)) return false
    const min = toValue(minDate)
    if (!min) return true
    return addYears(visibleDate.value, -1).getFullYear() >= min.getFullYear()
  })

  const canPageNextYear = computed(() => {
    if (toValue(disabled)) return false
    const max = toValue(maxDate)
    if (!max) return true
    return addYears(visibleDate.value, 1).getFullYear() <= max.getFullYear()
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
   * The single place the model changes. Emits `startOf(period)` — which at the default
   * `period: 'date'` is exactly the local midnight this component always emitted.
   *
   * Never rewrites the model to enforce validity: only the user's own click or keypress
   * changes it, and an incoming value is matched at period granularity rather than
   * corrected. See ADR-0007 and ADR-0008.
   */
  function commit(date: Date) {
    const unit = toValue(period)
    const value = startOfPeriod(date, unit)
    if (unitIsDisabled(value, unit) || unitIsUnavailable(value, unit)) return

    if (toValue(mode) === 'multiple') {
      const current = selectedDates.value
      const without = current.filter(selected => !isSamePeriod(selected, value, unit))
      const next = without.length === current.length ? [...current, value] : without
      model.value = next.sort(compareDay)
      return
    }

    if (isSelected(value)) {
      if (toValue(deselectable)) model.value = null
      return
    }

    model.value = value
    // The Visible Date follows an Outside Day into its own month.
    if (toValue(followsModel)) setVisibleDate(value)
  }

  /** What the day grid calls. Same path as the panels — `commit` is the only writer. */
  const select = commit
  // #endregion commit

  // Re-seed the roving tabindex whenever the month changes under it — paging with the
  // buttons must still leave the grid with exactly one entry point. Only the day grid has
  // a roving *date*; the panels seed their own index.
  watch(visibleDate, (next) => {
    if (terminalView.value !== 'day') return
    if (!isSameMonth(focusedDate.value, next)) focusedDate.value = seedFocus(next)
  })

  // Single mode only: a value set from outside pulls the grid to it, but only when it is
  // not already in the Visible Date. Multiple mode never follows — the user is
  // accumulating dates and paging deliberately.
  watch(() => model.value, (value) => {
    if (!toValue(followsModel) || toValue(mode) !== 'single' || !value) return
    // "Already in view" is judged by the paging unit, not always by month.
    if (!isSamePeriod(value as Date, visibleDate.value, pagingUnit.value)) {
      setVisibleDate(value as Date)
    }
  })

  // Switching period mid-life must not strand the user in a view that no longer commits,
  // nor leave the new view's tab stop on a cell the new bounds disable.
  watch(terminalView, (next) => {
    view.value = next
    seedFocusFor(next)
    requestFocus()
  })

  return {
    today,
    view,
    terminalView,
    isTerminal,
    returnToTerminalView,
    weeks,
    rowCount,
    hasTabbableDay,
    weekdays,
    monthCells,
    quarterCells,
    yearCells,
    yearPageLabel,
    headingParts,
    headingLabel,
    visibleYear,
    focusedDate,
    focusedMonth,
    focusedQuarter,
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
    selectQuarter,
    selectYear,
    setView,
    setVisibleDate,
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
