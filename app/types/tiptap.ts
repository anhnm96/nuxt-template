import type { CSSProperties } from 'vue'

// Common properties for most toolbar items
interface BaseToolbarItem {
  label: string
  icon: MaybeRef<string>
  type: string
}

// Item types
export interface ButtonToolbarItem extends BaseToolbarItem {
  type: 'button'
  isActive?: ComputedRef<boolean | undefined> | Ref<boolean>
  action?: () => void
}

export interface CustomToolbarItem {
  type: 'separator' | 'link' | 'image' | 'table'
  label?: string // optional for separator
  icon?: string // optional for separator
}

export interface PopoverListItem {
  label: string
  value?: string | number
  icon?: string
  style?: CSSProperties
  action?: () => void
}

export interface PopoverToolbarItem extends BaseToolbarItem {
  type: 'popover'
  list: PopoverListItem[]
  value?: ComputedRef<string>
  action?: (value: any) => void
  buttonClass?: () => { [key: string]: boolean | undefined }
}

export interface ColorPickerToolbarItem extends BaseToolbarItem {
  type: 'colorpicker'
  attribute?: 'color' | 'backgroundColor'
  buttonStyle?: () => CSSProperties
  action?: (newColor: string) => void
}

// Union of all possible toolbar item types
export type ToolbarItem =
  | ButtonToolbarItem
  | CustomToolbarItem
  | PopoverToolbarItem
  | ColorPickerToolbarItem

// Type for the toolbarItems array
export type ToolbarItems = ToolbarItem[]
