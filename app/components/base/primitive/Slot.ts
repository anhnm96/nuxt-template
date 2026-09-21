import type { SetupContext, VNode } from 'vue'
import { cloneVNode, Comment, Fragment, mergeProps } from 'vue'

function renderSlotFragments(children?: VNode[]): VNode[] {
  if (!children)
    return []
  return children.flatMap((child) => {
    if (child.type === Fragment)
      return renderSlotFragments(child.children as VNode[])

    return [child]
  })
}

export default function Slot(_props: any, { attrs, slots }: SetupContext) {
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
