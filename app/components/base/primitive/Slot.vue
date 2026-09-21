<script lang="ts">
import type { VNode } from 'vue'
import { cloneVNode, Comment, defineComponent, Fragment, mergeProps } from 'vue'

export default defineComponent({
  name: 'PrimitiveSlot',
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    function renderSlotFragments(children?: VNode[]): VNode[] {
      if (!children)
        return []
      return children.flatMap((child) => {
        if (child.type === Fragment)
          return renderSlotFragments(child.children as VNode[])

        return [child]
      })
    }
    return () => {
      if (!slots.default)
        return null

      const children = renderSlotFragments(slots.default())
      const firstNonCommentChildrenIndex = children.findIndex(child => child.type !== Comment)
      if (firstNonCommentChildrenIndex === -1)
        return children

      const firstNonCommentChildren = children[firstNonCommentChildrenIndex]!

      // Remove props ref from being inferred
      delete firstNonCommentChildren.props?.ref

      // Manually merge props to ensure `firstNonCommentChildren.props`
      // has higher priority than `attrs` and can override `attrs`.
      // Otherwise `cloneVNode(firstNonCommentChildren, attrs)` will
      // prioritize `attrs` and override `firstNonCommentChildren.props`.
      const mergedProps = firstNonCommentChildren.props
        ? mergeProps(attrs, firstNonCommentChildren.props)
        : attrs
      const cloned = cloneVNode({ ...firstNonCommentChildren, props: {} }, mergedProps)

      if (children.length === 1)
        return cloned

      children[firstNonCommentChildrenIndex] = cloned
      return children
    }
  },
})
</script>
