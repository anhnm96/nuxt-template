import type { Dayjs, QUnitType } from 'dayjs/esm'
import dayjs from 'dayjs/esm'
import isoWeekPlugin from 'dayjs/esm/plugin/isoWeek'
import quarterOfYearPlugin from 'dayjs/esm/plugin/quarterOfYear'

/**
 * Adds `.isoWeek()`. Additive only — unlike `updateLocale`, extending a plugin cannot
 * change the behaviour of dayjs calls made elsewhere in the app. See DESIGN.md,
 * "Intl for display, dayjs for arithmetic".
 */
dayjs.extend(isoWeekPlugin)
dayjs.extend(quarterOfYearPlugin)

/**
 * The unit one selection covers. `date` rather than `day` because that is what every call
 * site in this app already says — `DateRangePicker`'s `periodType`, the `filter.*` keys.
 */
export type CalendarPeriod = 'date' | 'month' | 'quarter' | 'year'

/** Ordered coarsest-last. Used to decide which views sit above the terminal one. */
export const CALENDAR_PERIODS: CalendarPeriod[] = ['date', 'month', 'quarter', 'year']

// `quarter` lives in `QUnitType`, added by the plugin, not in `OpUnitType`.
const DAYJS_UNIT: Record<CalendarPeriod, QUnitType> = {
  date: 'day',
  month: 'month',
  quarter: 'quarter',
  year: 'year',
}

/**
 * The canonical encoding of a period: its first instant, at local midnight. Every value the
 * Calendar emits is one of these, at `date` included — `startOfPeriod(d, 'date')` is exactly
 * the local midnight the component already emitted before periods existed.
 */
export function startOfPeriod(date: Date, period: CalendarPeriod): Date {
  return dayjs(date).startOf(DAYJS_UNIT[period]).toDate()
}

/**
 * The last instant of the period holding `date`. Not what the Calendar emits — it is the
 * sanctioned way for a consumer to expand a stored value into a range bound, e.g. the end
 * of a `DateRangePicker` pair. Without it every caller reinvents `endOf` and some forget,
 * which silently truncates the last period of the range.
 */
export function endOfPeriod(date: Date, period: CalendarPeriod): Date {
  return dayjs(date).endOf(DAYJS_UNIT[period]).toDate()
}

/** Do both dates fall in the same period? The unit of every comparison the Calendar makes. */
export function isSamePeriod(
  a: Date | Nullish,
  b: Date | Nullish,
  period: CalendarPeriod,
): boolean {
  if (!(a && b)) return false
  return dayjs(a).isSame(b, DAYJS_UNIT[period])
}

/** -1, 0 or 1, comparing the periods the two dates fall in. */
export function comparePeriod(a: Date, b: Date, period: CalendarPeriod): number {
  const left = dayjs(a).startOf(DAYJS_UNIT[period])
  const right = dayjs(b).startOf(DAYJS_UNIT[period])
  if (left.isBefore(right)) return -1
  if (left.isAfter(right)) return 1
  return 0
}

/**
 * Bounds are read at period granularity: `minDate` is floored to the period holding it, so
 * a period that merely *overlaps* the range is in bounds. With `minDate` on 15 June and
 * `period: 'month'`, June is selectable — and the value it emits (1 June) is therefore
 * earlier than `minDate` itself. See ADR-0008; consumers floor their own bound to match.
 */
export function isWithinPeriodBounds(
  date: Date,
  period: CalendarPeriod,
  minDate?: Date,
  maxDate?: Date,
): boolean {
  if (minDate && comparePeriod(date, minDate, period) < 0) return false
  if (maxDate && comparePeriod(date, maxDate, period) > 0) return false
  return true
}

/** 0-3: which quarter of its year a date falls in. */
export function quarterIndexOf(date: Date): number {
  return Math.floor(date.getMonth() / 3)
}

/** The four quarter starts of a year, in order. */
export function quartersOfYear(year: number): Date[] {
  return Array.from({ length: 4 }, (_, index) => new Date(year, index * 3, 1))
}

/** Quarter panel is 2 columns; the month panel is 3 and the year panel 4. */
export const QUARTER_PANEL_COLUMNS = 2

/** Sunday…Saturday, matching `Date.prototype.getDay`. */
export type WeekStartsOn = 0 | 1 | 2 | 3 | 4 | 5 | 6

export const DAYS_IN_WEEK = 7
/** Rows drawn when `fixedWeeks` is on. The natural range across all months is 4–6. */
export const FIXED_WEEK_ROWS = 6
/** Year panel page size. Pages tile on multiples of this — see ADR note in DESIGN.md. */
export const YEARS_PER_PAGE = 12
/** Month panel is 3 columns, year panel 4. Used by the arrow keymap. */
export const MONTH_PANEL_COLUMNS = 3
export const YEAR_PANEL_COLUMNS = 4
/**
 * Upper bound on the scan for the next non-disabled day. Two months clears any plausible
 * run of disabled days; without a cap, arrowing out of a fully-disabled range never
 * terminates, because arrows page across month boundaries.
 */
