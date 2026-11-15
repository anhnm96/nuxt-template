import type { CalendarLabels, UseCalendarReturn } from './useCalendar'

export interface CalendarContext {
  calendar: UseCalendarReturn
  labels: ComputedRef<CalendarLabels>
  disabled: ComputedRef<boolean>
  showWeekNumbers: ComputedRef<boolean>
}

export const [provideCalendarContext, injectCalendarContext]
  = createContext<CalendarContext>('CalendarContext')
