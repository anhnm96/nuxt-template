import type { MaybeRefOrGetter, Ref } from 'vue'
import type { OptionAccessor, OptionAccessors } from '~/composables/useOptionList'
import { createWarnOnce, mapKeyByValue, objectKeyWarning, readAccessor, readKey, resolveKeyOfValue } from '~/composables/useOptionList'

/**
 * The Tree model: Items normalised into Nodes, the Expanded state, the Visible Nodes and the
 * selection by Key. Terms in Title Case are defined in CONTEXT.md, section Tree.
 *
 * It owns no focus and no DOM. `Tree.vue` keeps the Focused Node, because a Tree roves real
 * DOM focus. See DESIGN.md.
 */

/**
 * The accessors of `Select`, except `itemChildren`, which reads the children of an Item here and
 * not the Options of a Group.
 */
export type TreeAccessors<I> = Pick<OptionAccessors<I>, 'itemLabel' | 'itemValue' | 'itemKey' | 'itemDisabled'> & {
  /**
   * Reads the children of an Item. An array, even an empty one, makes a Parent Node.
   * `null` or `undefined` makes a Leaf Node.
   */
  itemChildren?: OptionAccessor<I, I[] | null | undefined>
}

/** The normalised view of an Item. See CONTEXT.md — Node. */
export interface TreeNode<I> {
  item: I
  /** Primitive, stable identity. Never compared against Value. */
  key: Key
  /** What the model holds. May be the whole Item. */
  value: unknown
  label: string
  disabled: boolean
  /** `null` for a Leaf Node. An empty array is a Parent Node with no children. */
  children: TreeNode<I>[] | null
  parent: TreeNode<I> | null
  /** 1 for a root Node, as `aria-level` counts. */
  level: number
  /** 1-based position among the siblings, as `aria-posinset` counts. */
  position: number
  /** The number of siblings, this Node included. */
  setSize: number
}

export interface UseTreeOptions<I> {
  items: MaybeRefOrGetter<I[]>
  /** Read on every rebuild, so an accessor that changes at runtime stays reactive. */
  accessors: MaybeRefOrGetter<TreeAccessors<I>>
  /** The Keys of the Expanded Parent Nodes. The Tree writes a new array and never mutates it. */
  expanded: Ref<Key[] | undefined>
  /** The Values the model holds: zero or one for a single Tree, many for a multiple Tree. */
  selectedValues: MaybeRefOrGetter<unknown[]>
  /** A model is bound. Without one, no Node has a selection state. */
  hasModel: boolean
  /** Parent Nodes can be selected. */
  selectParents: MaybeRefOrGetter<boolean>
}

export function isParent<I>(node: TreeNode<I>): node is TreeNode<I> & { children: TreeNode<I>[] } {
  return node.children !== null
}

