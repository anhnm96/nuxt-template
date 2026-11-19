<script lang="ts">
import type { TreeSlots } from './context'
import type { TreeAccessors, TreeNode } from './useTree'
import type { TreeSelectionBehavior } from './useTreeSelection'
import type { OptionAccessor, OptionValueOf } from '~/composables/useOptionList'
import type { GestureModifiers } from '~/utils/modifiers'
import { camelize } from 'vue'
import { readModifiers } from '~/utils/modifiers'
import { provideTreeContext } from './context'
import TreeRow from './TreeRow.vue'
import { isParent, useTree } from './useTree'
import { useTreeSelection } from './useTreeSelection'

export type { TreeSlotProps } from './context'
export type { TreeSelectionBehavior } from './useTreeSelection'

/** The payload of `row-click` and `toggle-click`. Call `event.preventDefault()` to cancel the default. */
export interface TreeClickPayload<I> {
  node: TreeNode<I>
  event: MouseEvent
}

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
  /**
   * How a plain click changes the selection. See CONTEXT.md — Selection Behavior.
   * - `toggle`: a click adds or removes one Node. The arrow keys move focus only.
   * - `replace`: a click selects only that Node, and the selection follows focus.
   * @defaultValue 'toggle'
   */
  selectionBehavior?: TreeSelectionBehavior
  /**
   * A plain click on a Parent Node row also expands or collapses it. A click with Ctrl or
   * Shift, or on the checkbox, never does. A click on a Node that cannot be selected always does.
   * @defaultValue true
   */
  expandOnClick?: boolean
  /**
   * Shows a checkbox on each row that has a selection state. The checkbox is a view of the
   * selection; see ADR-0018. Requires `multiple`, `selectionBehavior: 'toggle'` and `v-model`.
   */
  checkboxes?: boolean
  /** Removes the Tree from the tab order and ignores every interaction. */
  disabled?: boolean
}

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<TreeProps<I, VK, M>>(), {
  items: () => [],
  selectParents: true,
  selectionBehavior: 'toggle',
  expandOnClick: true,
})

const emit = defineEmits<{
  /** Before the default. `event.preventDefault()` cancels the selection and the expansion. */
  rowClick: [payload: TreeClickPayload<I>]
  /** Before the default. `event.preventDefault()` cancels the expansion. */
  toggleClick: [payload: TreeClickPayload<I>]
}>()

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

const selection = useTreeSelection<I>({
  tree,
  multiple: isMultiple,
  behavior: () => props.selectionBehavior,
  selectedValues,
  write: (value) => {
    modelValue.value = value as TreeModel<I, VK, M>
  },
})

function isNodeDisabled(node: TreeNode<I>) {
  return props.disabled || node.disabled
}

/** The checkbox shows only where it agrees with a click. See ADR-0018. */
const showCheckboxes = computed(() =>
  !!props.checkboxes && hasModel && isMultiple.value && props.selectionBehavior === 'toggle')