export const MAX_SKIP_SCAN_DAYS = 62

/** Local midnight on the same calendar day. Every Date this component emits is one of these. */
export function startOfDay(value: Date): Date {
  return dayjs(value).startOf('day').toDate()
}

/** First of the month at local midnight — the canonical Visible Month value. */
export function toMonthStart(value: Date): Date {
  return dayjs(value).startOf('month').toDate()
}

/**
 * Day-granular equality. The only comparison this component makes: a consumer's value may
 * carry a time component we deliberately never strip (see ADR-0007).
 */
export function isSameDay(a: Date | Nullish, b: Date | Nullish): boolean {
  if (!(a && b)) return false
  return dayjs(a).isSame(b, 'day')
}

export function isSameMonth(a: Date | Nullish, b: Date | Nullish): boolean {
  if (!(a && b)) return false
  return dayjs(a).isSame(b, 'month')
}

/** -1, 0 or 1, comparing calendar days and ignoring any time component. */
export function compareDay(a: Date, b: Date): number {
  const left = dayjs(a).startOf('day')
  const right = dayjs(b).startOf('day')
  if (left.isBefore(right)) return -1
  if (left.isAfter(right)) return 1
  return 0
}

export function addDays(value: Date, amount: number): Date {
  return dayjs(value).add(amount, 'day').toDate()
}

export function addMonths(value: Date, amount: number): Date {
  return dayjs(value).add(amount, 'month').toDate()
}

export function addYears(value: Date, amount: number): Date {
  return dayjs(value).add(amount, 'year').toDate()
}

/**
 * Inclusive bounds compared at day granularity, so `:max-date="new Date()"` — which carries
 * the current *time* — does not disable today.
 */
export function isWithinBounds(date: Date, minDate?: Date, maxDate?: Date): boolean {
  if (minDate && compareDay(date, minDate) < 0) return false
  if (maxDate && compareDay(date, maxDate) > 0) return false
  return true
}

/**
 * The grid for a Visible Month, as rows of 7 local-midnight Dates. Always starts on
 * `weekStartsOn` and always runs to a whole number of rows, so leading and trailing
 * Outside Days are part of the matrix rather than padding.
 */
export function buildMonthMatrix(options: {
  visibleMonth: Date
  weekStartsOn: WeekStartsOn
  fixedWeeks: boolean
}): Date[][] {
  const { visibleMonth, weekStartsOn, fixedWeeks } = options
  const firstOfMonth: Dayjs = dayjs(visibleMonth).startOf('month')

  // How far the 1st sits from the start of its displayed row.
  const leading = (firstOfMonth.day() - weekStartsOn + DAYS_IN_WEEK) % DAYS_IN_WEEK
  const gridStart = firstOfMonth.subtract(leading, 'day')

  const rows = fixedWeeks
    ? FIXED_WEEK_ROWS
    : Math.ceil((leading + firstOfMonth.daysInMonth()) / DAYS_IN_WEEK)

  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: DAYS_IN_WEEK }, (_, column) =>
      gridStart.add(row * DAYS_IN_WEEK + column, 'day').toDate()))
}

/**
 * The ISO 8601 week number a displayed row belongs to, defined as the ISO week of the
 * Thursday inside it.
 *
 * This is the ISO rule itself — a week belongs to the year containing its Thursday — reused
 * to settle a question ISO does not answer: with `weekStartsOn: 0` a displayed row straddles
 * two ISO weeks, because ISO weeks run Monday–Sunday. Taking the Thursday picks the week
 * holding six of the row's seven days, and is correct unchanged for every `weekStartsOn`.
 */
export function weekNumberForRow(row: Date[]): number {
  const thursday = row.find(date => date.getDay() === 4)
  // A row is always seven consecutive days, so exactly one Thursday is guaranteed.
  return dayjs(thursday ?? row[0]).isoWeek()
}

/** First year of the 12-year page holding `year`. Pages tile: every year is on exactly one. */
export function yearPageStart(year: number): number {
  return Math.floor(year / YEARS_PER_PAGE) * YEARS_PER_PAGE
}

/**
 * Roving-tabindex movement inside a month or year panel: steps by `delta`, skipping
 * disabled cells, and **clamps at the panel edges rather than paging**. Arrows stay on the
 * page; `PageUp`/`PageDown` and the nav buttons are what move between pages.
 *
 * Returns `from` when nothing enabled lies in that direction, so focus stays put.
 */
export function nextEnabledIndex(
  cells: { isDisabled: boolean }[],
  from: number,
  delta: number,
): number {
  for (let index = from + delta; index >= 0 && index < cells.length; index += delta) {
    if (!cells[index]!.isDisabled) return index
  }
  return from
}

export function yearPage(year: number): number[] {
  const start = yearPageStart(year)
  return Array.from({ length: YEARS_PER_PAGE }, (_, index) => start + index)
}
