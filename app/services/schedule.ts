export function getScheduleList(start: string, end: string, type: string) {
  return useNuxtApp().$api<ApiResponse<ScheduleListResponse>>('/schedule/list', {
    query: {
      start,
      end,
      widget: false,
      type,
    },
  })
}

export interface ScheduleListResponse {
  /** Calendars, grouped for the sidebar / timeline rows. */
  calendars: CalendarGroup[]
  events: ScheduleEvent[]
}

/** A group of calendars, e.g. "Owned Calendars". */
export interface CalendarGroup {
  id: string
  title: string
  children: CalendarItem[]
}

/** A single calendar — one checkbox in the sidebar, one row on the timeline. */
export interface CalendarItem {
  id: string
  title: string
  /** Any CSS color value, e.g. `var(--color-blue-500)`. */
  color: string
}

export interface ScheduleEvent {
  id: string
  title: string
  /** ISO date-time string. */
  start: string
  /** ISO date-time string. */
  end: string
  /** Id of the calendar this event belongs to. */
  resourceId: string
  allDay?: boolean
  /** Per-event color override; falls back to its calendar's color. */
  color?: string
}

/**
 * A `ScheduleEvent` prepared for display: timestamps resolved to ms and the
 * color resolved against its calendar.
 */
export interface ScheduleEventUI extends Omit<ScheduleEvent, 'start' | 'end'> {
  start: number
  end: number
  /** `false` for all-day events. */
  timed: boolean
  color: string
  /** Title of the calendar this event belongs to. */
  calendarTitle: string
}