if (import.meta.dev) {
  watch(() => !!props.checkboxes && !showCheckboxes.value, (ignored) => {
    if (ignored) console.warn('[Tree] `checkboxes` requires `multiple`, `selectionBehavior: \'toggle\'` and `v-model`. The Tree shows no checkbox.')
  }, { immediate: true })
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

/**
 * What the modifiers mean for `key`. `null` when the key with these modifiers is not a Tree
 * key, so that the browser keeps it. Ctrl alone with Home or End is not a Tree key, and
 * Ctrl+Shift+Home and End make a Range. Shift with `*` is allowed, because many layouts type
 * `*` with it. Shift extends a Range only with the arrow keys, Home, End, Enter and Space;
 * with a letter it is Typeahead.
 */
function keyModifiers(key: string, mods: GestureModifiers): GestureModifiers | null {
  switch (key) {
    case 'ArrowLeft':
    case 'ArrowRight':
      return mods.primary || mods.shift ? null : mods
    case 'Home':
    case 'End':
      return mods.primary && !mods.shift ? null : mods
    case '*':
      return mods.primary ? null : mods
    case 'ArrowDown':
    case 'ArrowUp':
    case 'Enter':
    case ' ':
      return mods
    default:
      return { ...mods, shift: false }
  }
}

/** A keyboard focus move. The selection follows it as `selectionBehavior` and the modifiers say. */
function moveFocus(from: TreeNode<I>, to: TreeNode<I>, mods: GestureModifiers) {
  focusNode(to)
  selection.followFocus(from, to, mods)
}

function onKeydown(event: KeyboardEvent) {
  if (props.disabled || event.altKey) return
  const eventMods = readModifiers(event)
  const mods = eventMods && keyModifiers(event.key, eventMods)
  const node = focused.value
  if (!mods || !node) return

  switch (event.key) {
    case 'ArrowRight':
      if (!isParent(node)) break
      if (!tree.isExpanded(node)) tree.setExpanded([node], true)
      else if (node.children[0]) moveFocus(node, node.children[0], mods)
      break
    case 'ArrowLeft':
      if (tree.isExpanded(node)) tree.setExpanded([node], false)
      else if (node.parent) moveFocus(node, node.parent, mods)
      break
    case 'Enter':
    case ' ':
      // A Node that cannot be selected toggles instead. See DESIGN.md, "Enter and Space
      // toggle a Node that cannot be selected". `toggle` does nothing on a Leaf Node.
      if (!selection.activate(node, mods, node)) tree.toggle(node)
      break
    case '*':
      tree.expandSiblings(node)
      break
    case 'PageUp':
    case 'PageDown':
      // APG defines no page keys for a tree, so the browser keeps them to scroll the page.
      return
    default: {
      if (!nav.handleKeydown(event)) return
      // `onMove` sets the Focused Node synchronously.
      if (focused.value) selection.followFocus(node, focused.value, mods)
      return
    }
  }
  event.preventDefault()
}

// -------------------------------------------------------------------------- pointer

/**
 * The Key of the Focused Node when a pointer goes down, before the click moves focus to the
 * row. A Shift+click without an Anchor Node uses it as the Anchor Node. A Key and not a Node,
 * so that a pointerdown without a click does not keep an old build in memory.
 */
let pointerOriginKey: Key | undefined

function onPointerdown() {
  pointerOriginKey = focused.value?.key
}

function onPointercancel() {
  pointerOriginKey = undefined
}

/**
 * The Node that had focus before the click. A click from the keyboard, such as Enter on a
 * button in a row, has `detail` 0 and no `pointerdown`, and focus did not move for it.
 */
function clickOrigin(event: MouseEvent) {
  // Read one time. Slot content that stops `pointerdown` would otherwise leave an older Key
  // for the next click.
  const key = pointerOriginKey
  pointerOriginKey = undefined
  if (event.detail === 0) return focused.value
  return key === undefined ? undefined : tree.nodeByKey.value.get(key)
}

function isInsideCheckbox(target: EventTarget | null) {
  return showCheckboxes.value && target instanceof Element && !!target.closest('[data-slot="tree-checkbox"]')
}

/**
 * A plain click on a Parent Node row selects it and toggles it, as in a file explorer, unless
 * `expandOnClick` is off. See README, "Clicks".
 */
function onRowClick(node: TreeNode<I>, event: MouseEvent) {
  if (props.disabled) return
  const mods = readModifiers(event)
  // The Tree ignores a click with the other platform modifier, so the consumer does not see it.
  if (!mods) return
  emit('rowClick', { node, event })
  if (event.defaultPrevented) return

  const selected = selection.activate(node, mods, clickOrigin(event))
  // Without the toggle, a click on a Node that cannot be selected does nothing.
  const plain = !mods.shift && !mods.primary && !isInsideCheckbox(event.target)
  if (!selected || (props.expandOnClick && plain)) tree.toggle(node)
}

function onToggleClick(node: TreeNode<I>, event: MouseEvent) {
  if (props.disabled) return
  emit('toggleClick', { node, event })
  if (!event.defaultPrevented) tree.toggle(node)
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
  showCheckboxes,
  onRowClick,
  onToggleClick,
  toggleExpanded: (node) => {
    if (!props.disabled) tree.toggle(node)
  },
  toggleSelected: (node) => {
    if (!props.disabled) selection.toggleSelected(node)
  },
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
    @pointerdown="onPointerdown"
    @pointercancel="onPointercancel"
  >
    <TreeRow v-for="node in tree.roots.value" :key="node.key" :node="node" />
  </ul>
</template>
