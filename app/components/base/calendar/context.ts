import type { CalendarLabels, UseCalendarReturn } from './useCalendar'

export interface CalendarContext {
  calendar: UseCalendarReturn
  labels: ComputedRef<CalendarLabels>
  /** Base id; the grid and its panels derive their own from it. */
  id: ComputedRef<string>
  disabled: ComputedRef<boolean>
  showWeekNumbers: ComputedRef<boolean>
}

export const [provideCalendarContext, injectCalendarContext]
  = createContext<CalendarContext>('CalendarContext')
