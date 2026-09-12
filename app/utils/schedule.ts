import type { Dayjs } from 'dayjs/esm'

/**
 * Pixel height of one hour row, per zoom level.
 *
 * Every vertical measurement in the week view derives from the active value,
 * so nothing else may hard-code a row height.
 */
export const HOUR_HEIGHTS = {
  COMPACT: 40,
  NORMAL: 56,
  COMFORTABLE: 80,
} as const
export type HourHeight = ValueOf<typeof HOUR_HEIGHTS>

/** Zoom level the week view starts at. */
export const HOUR_HEIGHT: HourHeight = HOUR_HEIGHTS.NORMAL

export const EVENT_LAYOUT = {
  /** Overlapping events split the column width side by side. */
  COLUMNS: 'columns',
  /** Overlapping events cascade on top of each other with a small indent. */
  STACK: 'stack',
} as const
export type EventLayoutMode = ValueOf<typeof EVENT_LAYOUT>

export const ALL_DAY_DISPLAY = {
  /** All-day events are listed in a frozen column next to the calendar name. */
  COLUMN: 'column',
  /** All-day events are bars on the timeline, spanning the days they cover. */
  TIMELINE: 'timeline',
} as const
export type AllDayDisplay = ValueOf<typeof ALL_DAY_DISPLAY>

export interface DayColumn {
  key: string
  label: string
  date: string
  dayjs: Dayjs
  isToday: boolean
}
