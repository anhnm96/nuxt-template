import TipTapImage from '@tiptap/extension-image'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import ResizeImage from '~/components/tiptap/ResizeImage.vue'

// based on https://github.com/ueberdosis/tiptap/issues/333#issuecomment-1944535772
// official solution is not available yet
// https://github.com/ueberdosis/tiptap/pull/6285
export default TipTapImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { renderHTML: ({ width }) => ({ width }) },
      height: { renderHTML: ({ height }) => ({ height }) },
      style: {
        parseHTML: (element) => {
          return element.style.cssText
        },
      },
    }
  },
  addNodeView() {
    return VueNodeViewRenderer(ResizeImage)
  },
})
