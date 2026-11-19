<script lang="ts">
import type { TreeSlots } from './context'
import type { TreeAccessors, TreeNode } from './useTree'
import type { OptionAccessor, OptionValueOf } from '~/composables/useOptionList'
import { camelize } from 'vue'
import { provideTreeContext } from './context'
import TreeRow from './TreeRow.vue'
import { isParent, useTree } from './useTree'

export type { TreeSlotProps } from './context'

export type TreeModel<I, VK, M extends boolean>
  = M extends true ? OptionValueOf<I, VK>[] : MaybeNull<OptionValueOf<I, VK>>
</script>

<script setup lang="ts" generic="I extends Record<string, any>, VK extends keyof I | ((item: I) => any) | undefined = undefined, M extends boolean = false">
export interface TreeProps<
  I extends Record<string, any>,
  VK extends keyof I | ((item: I) => any) | undefined = undefined,
  M extends boolean = false,
> {
  /** The root Items. */
  items?: I[]
  /**
   * Reads the children of an Item. An array, even an empty one, makes a Parent Node.
   * @defaultValue 'children'
   */
  itemChildren?: OptionAccessor<I, I[] | null | undefined>
  /**
   * Rendered, and matched against by Typeahead.
   * @defaultValue 'label'
   */
  itemLabel?: OptionAccessor<I, string>
  /** What `v-model` holds. Omit it to hold the whole Item; `itemKey` is then required. */
  itemValue?: VK
  /** Identity. Defaults to `itemValue`. Keys must be unique in the whole Tree. */
  itemKey?: OptionAccessor<I, Key>
  /** A disabled Node stays focusable and expandable. It cannot be selected. */
  itemDisabled?: OptionAccessor<I, boolean>
  /**
   * Several Nodes can be selected, and `modelValue` becomes an array.
   *
   * `M & boolean`, never a bare `M`: a bare type parameter compiles to `type: null`, and Vue
   * then does not cast `<Tree multiple>` to `true`. See ADR-0003.
   */
  multiple?: M & boolean
  /**
   * Parent Nodes can be selected. Set it to `false` for a picker of Leaf Nodes only; Enter,
   * Space and a click then only expand or collapse a Parent Node.
   * @defaultValue true
   */
  selectParents?: boolean
  /** Removes the Tree from the tab order and ignores every interaction. */
  disabled?: boolean
}

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<TreeProps<I, VK, M>>(), {
  items: () => [],
  selectParents: true,
})

const slots = defineSlots<TreeSlots<I>>()

/** No default: the two modes need different empty values. See `Select.vue`. */
const modelValue = defineModel<TreeModel<I, VK, M>>()
/** The Keys of the Expanded Parent Nodes. Unbound, the Tree keeps its own and starts collapsed. */
const expanded = defineModel<Key[]>('expanded', { default: () => [] })

/**
 * A Tree with no model has no Selected Node and is only navigable. `defineModel` keeps a
 * local value when nothing is bound, so the binding itself must be checked. The check reads
 * the vnode one time: a template does not add or remove a `v-model` at runtime.
 */
const vnodeProps = getCurrentInstance()?.vnode.props ?? {}
const hasModel = Object.keys(vnodeProps)
  .some(name => camelize(name) === 'modelValue' || name === 'onUpdate:modelValue')

const isMultiple = computed(() => !!props.multiple)

const selectedValues = computed<unknown[]>(() => {
  if (isMultiple.value) return (modelValue.value as unknown[] | undefined) ?? []
  return isNullish(modelValue.value) ? [] : [modelValue.value]
})

const tree = useTree<I>({
  items: () => props.items,
  // `props` is reactive, so an accessor that changes at runtime stays reactive. The cast
  // covers `itemValue`, which is a type parameter here.
  accessors: () => props as TreeAccessors<I>,
  expanded,
  selectedValues,
  hasModel,
  selectParents: () => props.selectParents,
})

// ---------------------------------------------------------------------- selection

function select(node: TreeNode<I>) {
  if (!isMultiple.value) {
    if (!tree.isSelected(node)) modelValue.value = node.value as TreeModel<I, VK, M>
    return
  }
  const current = selectedValues.value
  const next = current.filter(value => tree.keyOfValue(value) !== node.key)
  if (next.length === current.length) next.push(node.value)
  modelValue.value = next as TreeModel<I, VK, M>
}

/**
 * Enter and Space select. A Node that cannot be selected toggles instead. See DESIGN.md,
 * "Enter and Space toggle a Node that cannot be selected".
 */
function activate(node: TreeNode<I>) {
  // `toggle` does nothing on a Leaf Node.
  if (tree.canSelect(node)) select(node)
  else tree.toggle(node)
}

function isNodeDisabled(node: TreeNode<I>) {
  return props.disabled || node.disabled
}

// -------------------------------------------------------------------------- focus

const rootRef = useTemplateRef<HTMLElement>('root')
const rows = new Map<Key, HTMLElement>()

function registerRow(key: Key, el: HTMLElement) {
  rows.set(key, el)
}

/**
 * Only removes its own element. A row that moves to another parent mounts its new instance
 * before the old one unmounts, and both have the same Key.
 */
