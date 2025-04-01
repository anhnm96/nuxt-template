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
} as const

export const INQUIRY_STATUS_OPTIONS = {
  PENDING: 'stat_01',
  RECEIVED: 'stat_02',
  INVESTIGATING: 'stat_03',
  INVESTIGATION_COMPLETED: 'stat_04',
  REPORT_CANCELLED: 'stat_05',
} as const

export const INQUIRY_DETAIL_STATUS_OPTIONS = {
  INVESTIGATING: 'stat_2_02',
  EXTRA_CHECKING: 'stat_2_01',
  WAITING_FOR_RESTORATION: 'stat_2_03',
  SIMPLY_REJECTED: 'stat_3_01',
  NORMAL_REJECT: 'stat_3_02',
  FALSE_REPORT: 'stat_3_03',
  RETRIEVED: 'stat_3_04',
  REJECT_CLAIM: 'stat_3_05',
  APPROVE_CLAIM: 'stat_3_06',
  CASH_TRANSACTION: 'stat_3_07',
} as const
