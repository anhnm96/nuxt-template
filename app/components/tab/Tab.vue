<script setup lang="ts">
import type { TabValue } from './context'
import { injectTabsRootContext, isTabDisabled } from './context'
import { useTabValue } from './useTabValue'

const props = withDefaults(defineProps<{
  as?: string
  value: TabValue
}>(), { as: 'button' })

const { modelValue, registerTab, unregisterTab } = injectTabsRootContext()

const tabEl = useTemplateRef<HTMLElement>('tab')

const { values, primaryValue, isSelected, tabId, panelId } = useTabValue(() => props.value)

function select() {
  modelValue.value = primaryValue.value
}

// A multi-value tab has no single value to commit, so its content owns the click.
// See DESIGN.md, "A tab owns values, not a value".
function onClick() {
  // A native `disabled` button raises no click. `aria-disabled` does not stop one.
  if (tabEl.value && isTabDisabled(tabEl.value)) return
  if (values.value.length === 1) select()
}

let registeredEl: HTMLElement | undefined

onMounted(() => {
  registeredEl = tabEl.value ?? undefined
  if (registeredEl) registerTab(registeredEl, { select, isSelected: () => isSelected.value })
})

onBeforeUnmount(() => {
  if (registeredEl) unregisterTab(registeredEl)
  registeredEl = undefined
})
</script>

<template>
  <component
    :is="as"
    :id="tabId"
    ref="tab"
    role="tab"
    :type="as === 'button' ? 'button' : undefined"
    :aria-controls="panelId"
    :aria-selected="isSelected"
    :tabindex="isSelected ? 0 : -1"
    class="btn"
    :class="[isSelected ? 'btn-text-primary selected' : 'btn-text']"
    @click="onClick"
  >
    <slot :is-selected />
  </component>
</template>
