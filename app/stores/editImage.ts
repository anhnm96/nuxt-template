import type { LineConfig } from 'konva/lib/shapes/Line'
import type { TextConfig } from 'konva/lib/shapes/Text'
import type { Transformer } from 'konva/lib/shapes/Transformer'

export const useEditImageStore = defineStore('editImage', () => {
  const cursorStyle = shallowRef('default')
  const selectedIds = ref<string[]>([])

  const lines = ref<LineConfig[]>([])
  const lineRefs = shallowRef<Transformer[]>([])
  function setLineRef(el: Transformer, idx: number) {
    if (el) {
      lineRefs.value[idx] = el
    }
  }

  const texts = ref<TextConfig[]>([])
  const textRefs = shallowRef<Transformer[]>([])
  function setTextRef(el: Transformer, idx: number) {
    if (el) {
      textRefs.value[idx] = el
    }
  }
  return { cursorStyle, texts, textRefs, setTextRef, selectedIds, lines, lineRefs, setLineRef }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useEditImageStore, import.meta.hot))
}
