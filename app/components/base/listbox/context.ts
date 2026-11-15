import type { VirtualProp } from './useVirtualRows'
import type { ListOption } from '~/composables/useOptionList'

/**
 * The live state an option row reads. A host provides it from its `useOptionList`.
 *
 * What `Listbox` draws is not here. It arrives as props, so a host can freeze it — see
 * DESIGN.md.
 */
export interface ListboxContext {
  activeKey: Ref<Key | null>
  isSelected: (option: ListOption<any>) => boolean
  /** Moves the Active Option without scrolling. Pointer hover calls it. */
  setActiveIndex: (index: number) => void
  /** The host decides whether this replaces, toggles or commits, and whether to close. */
  onOptionSelect: (option: ListOption<any>) => void
  /**
   * `Listbox` gives the list the function that scrolls an Option into view. Only `Listbox`
   * knows which Rows are in the document.
   */
  setScrollToIndex: (scrollToIndex: (index: number) => void) => void
  /** The `virtual` prop of the host. It is a mode and not content, so a host does not freeze it. */
  virtual: () => VirtualProp | undefined
}

export const [provideListboxContext, injectListboxContext]
  = createContext<ListboxContext>('ListboxContext')

/**
 * Provides `ListboxContext` from a host's option list. `list` is the return value of
 * `useOptionList`, or of a composable that passes those four members through.
 */
export function provideListbox(
  list: Pick<ListboxContext, 'activeKey' | 'isSelected' | 'setActiveIndex' | 'setScrollToIndex'>,
  onOptionSelect: ListboxContext['onOptionSelect'],
  virtual: ListboxContext['virtual'] = () => undefined,
) {
  provideListboxContext({
    activeKey: list.activeKey,
    isSelected: list.isSelected,
    setActiveIndex: list.setActiveIndex,
    setScrollToIndex: list.setScrollToIndex,
    onOptionSelect,
    virtual,
  })
}
