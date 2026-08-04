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

/** Colored variants, served as images from `/img/schedule/<name>.png`. */
export const coloredIcons = [
  { name: 'check-circle-outline', title: 'OK', code: '03' },
  { name: 'close-circle-outline', title: 'NG', code: '04' },
  { name: 'account-group', title: '会議', code: '12' },
  { name: 'walk', title: '外出', code: '22' },
  { name: 'alert', title: '重要', code: '32' },
  { name: 'phone', title: '電話', code: '42' },
  { name: 'account', title: '来客', code: '52' },
  { name: 'car', title: '車', code: '62' },
  { name: 'train', title: '電車', code: '72' },
  { name: 'airplane', title: '飛行機', code: '82' },
  { name: 'office-building', title: 'ビル・ホテル', code: '94' },
  { name: 'bag-suitcase', title: '出張・旅行', code: '95' },
  { name: 'web', title: 'ウェブ', code: '96' },
]

export const SCHEDULE_CODES = {
  PERSONAL: 1,
  MEETING: 4,
  TODO: 2,
}

export const SCHEDULE_CODE_LABEL_MAP: Record<number, string> = {
  [SCHEDULE_CODES.PERSONAL]: '個人',
  [SCHEDULE_CODES.MEETING]: '会議',
  [SCHEDULE_CODES.TODO]: 'ToDo',
}

/** No icon assigned. */
export const SCHEDULE_ICON_NONE = '00'

/**
 * Resolve a schedule's icon code to something renderable:
 * `Icon` for iconify names, `img` for the colored PNG variants.
 */
export function resolveScheduleIcon(iconCd: string): { iconUrl?: string, iconTag?: 'Icon' | 'img' } {
  if (iconCd === SCHEDULE_ICON_NONE) return {}
  const icon = icons.find(i => i.code === iconCd)
  if (icon) return { iconUrl: icon.name, iconTag: 'Icon' }
  const colored = coloredIcons.find(i => i.code === iconCd)
  if (colored) return { iconUrl: `/img/schedule/${colored.name}.png`, iconTag: 'img' }
  return {}
}
