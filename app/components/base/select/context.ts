import type { SelectOption, UseSelectReturn } from './useSelect'

export interface SelectContext {
  select: UseSelectReturn<any>
  /** Labels the popup's listbox, so the control's own label is announced with it. */
  labelledBy: ComputedRef<string | undefined>
  listboxId: ComputedRef<string>
  multiple: boolean
  loading: ComputedRef<boolean>
  searchable: ComputedRef<boolean>
  /** Placeholder for the search field. */
  searchPlaceholder: ComputedRef<string | undefined>
  /** Shown when there are no Visible Options and nothing is loading. */
  emptyText: ComputedRef<string>
  onOptionSelect: (option: SelectOption<any>) => void
}

export const [provideSelectContext, injectSelectContext]
  = createContext<SelectContext>('SelectContext')
