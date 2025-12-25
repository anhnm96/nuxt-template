export const useEditImageStore = defineStore('editImage', () => {
  const cursorStyle = shallowRef('default')
  const selectedIds = ref<string[]>([])
  const shapeRefs = shallowRef<Map<string, any>>(new Map())

  const tool = ref<string | null>('select')
  const isShapeDraggable = computed(() => {
    return tool.value === 'select' || tool.value === 'multiselect'
  })

  return { tool, isShapeDraggable, cursorStyle, shapeRefs, selectedIds }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useEditImageStore, import.meta.hot))
}
