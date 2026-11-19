import type { MaybeRefOrGetter } from 'vue'
import type { TreeNode, useTree } from './useTree'
import type { GestureModifiers } from '~/utils/modifiers'

/**
 * How a click, a key and a focus move change the selection: the Selection Behavior, the Anchor
 * Node and the Range. Terms in Title Case are defined in CONTEXT.md, section Tree.
 *
 * It owns no focus and no DOM. The caller gives the Node that had focus before a gesture, so
 * that this file never reads focus. See DESIGN.md, "Selection gestures".
 */

export type TreeSelectionBehavior = 'toggle' | 'replace'

export interface UseTreeSelectionOptions<I> {
  tree: ReturnType<typeof useTree<I>>
  multiple: MaybeRefOrGetter<boolean>
  behavior: MaybeRefOrGetter<TreeSelectionBehavior>
  /** The Values the model holds, as `useTree` reads them. */
  selectedValues: MaybeRefOrGetter<unknown[]>
  /** Writes the model: an array for a multiple Tree, a Value or `null` for a single Tree. */
  write: (value: unknown) => void
}

export function useTreeSelection<I>(options: UseTreeSelectionOptions<I>) {
  const { tree } = options
  const isMultiple = () => toValue(options.multiple)
  const isReplace = () => toValue(options.behavior) === 'replace'

  /**
   * The Node object and not its Key, so that it resolves to its nearest Visible ancestor when
   * it is hidden or its Item leaves `items`. The same pattern as `focusedNode` in `Tree.vue`.
   */
  let anchorNode: TreeNode<I> | null = null

  /**
   * The Anchor Node resolved to a Visible Node. Without one, `fallback` becomes the Anchor
   * Node. `fallback` is the Node that had focus before the gesture.
   */
  function resolveAnchor(fallback: TreeNode<I> | null | undefined): TreeNode<I> | undefined {
    // After a new build, the Anchor Node moves to the Node with the same Key, so that it does
    // not keep the old build in memory. A removed Node keeps its old object, so that it still
    // resolves to its nearest Visible ancestor.
    if (anchorNode) anchorNode = tree.nodeByKey.value.get(anchorNode.key) ?? anchorNode
    const resolved = anchorNode ? tree.nearestVisible(anchorNode) : undefined
    if (resolved) return resolved
    if (!fallback) return undefined
    const visible = tree.nearestVisible(fallback)
    anchorNode = visible ?? null
    return visible
  }

  /** The Range from `a` to `b`, both included, in the order of the Visible Nodes. */
  function range(a: TreeNode<I>, b: TreeNode<I>): TreeNode<I>[] {
    const from = tree.visibleIndex.value.get(a.key)
    const to = tree.visibleIndex.value.get(b.key)
    if (from === undefined || to === undefined) return [b]
    return tree.visibleNodes.value.slice(Math.min(from, to), Math.max(from, to) + 1)
  }

  // ---------------------------------------------------------------- model writes

  /** Sets each Node that can be selected to `selected`. Keeps the Values of other Nodes. */
  function setNodes(nodes: TreeNode<I>[], selected: boolean) {
    const targets = nodes.filter(node => tree.canSelect(node) && tree.isSelected(node) !== selected)
    if (!targets.length) return
    const current = toValue(options.selectedValues)
    if (selected) {
      options.write([...current, ...targets.map(node => node.value)])
      return
    }
    const keys = new Set(targets.map(node => node.key))
    options.write(current.filter((value) => {
      const key = tree.keyOfValue(value)
      return key === null || !keys.has(key)
    }))
  }

  /**
   * A multiple Tree: makes the Nodes that can be selected the only Selected Nodes. When no Node
   * can be selected, the selection stays, as it does when focus moves to such a Node.
   */
  function selectOnly(nodes: TreeNode<I>[]) {
    const targets = nodes.filter(tree.canSelect)
    if (!targets.length) return
    const current = toValue(options.selectedValues)
    const unchanged = current.length === targets.length && targets.every(tree.isSelected)
    if (!unchanged) options.write(targets.map(node => node.value))
  }

  /**
   * Makes `node` the only Selected Node and the Anchor Node. A Node that cannot be selected
   * changes nothing. In a single Tree this is every selection, and it never clears the model.
   */
  function replaceWith(node: TreeNode<I>) {
    if (!tree.canSelect(node)) return
    anchorNode = node
    if (isMultiple()) selectOnly([node])
    else if (!tree.isSelected(node)) options.write(node.value)
  }

  // ------------------------------------------------------------------ operations

  /**
   * Adds or removes one Node and keeps the others. In a single Tree it clears the model when
   * the Node is selected. Sets the Anchor Node.
   */
  function toggleSelected(node: TreeNode<I>) {
    if (!tree.canSelect(node)) return
    anchorNode = node
    if (isMultiple()) setNodes([node], !tree.isSelected(node))
    else options.write(tree.isSelected(node) ? null : node.value)
  }

  /**
   * A click on a row or its checkbox, or Enter and Space on the Focused Node. `origin` is the
   * Node that had focus before the gesture.
   *
   * Returns `false` and changes nothing when `node` cannot be selected, so that the caller can
   * toggle it instead. A target that cannot be selected never makes a Range.
   */
  function activate(node: TreeNode<I>, mods: GestureModifiers, origin: TreeNode<I> | null | undefined): boolean {
    if (!tree.canSelect(node)) return false
    if (!isMultiple()) {
      replaceWith(node)
      return true
    }

    // Without an Anchor Node and a Focused Node, a Range has no fixed end, and a Shift
    // gesture acts as the same gesture without Shift.
    const anchor = mods.shift ? resolveAnchor(origin) : undefined
    if (anchor) {
      const nodes = range(anchor, node)
      if (!isReplace()) setNodes(nodes, !tree.isSelected(node))
      else if (mods.primary) setNodes(nodes, true)
      else selectOnly(nodes)
    } else if (isReplace() && !mods.primary) {
      replaceWith(node)
    } else {
      toggleSelected(node)
    }
    return true
  }

  /**
   * The selection after a key that moves focus from `from` to `to`. Under replace, the
   * selection follows focus. Under toggle, it changes only with Shift. The caller clears
   * `shift` for a key that cannot extend a Range.
   *
   * At the end of the list, a key does not move focus and `from` is `to`. With Shift it still
   * makes a Range, so that Shift+End on the last Node acts. Without Shift it does nothing, so
   * that a plain arrow key there does not replace a selection made with Ctrl.
   */
  function followFocus(from: TreeNode<I>, to: TreeNode<I>, mods: GestureModifiers) {
    if (from.key === to.key && !mods.shift) return
    if (!isMultiple()) {
      if (isReplace()) replaceWith(to)
      return
    }

    const anchor = mods.shift ? resolveAnchor(from) : undefined

    if (isReplace()) {
      // Ctrl+Shift adds the Range, as Ctrl+Shift+click does.
      if (anchor && mods.primary) setNodes(range(anchor, to), true)
      else if (anchor) selectOnly(range(anchor, to))
      // A Node that cannot be selected takes focus only, and the selection stays.
      else if (!mods.primary) replaceWith(to)
      return
    }

    if (!anchor) return
    // The Nodes passed over take the state of the Anchor Node. `from` is already done, so a
    // move back towards the Anchor Node changes nothing and the run does not shrink.
    const nodes = range(from, to).filter(node => node.key !== from.key)
    // An Anchor Node that cannot be selected is only a fallback, and its state is not a choice
    // of the user, so the walk selects.
    setNodes(nodes, tree.canSelect(anchor) ? tree.isSelected(anchor) : true)
  }

  return { activate, followFocus, toggleSelected }
}
