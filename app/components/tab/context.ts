import type { ModelRef, Reactive } from 'vue'

interface TabsContext {
  tabsId: string
  orientation: ComputedRef<'vertical' | 'horizontal'>
  modelValue: ModelRef<PrimitiveValue>
  activeItem: Reactive<{ size: number, position: number }>
}

export const [provideTabsRootContext, injectTabsRootContext]
= createContext<TabsContext>('TabsContext')

interface TabPanelsContext {
  eager: boolean
}

export const [provideTabPanelsContext, injectTabPanelsContext]
= createContext<TabPanelsContext>('TabPanels')
