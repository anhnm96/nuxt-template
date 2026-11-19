import type { TreeNode } from './useTree'

export interface TreeSlotProps<I> {
  item: I
  node: TreeNode<I>
  level: number
  expanded: boolean
  selected: boolean
  /** The Focused Node. See CONTEXT.md. */
  focused: boolean
  disabled: boolean
}

export interface TreeSlots<I> {
  /** The row content after the toggle. Replaces `item-leading`, `item-label` and `item-trailing`. */
  'item'?: (props: TreeSlotProps<I>) => any
  'item-leading'?: (props: TreeSlotProps<I>) => any
  'item-label'?: (props: TreeSlotProps<I>) => any
  'item-trailing'?: (props: TreeSlotProps<I>) => any
}

/**
 * What a `TreeRow` reads from its `Tree`. The state is here as Keys and predicates, so that each
 * row derives its own booleans and re-renders only when one of them changes. See DESIGN.md.
 */
export interface TreeContext {
  /** The slots of the `Tree`. A row calls them, so that the consumer writes them one time. */
  slots: TreeSlots<any>
  /** The row with `tabindex="0"`. `undefined` when no row takes focus: the Tree is disabled or empty. */
  tabStopKey: Readonly<Ref<Key | undefined>>
  /** The Focused Node, only while focus is in the Tree. */
  focusedKey: Readonly<Ref<Key | undefined>>
  isExpanded: (node: TreeNode<any>) => boolean
  isSelected: (node: TreeNode<any>) => boolean
  /** The Node takes `aria-selected`. Not the same as "not disabled". */
  hasSelectionState: (node: TreeNode<any>) => boolean
  /** The Node or the whole Tree is disabled. */
  isNodeDisabled: (node: TreeNode<any>) => boolean
  onRowClick: (node: TreeNode<any>) => void
  onToggleClick: (node: TreeNode<any>) => void
  onRowFocus: (node: TreeNode<any>) => void
  /** The Tree moves DOM focus, so it must find the row element of a Key. */
  registerRow: (key: Key, el: HTMLElement) => void
  unregisterRow: (key: Key, el: HTMLElement) => void
}

export const [provideTreeContext, injectTreeContext] = createContext<TreeContext>('Tree')
