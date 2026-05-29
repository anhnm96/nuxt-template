import type { Dayjs } from 'dayjs'
import type { ManipulateType, OpUnitType, QUnitType } from 'dayjs/esm'
import dayjs from 'dayjs'
import quarterOfYear from 'dayjs/plugin/quarterOfYear'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(timezone)
dayjs.extend(quarterOfYear)

export const DATE_SEPARATOR = '.'
export const CALENDAR_DATE_FORMAT = `yy${DATE_SEPARATOR}mm${DATE_SEPARATOR}dd`
export const CALENDAR_DATE_PLACEHOLDER = `YYYY${DATE_SEPARATOR}MM${DATE_SEPARATOR}DD`
export const CALENDAR_DATE_TIME_PLACEHOLDER = `YYYY${DATE_SEPARATOR}MM${DATE_SEPARATOR}DD HH:mm`
export const CALENDAR_DATE_WITH_YEAR_FORMAT = 'yy'
export const CALENDAR_DATE_WITH_MONTH_FORMAT = `yy${DATE_SEPARATOR}mm`
export const DATE_WITH_YEAR_PLACEHOLDER = 'YYYY'
export const DATE_WITH_MONTH_PLACEHOLDER = `YYYY${DATE_SEPARATOR}MM`
export const DATE_WITH_QUARTER_PLACEHOLDER = `YYYY${DATE_SEPARATOR}Q`
export const DATE_TIME_PLACEHOLDER = `YYYY${DATE_SEPARATOR}MM${DATE_SEPARATOR}DD HH:MM`
export const DATE_TIME_WITH_SECOND_PLACEHOLDER = `YYYY${DATE_SEPARATOR}MM${DATE_SEPARATOR}DD HH:MM:SS`
export const DATE_TIME_FULL_PLACEHOLDER = `YYYY${DATE_SEPARATOR}MM${DATE_SEPARATOR}DD HH:MM:SS (Z)`

export const DATE_FORMAT = `YYYY${DATE_SEPARATOR}MM${DATE_SEPARATOR}DD`
export const DATE_TIME_FORMAT = `YYYY${DATE_SEPARATOR}MM${DATE_SEPARATOR}DD HH:mm`
export const DATE_TIME_WITH_SECOND_FORMAT = `YYYY${DATE_SEPARATOR}MM${DATE_SEPARATOR}DD HH:mm:ss`

function parseToDayJs(value: string | number | Date | Nullish, timeZone?: string): Dayjs {
  if (typeof value === 'number') {
    return value.toString().length === 10
      ? dayjs.unix(value)
      : dayjs(value)
  }

  if (timeZone) {
    return dayjs.tz(value, timeZone)
  }

  return dayjs(value)
}

export function formatDateTime(value: string | number | Date | Nullish, format: string = DATE_TIME_FORMAT, timeZone?: string) {
  const dayJsDate = parseToDayJs(value, timeZone)

  if (!dayJsDate.isValid()) {
    return null
  }

  return dayJsDate.format(format)
}

export function roundDate(date: Date | number | Nullish, type: QUnitType | OpUnitType, isEndDate = false) {
  const dayJsDate = parseToDayJs(date)

  if (!dayJsDate.isValid()) {
    return undefined
  }

  if (isEndDate) {
    return dayJsDate.endOf(type as any).toDate()
  }

  return dayJsDate.startOf(type as any).toDate()
}

export function getPresetDate(presetValue: string, date?: Date) {
  const presetLast = 'last_'
  const presetPrevious = 'previous_'
  const currentDate = new Date()
  let dayJsStart = dayjs(date || currentDate)
  let dayJsEnd = dayjs(date || currentDate)

  // preset last n unit
  if (presetValue.startsWith(presetLast)) {
    const [offset, unit] = presetValue.replace(presetLast, '').split('_')

    dayJsStart = dayJsStart.subtract(+offset! - 1, unit as ManipulateType).startOf(unit as ManipulateType)
    dayJsEnd = dayJsEnd.endOf(unit as ManipulateType)
  }

  // preset previous n unit
  if (presetValue.startsWith(presetPrevious)) {
    const [offset, unit] = presetValue.replace(presetPrevious, '').split('_')

    dayJsStart = dayJsStart.subtract(+offset! - 1, unit as ManipulateType).startOf(unit as ManipulateType)
    dayJsEnd = dayJsStart.endOf(unit as ManipulateType)
  }

  return { startDate: dayJsStart.toDate(), endDate: dayJsEnd.toDate() }
}

/** compare 2 dates, return -1 or 0 or 1 */
export function compareDates(date1?: string | number | Date, date2?: string | number | Date) {
  // convert the dates to Date objects.
  const d1 = parseDate(date1) as Date
  const d2 = parseDate(date2) as Date

  // Compare the dates using the getTime() method.
  if (!(d1 && d2)) {
    return 0
  }

  if (d1.getTime() < d2.getTime()) {
    return -1
  }

  if (d1.getTime() > d2.getTime()) {
    return 1
  }

  return 0
}

/**
 * return a Date | null
 * @param value - string | number | null | undefined | date
 * @returns Date | null
 * Examples: For current date = 2023-08-22 16:40, UTC+7, no input zone
 * 1692696654000                => Tue Aug 22 2023 16:30:54 GMT+0700
 * 1692696654                   => Tue Aug 22 2023 16:30:54 GMT+0700
 * new Date()                   => Tue Aug 22 2023 16:40:00 GMT+0700
 * '2023-08-22'                 => Tue Aug 22 2023 07:00:00 GMT+0700
 * '2023-08-22 08:00'           => Tue Aug 22 2023 15:00:00 GMT+0700
 * '2023/08/22 08:00'           => Tue Aug 22 2023 15:00:00 GMT+0700
 * '2023-08-22T08:00'           => Tue Aug 22 2023 15:00:00 GMT+0700
 * '2023-08-22T08:00:00'        => Tue Aug 22 2023 15:00:00 GMT+0700
 * '2023-08-22T09:40:00.927Z'   => Tue Aug 22 2023 16:40:00 GMT+0700
 * '2023-08-22T09:40:00+07:00'  => Tue Aug 22 2023 09:40:00 GMT+0700
 */
export function parseDate(value: string | number | Date | Nullish, timeZone?: string): Date | null {
  if (!value) {
    return null
  }

  // ISO time
  if (typeof value === 'string') {
    // replace all '/' by '-'
    value = value.trim().replace(/\//g, '-')

    if (value.length === 10) {
      // yyyy-MM-dd
      value = value.concat('T00:00:00Z')
    }

    if (value.includes(' ')) {
      // yyyy-MM-dd HH:mm
      value = value.replace(' ', 'T')
    }

    const timezoneReg = /[+-]\d{2}:\d{2}$/ // ex: +07:00, -07:00

    // missing 'Z' and not include timezone
    if (value.includes('T') && !value.includes('Z') && !timezoneReg.test(value)) {
      value = value.concat('Z')
    }
  }

  const dayJsDate = parseToDayJs(value, timeZone)

  return dayJsDate.isValid() ? dayJsDate.toDate() : null
}

export function getQuarter(date: Nullish | string | number | Date) {
  const dayJsDate = parseToDayJs(date)

  return dayJsDate.isValid() ? dayJsDate.quarter() : null
}
