<script setup lang="ts">
import type { TabRegistration } from './context'
import { provideTabsRootContext } from './context'

const props = withDefaults(defineProps<{
  vertical?: boolean
  duration?: number
}>(), { duration: 130 })

const tabsId = useId()

const orientation = computed(() =>
  props.vertical ? 'vertical' : 'horizontal',
)

const modelValue = defineModel<Primitive>('value', { required: true })

// Reactive because a tab registers in its `onMounted`, which runs after the indicator's.
// The indicator must re-measure once the tabs arrive.
const tabs = shallowReactive(new Map<HTMLElement, TabRegistration>())

const activeTabEl = computed(() => {
  for (const [el, tab] of tabs) {
    if (tab.isSelected()) return el
  }
  return undefined
})

provideTabsRootContext({
  tabsId,
  orientation,
  modelValue,
  registerTab: (el, registration) => void tabs.set(el, registration),
  unregisterTab: el => void tabs.delete(el),
  selectTab: el => tabs.get(el)?.select(),
  activeTabEl,
})
</script>

<template>
  <div>
    <slot :active-value="modelValue" />
  </div>
</template>