export function useTree<I>(options: UseTreeOptions<I>) {
  const accessors = () => toValue(options.accessors)

  const built = computed(() => {
    const acc = accessors()
    const flat: TreeNode<I>[] = []
    const seen = new Set<Key>()
    const warn = createWarnOnce()

    function build(items: I[], parent: TreeNode<I> | null): TreeNode<I>[] {
      return items.map((item, index) => {
        const key = readKey(item, acc)
        if (import.meta.dev) {
          const message = objectKeyWarning('Tree', key)
          if (message) warn(message, item)
          else if (seen.has(key)) warn(`[Tree] Two Items have the Key ${String(key)}. Keys must be unique in the whole Tree.`, item)
          seen.add(key)
        }
        const node: TreeNode<I> = {
          item,
          key,
          // Omitting `itemValue` makes the whole Item the Value.
          value: readAccessor<I, any>(item, acc.itemValue, item),
          label: String(readAccessor<I, any>(item, acc.itemLabel ?? ('label' as keyof I), '')),
          disabled: !!readAccessor(item, acc.itemDisabled, false),
          children: null,
          parent,
          level: parent ? parent.level + 1 : 1,
          position: index + 1,
          setSize: items.length,
        }
        flat.push(node)
        const children = readAccessor<I, I[] | null | undefined>(item, acc.itemChildren ?? ('children' as keyof I), undefined)
        // Children are built after the push, so `flat` is in tree order.
        if (Array.isArray(children)) node.children = build(children, node)
        return node
      })
    }

    return { roots: build(toValue(options.items) ?? [], null), flat }
  })

  const roots = computed(() => built.value.roots)
  /** Every Node, in tree order. A collapsed Parent Node does not hide its children here. */
  const allNodes = computed(() => built.value.flat)
  const nodeByKey = computed(() => new Map(allNodes.value.map(node => [node.key, node])))
  /** Built only when `itemKey` and `itemValue` are both given: only then does a lookup need it. */
  const keyByValue = computed(() => mapKeyByValue(allNodes.value))

  // ------------------------------------------------------------------ expansion

  const expandedKeys = computed(() => new Set(options.expanded.value ?? []))

  function isExpanded(node: TreeNode<I>) {
    return isParent(node) && expandedKeys.value.has(node.key)
  }

  function setExpanded(nodes: TreeNode<I>[], expand: boolean) {
    const next = new Set(expandedKeys.value)
    let changed = false
    for (const node of nodes) {
      if (!isParent(node) || next.has(node.key) === expand) continue
      if (expand) next.add(node.key)
      else next.delete(node.key)
      changed = true
    }
    if (changed) options.expanded.value = [...next]
  }

  function toggle(node: TreeNode<I>) {
    setExpanded([node], !isExpanded(node))
  }

  /** The `*` key: expands every Parent Node among the siblings of `node`, and `node` too. */
  function expandSiblings(node: TreeNode<I>) {
    setExpanded(node.parent?.children ?? roots.value, true)
  }

  /** See CONTEXT.md — Visible Nodes. */
  const visibleNodes = computed(() => {
    const result: TreeNode<I>[] = []
    function walk(nodes: TreeNode<I>[]) {
      for (const node of nodes) {
        result.push(node)
        if (isExpanded(node)) walk(node.children!)
      }
    }
    walk(roots.value)
    return result
  })

  /** The position of each Visible Node, by Key. Also the set of Visible Nodes. */
  const visibleIndex = computed(() => new Map(visibleNodes.value.map((node, index) => [node.key, index])))

  /**
   * `node` when it is a Visible Node, else its nearest ancestor that is one. A root Node is
   * always visible, so this returns a Node for every Node of the current Tree.
   *
   * `node` can come from an earlier build. Its ancestors then resolve by Key against the
   * current Visible Nodes, which is what lets focus survive an `items` change.
   */
  function nearestVisible(node: TreeNode<I>): TreeNode<I> | undefined {
    for (let current: TreeNode<I> | null = node; current; current = current.parent) {
      if (visibleIndex.value.has(current.key)) return nodeByKey.value.get(current.key)
    }
    return undefined
  }

  // ------------------------------------------------------------------ selection

  /** See `resolveKeyOfValue`. */
  function keyOfValue(value: unknown): Key | null {
    return resolveKeyOfValue(value, accessors(), v => keyByValue.value.get(v))
  }

  const selectedKeys = computed(() => {
    const keys = new Set<Key>()
    for (const value of toValue(options.selectedValues)) {
      const key = keyOfValue(value)
      if (key !== null) keys.add(key)
    }
    return keys
  })

  function isSelected(node: TreeNode<I>) {
    return selectedKeys.value.has(node.key)
  }

  /**
   * The Node takes `aria-selected`: a model is bound, and the Node is a Leaf Node or
   * `selectParents` is on. A disabled Node has a selection state too.
   */
  function hasSelectionState(node: TreeNode<I>) {
    return options.hasModel && (!isParent(node) || toValue(options.selectParents))
  }

  function canSelect(node: TreeNode<I>) {
    return hasSelectionState(node) && !node.disabled
  }

  /**
   * The first Selected Node in tree order that has a selection state. A Selected Node without
   * one, such as a Parent Node under `selectParents: false`, shows no selection.
   */
  const firstSelected = computed(() => {
    if (!selectedKeys.value.size) return undefined
    return allNodes.value.find(node => selectedKeys.value.has(node.key) && hasSelectionState(node))
  })

  return {
    roots,
    visibleNodes,
    visibleIndex,
    nodeByKey,
    nearestVisible,
    isExpanded,
    setExpanded,
    toggle,
    expandSiblings,
    keyOfValue,
    isSelected,
    hasSelectionState,
    canSelect,
    firstSelected,
  }
}
