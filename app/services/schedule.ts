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
  otherCalendarList: CalendarItem[]
  ownCalendarList: CalendarItem[]
  scheduleList: ScheduleEvent[]
}

export interface CalendarItem {
  calendarCd: string
  calendarColor: string
  calendarId: string
  calendarName: string
  calendarStyle: string
  calendarViewFlg: string
  initSelectId: string
  subCalendarId: string
}
export interface ScheduleEvent {
  alldayFlg: string
  attendanceCd: MaybeNull<string>
  calendarCd: string
  calendarColor: string
  calendarId: number
  calendarName: string
  calendarViewFlg: string
  calendarViewFlg2: string
  createUserId: number
  createUserName: MaybeNull<string>
  details: string
  endDate: string
  endDateString: string
  foreignRefId1: null
  lastUpdateDate: string
  meetingOwnerId: number
  memberNames: MaybeNull<string>
  permissionCd: string
  privateScheduleFlg: string
  referenceScheduleId: null
  repeatId: null
  repeatOriginDate: MaybeNull<string>
  scheduleCd: number
  scheduleColor: MaybeNull<string>
  scheduleIconCd: string
  scheduleId: number
  scheduleLocation: string
  scheduleTitle: string
  startDate: string
  startDateString: string
  todoCompletFlg: null
  urlLink: MaybeNull<string>
  userId: number
  viewCalendarCd: string
  viewCalendarId: number
  viewPriorityNumber: number
}
