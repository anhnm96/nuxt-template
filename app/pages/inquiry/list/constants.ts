export const PAGE_INQUIRY_LIST = 'PAGE_INQUIRY_LIST'

export const TAB = {
  MY_INQUIRIES: 0,
  ALL_INQUIRIES: 1,
} as const

export const REPORT_INQUIRY_OPTION_ALL = 'all'

export const REPORT_INQUIRY_MANAGEMENT_LIST_SORT_BY = {
  RECEIVED_DATE__DESC: 'LA',
  RECEIVED_DATE__ASC: 'OA',
  STATUS_CHANGE_DATE__DESC: 'LM',
  STATUS_CHANGE_DATE__ASC: 'OM',
  ANSWER_DATE__DESC: 'LAS',
  ANSWER_DATE__ASC: 'OAS',
} as const

export const REPORT_INQUIRY_CATEGORY_OPTIONS = {
  THEFT: '01',
  APPEAL: '02',
} as const

export const REPORT_INQUIRY_LIST_COLUMN = {
  CATEGORY: 'category',
  INQUIRY_NUMBER: 'inquiry_number',
  STATUS: 'status',
  DETAIL_STATUS: 'detail_status',
  ESTIMATED_DAMAGE_DATE: 'estimated_damage_date',
  TITLE: 'title',
  RECEPTION_DATE: 'reception_date',
  RELAY: 'relay',
  MEMBER_NO: 'member_no',
  GUID: 'guid',
  COUNTRY: 'country',
  LANGUAGE: 'language',
  NUMBER_OF_INQUIRIES: 'number_of_inquiries',
  STATUS_CHANGE_DATE: 'status_change_date',
  ANSWER_DATE: 'answer_date',
  CONTACT_PERSON: 'contact_person',
  NEW_WINDOW: 'new_window',
} as const
