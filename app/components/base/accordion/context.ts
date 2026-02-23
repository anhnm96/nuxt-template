import type { ModelRef, ShallowRef } from 'vue'

interface AccordionContext {
  disabled: boolean
  expandedKeys: ModelRef<Set<Key>>
  toggleExpanded: (value: Key) => void
}

export const [provideAccordionContext, injectAccordionContext]
  = createContext<AccordionContext>('AccordionContext')

interface AccordionPanelContext {
  triggerId: string
  contentId: string
  panelContentRef: ShallowRef<HTMLElement | null>
  expanded: ComputedRef<boolean>
  toggleExpanded: (value?: boolean) => void
  disabled: boolean
}

export const [provideAccordionPanelContext, injectAccordionPanelContext]
  = createContext<AccordionPanelContext>('AccordionPanelContext')
