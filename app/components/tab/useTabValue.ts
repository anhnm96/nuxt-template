import type { TabValue } from './context'
import { injectTabsRootContext, toPrimaryValue, toTabValues } from './context'

/**
 * What a tab or a panel owns, how it matches the model, and the pair of ids that point the
 * two at each other. The primary value is the tab's identity; see DESIGN.md, "A tab owns
 * values, not a value".
 */
export function useTabValue(value: () => TabValue) {
  const { tabsId, modelValue } = injectTabsRootContext()

  const values = computed(() => toTabValues(value()))
  const primaryValue = computed(() => toPrimaryValue(value()))
  const isSelected = computed(() => values.value.includes(modelValue.value))

  // `String()` rather than interpolation: a symbol value throws on implicit conversion.
  const id = computed(() => `${String(primaryValue.value)}__${tabsId}`)

  const tabId = computed(() => `tab-${id.value}`)
  const panelId = computed(() => `tab-panel-${id.value}`)

  return { values, primaryValue, isSelected, tabId, panelId }
}
