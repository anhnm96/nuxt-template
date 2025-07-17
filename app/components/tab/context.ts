import type { ModelRef } from 'vue'

interface TabsContext {
  tabsId: string
  orientation: ComputedRef<'vertical' | 'horizontal'>
  modelValue: ModelRef<Primitive>
}

export const [provideTabsRootContext, injectTabsRootContext]
= createContext<TabsContext>('TabsContext')

interface TabPanelsContext {
  eager: boolean
}

export const [provideTabPanelsContext, injectTabPanelsContext]
= createContext<TabPanelsContext>('TabPanels')