function unregisterRow(key: Key, el: HTMLElement) {
  if (rows.get(key) === el) rows.delete(key)
}

/**
 * The Node that had DOM focus last, while focus is in the Tree; `null` while focus is outside.
 * It is the Node object and not its Key, so that its ancestors are still known after the Node
 * leaves the Visible Nodes or its Item leaves `items`. Read `focused` instead: this can be hidden.
 */
const focusedNode = shallowRef<TreeNode<I> | null>(null)

/**
 * `focusedNode` resolved to a Visible Node of the current build: itself, or its nearest ancestor
 * that is a Visible Node.
 */
const focused = computed(() => focusedNode.value && tree.nearestVisible(focusedNode.value))

/** The one row with `tabindex="0"`. See README, "Accessibility". */
const tabStopKey = computed<Key | undefined>(() => {
  if (props.disabled) return undefined
  if (focused.value) return focused.value.key
  const selected = tree.firstSelected.value
  if (selected) return tree.nearestVisible(selected)?.key
  return tree.visibleNodes.value[0]?.key
})

function focusNode(node: TreeNode<I>) {
  focusedNode.value = node
  rows.get(node.key)?.focus()
}

function onFocusout(event: FocusEvent) {
  if (isNodeInside(rootRef.value, event.relatedTarget)) return
  // Focus that returns to the Tree enters at the Selected Node again, as APG specifies.
  focusedNode.value = null
}

/**
 * The Focused Node can leave the Visible Nodes while it has focus: its Parent Node collapses,
 * or its Item leaves `items`. `focused` then names its nearest ancestor that is a Visible Node,
 * and focus moves there after the DOM update, so that it does not go to `<body>`.
 */
watch(focused, (node) => {
  const stored = focusedNode.value
  if (!stored) return
  if (node?.key === stored.key) {
    // A new build of the same Node. The old one would keep the old Nodes in memory.
    if (node !== stored) focusedNode.value = node
    return
  }
  const target = node ?? tree.visibleNodes.value[0]
  nextTick(() => {
    // Focus can leave the Tree before this runs, and `onFocusout` then clears `focusedNode`.
    if (target && focusedNode.value) focusNode(target)
  })
})

// ----------------------------------------------------------------------- keyboard

/** A disabled Node stays focusable, so no entry is disabled here. */
const navEntries = computed(() => tree.visibleNodes.value.map(node => ({ disabled: false, label: node.label })))

const nav = useListNavigation({
  entries: () => navEntries.value,
  index: () => (focused.value && tree.visibleIndex.value.get(focused.value.key)) ?? -1,
  onMove: index => focusNode(tree.visibleNodes.value[index]!),
})

function onKeydown(event: KeyboardEvent) {
  if (props.disabled || event.ctrlKey || event.metaKey || event.altKey) return
  const node = focused.value
  if (!node) return

  switch (event.key) {
    case 'ArrowRight':
      if (!isParent(node)) break
      if (!tree.isExpanded(node)) tree.setExpanded([node], true)
      else if (node.children[0]) focusNode(node.children[0])
      break
    case 'ArrowLeft':
      if (tree.isExpanded(node)) tree.setExpanded([node], false)
      else if (node.parent) focusNode(node.parent)
      break
    case 'Enter':
    case ' ':
      activate(node)
      break
    case '*':
      tree.expandSiblings(node)
      break
    case 'PageUp':
    case 'PageDown':
      // APG defines no page keys for a tree, so the browser keeps them to scroll the page.
      return
    default:
      nav.handleKeydown(event)
      return
  }
  event.preventDefault()
}

// -------------------------------------------------------------------------- pointer

/** A click on a Parent Node row selects it and toggles it, as in a file explorer. */
function onRowClick(node: TreeNode<I>) {
  if (props.disabled) return
  if (tree.canSelect(node)) select(node)
  tree.toggle(node)
}

function onToggleClick(node: TreeNode<I>) {
  if (!props.disabled) tree.toggle(node)
}

// ------------------------------------------------------------------------- context

provideTreeContext({
  slots,
  tabStopKey,
  focusedKey: computed(() => focused.value?.key),
  isExpanded: tree.isExpanded,
  isSelected: tree.isSelected,
  hasSelectionState: tree.hasSelectionState,
  isNodeDisabled,
  onRowClick,
  onToggleClick,
  onRowFocus: (node) => {
    focusedNode.value = node
  },
  registerRow,
  unregisterRow,
})

const attrs = useAttrs()
if (import.meta.dev) {
  onMounted(() => {
    if (!attrs['aria-label'] && !attrs['aria-labelledby']) {
      console.warn('[Tree] Give the Tree an accessible name with `aria-label` or `aria-labelledby`.')
    }
  })
}
</script>

<template>
  <ul
    ref="root"
    role="tree"
    class="tree"
    :aria-multiselectable="(hasModel && isMultiple) || undefined"
    :aria-disabled="disabled || undefined"
    data-slot="tree"
    v-bind="$attrs"
    @keydown="onKeydown"
    @focusout="onFocusout"
  >
    <TreeRow v-for="node in tree.roots.value" :key="node.key" :node="node" />
  </ul>
</template>
