import type { UseAutocompleteReturn } from './useAutocomplete'

/** What `AutocompletePopup` needs beyond the rows. The rows read `ListboxContext`. */
export interface AutocompleteContext {
  autocomplete: UseAutocompleteReturn<any>
  /** Labels the popup's listbox, so the control's own label is announced with it. */
  labelledBy: ComputedRef<string | undefined>
  listboxId: ComputedRef<string>
  /**
   * Whether the popup is open. `Popover` keeps the surface mounted through its leave
   * transition, so the popup needs this to tell "open" from "on the way out".
   */
  isOpen: Ref<boolean>
  /** Shown when there are no Visible Options and nothing is loading. */
  emptyText: ComputedRef<string>
}

export const [provideAutocompleteContext, injectAutocompleteContext]
  = createContext<AutocompleteContext>('AutocompleteContext')
