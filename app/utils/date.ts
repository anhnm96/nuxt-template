import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(timezone)

export const DATE_SEPARATOR = '.'
export const DATE_FORMAT = `YYYY${DATE_SEPARATOR}MM${DATE_SEPARATOR}DD`
export const DATE_TIME_FORMAT = `YYYY${DATE_SEPARATOR}MM${DATE_SEPARATOR}DD HH:mm`
export const DATE_TIME_WITH_SECOND_FORMAT = `YYYY${DATE_SEPARATOR}MM${DATE_SEPARATOR}DD HH:mm:ss`

function parseToDayJs(value: string | number | Date | null, timeZone?: string): Dayjs {
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

export function formatDateTime(value: string | number | Date | null, format: string = DATE_TIME_FORMAT, timeZone?: string) {
  const dayJsDate = parseToDayJs(value, timeZone)

  if (!dayJsDate.isValid()) {
    return null
  }

  return dayJsDate.format(format)
}
