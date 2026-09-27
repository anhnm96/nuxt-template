import type { Dayjs } from 'dayjs/esm'
import dayjs from 'dayjs/esm'
import isoWeekPlugin from 'dayjs/esm/plugin/isoWeek'

/**
 * Adds `.isoWeek()`. Additive only — unlike `updateLocale`, extending a plugin cannot
 * change the behaviour of dayjs calls made elsewhere in the app. See DESIGN.md,
 * "Intl for display, dayjs for arithmetic".
 */
dayjs.extend(isoWeekPlugin)

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
