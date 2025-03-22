<script lang="ts">
interface TabsContext {
  tabsId: string
  orientation: ComputedRef<'vertical' | 'horizontal'>
  activeTab: Ref<PrimitiveValue>
  selectTab: (value: PrimitiveValue) => void
}

export const [provideDialogRootContext, injectDialogRootContext]
= createContext<TabsContext>('TabsContext')
</script>

<script setup lang="ts">
const props = defineProps<{
  value: PrimitiveValue
  vertical?: boolean
}>()

const tabsId = useId()

const orientation = computed(() =>
  props.vertical ? 'vertical' : 'horizontal',
)

const activeTab = ref<PrimitiveValue>(props.value)
function selectTab(value: PrimitiveValue) {
  activeTab.value = value
}

provideDialogRootContext({
  tabsId,
  orientation,
  activeTab,
  selectTab,
})
</script>

<template>
  <div>
    <slot :active-tab="activeTab" />
  </div>
</template>
