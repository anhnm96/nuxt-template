export const useTooltipStore = defineStore('tooltip', () => {
  const tooltips = ref<Set<string>>(new Set())
  const hasVisibleTooltip = computed(() => tooltips.value.size > 0)

  function addTooltip(id: string) {
    tooltips.value.add(id)
  }

  function removeTooltip(id: string) {
    tooltips.value.delete(id)
  }

  return { tooltips, hasVisibleTooltip, addTooltip, removeTooltip }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useTooltipStore, import.meta.hot))
}
