import type { AutocompleteOption, UseAutocompleteReturn } from './useAutocomplete'

export interface AutocompleteContext {
  autocomplete: UseAutocompleteReturn<any>
  /** Labels the popup's listbox, so the control's own label is announced with it. */
  labelledBy: ComputedRef<string | undefined>
  listboxId: ComputedRef<string>
  /**
   * Whether the popup is open. `Dropdown` keeps the popover mounted through its leave
   * transition, so the popup needs this to tell "open" from "on the way out".
   */
  isOpen: Ref<boolean>
  /** Shown when there are no Visible Options and nothing is loading. */
  emptyText: ComputedRef<string>
  /** Shown while the Query is below `minQueryLength`, in place of an empty list. */
  minQueryText: ComputedRef<string>
  onOptionSelect: (option: AutocompleteOption<any>) => void
}

export const [provideAutocompleteContext, injectAutocompleteContext]
  = createContext<AutocompleteContext>('AutocompleteContext')
