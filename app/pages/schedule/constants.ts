/** Monochrome icons, rendered with `<Icon>` (iconify names). */
export const icons = [
  { name: 'mdi:check-circle-outline', title: 'OK', code: '01' },
  { name: 'mdi:close-circle-outline', title: 'NG', code: '02' },
  { name: 'mdi:account-group', title: '会議', code: '11' },
  { name: 'mdi:walk', title: '外出', code: '21' },
  { name: 'mdi:alert', title: '重要', code: '31' },
  { name: 'mdi:phone', title: '電話', code: '41' },
  { name: 'mdi:account', title: '来客', code: '51' },
  { name: 'mdi:car', title: '車', code: '61' },
  { name: 'mdi:train', title: '電車', code: '71' },
  { name: 'mdi:airplane', title: '飛行機', code: '81' },
  { name: 'mdi:office-building', title: 'ビル・ホテル', code: '91' },
  { name: 'mdi:bag-suitcase', title: '出張・旅行', code: '92' },
  { name: 'mdi:web', title: 'ウェブ', code: '93' },
]

export const SCHEDULE_CODES = {
  PERSONAL: 1,
  MEETING: 4,
  TODO: 2,
}

export const SCHEDULE_CODE_LABEL_MAP: Record<number, string> = {
  [SCHEDULE_CODES.PERSONAL]: 'Personal',
  [SCHEDULE_CODES.MEETING]: 'MMeeting',
  [SCHEDULE_CODES.TODO]: 'Task',
}
