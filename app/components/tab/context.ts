import type { ModelRef } from 'vue'

/** What a tab matches against the model. A tab may own several values. */
type TabValue = Primitive | Primitive[]

/** How a tab answers the root: how to select it, and whether it owns the model value. */
interface TabRegistration {
  select: () => void
  isSelected: () => boolean
}

interface TabsContext {
  tabsId: string
  orientation: ComputedRef<'vertical' | 'horizontal'>
  modelValue: ModelRef<Primitive>
  /**
   * Register the element a tab renders. The root needs both halves of the registration;
   * see DESIGN.md, "The indicator asks the root, never the DOM".
   */
  registerTab: (el: HTMLElement, registration: TabRegistration) => void
  unregisterTab: (el: HTMLElement) => void
  /** Select the tab that owns `el`. Does nothing when `el` is not a registered tab. */
  selectTab: (el: HTMLElement) => void
  /** The element of the tab that owns the model value. */
  activeTabEl: ComputedRef<HTMLElement | undefined>
}

export const [provideTabsRootContext, injectTabsRootContext]
  = createContext<TabsContext>('TabsContext')

interface TabPanelsContext {
  eager: boolean
}

export const [provideTabPanelsContext, injectTabPanelsContext]
  = createContext<TabPanelsContext>('TabPanels')

/** Normalize a tab value to the list of values the tab owns. */
export function toTabValues(value: TabValue): Primitive[] {
  return Array.isArray(value) ? value : [value]
}

/** The value that identifies a tab. A tab may own several; the first one is its identity. */
export function toPrimaryValue(value: TabValue): Primitive {
  return toTabValues(value)[0]!
}

export type { TabRegistration, TabValue }
