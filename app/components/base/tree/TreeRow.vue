<script lang="ts">
import type { FunctionalComponent } from 'vue'
import type { TreeSlotProps } from './context'
import type { TreeNode } from './useTree'
import { injectTreeContext } from './context'
import { isParent } from './useTree'

interface SlotOutletProps {
  render: (slotProps: TreeSlotProps<any>) => any
  slotProps: TreeSlotProps<any>
}

/**
 * Calls one slot of the `Tree` with the props of a row. `slotProps` is a prop and not read from
 * a closure: Vue skips a component whose props did not change, and the slot would then show old
 * state.
 */
const SlotOutlet: FunctionalComponent<SlotOutletProps> = props => props.render(props.slotProps)
// Without declared props, a functional component receives `slot-props` under that name.
SlotOutlet.props = ['render', 'slotProps']
</script>

<script setup lang="ts">
/**
 * One Node of a `Tree`: its row, and its children when it is Expanded. Internal to `Tree`.
 *
 * Each state below is a boolean computed. A focus move or a selection change runs the computed
 * of every row, which is a comparison, but re-renders only a row whose boolean changed. See
 * DESIGN.md, "A row is a component".
 */
const props = defineProps<{ node: TreeNode<any> }>()

const ctx = injectTreeContext()

const isExpanded = computed(() => ctx.isExpanded(props.node))
const isSelected = computed(() => ctx.isSelected(props.node))
const hasSelectionState = computed(() => ctx.hasSelectionState(props.node))
const isFocused = computed(() => ctx.focusedKey.value === props.node.key)
const isTabStop = computed(() => ctx.tabStopKey.value === props.node.key)
const isDisabled = computed(() => ctx.isNodeDisabled(props.node))
/** A disabled Tree has no tab stop, and then no row takes focus, not even from a click. */
const isRoving = computed(() => ctx.tabStopKey.value !== undefined)

// Made one time per row, so that they do not change the slot props on each render.
const toggleExpanded = () => ctx.toggleExpanded(props.node)
const toggleSelected = () => ctx.toggleSelected(props.node)

const slotProps = computed<TreeSlotProps<any>>(() => ({
  item: props.node.item,
  node: props.node,
  level: props.node.level,
  expanded: isExpanded.value,
  selected: isSelected.value,
  focused: isFocused.value,
  disabled: isDisabled.value,
  toggleExpanded,
  toggleSelected,
}))

const rowRef = useTemplateRef<HTMLElement>('row')
onMounted(() => ctx.registerRow(props.node.key, rowRef.value!))
onBeforeUnmount(() => ctx.unregisterRow(props.node.key, rowRef.value!))
</script>

<template>
  <!--
    The treeitem is the row and not the `li`. The name of a treeitem then does not include the
    Labels of its children. `aria-level`, `aria-posinset` and `aria-setsize` are set because the
    group is not inside the treeitem.
  -->
  <li role="none">
    <!-- row -->
    <div
      ref="row"
      role="treeitem"
      class="tree-row"
      :tabindex="isTabStop ? 0 : isRoving ? -1 : undefined"
      :aria-level="node.level"
      :aria-posinset="node.position"
      :aria-setsize="node.setSize"
      :aria-expanded="isParent(node) ? isExpanded : undefined"
      :aria-selected="hasSelectionState ? isSelected : undefined"
      :aria-disabled="isDisabled || undefined"
      data-slot="tree-row"
      @click="ctx.onRowClick(node, $event)"
      @focus="ctx.onRowFocus(node)"
    >
      <!-- toggle -->
      <span
        class="tree-toggle"
        aria-hidden="true"
        data-slot="tree-toggle"
        @click.stop="ctx.onToggleClick(node, $event)"
      >
        <Icon
          v-if="isParent(node)"
          name="ph:caret-right"
          class="tree-toggle-icon"
        />
      </span>

      <!--
        The row is the only focus target, and `aria-selected` carries the state. The input is
        a picture: it takes no focus and no pointer events, so a click reaches the row.
        Reserved on a row without a selection state too, so that the labels align.
      -->
      <!-- checkbox -->
      <span
        v-if="ctx.showCheckboxes.value"
        class="tree-checkbox"
        aria-hidden="true"
        data-slot="tree-checkbox"
      >
        <template v-if="hasSelectionState">
          <SlotOutlet v-if="ctx.slots['item-checkbox']" :render="ctx.slots['item-checkbox']" :slot-props="slotProps" />
          <input
            v-else
            type="checkbox"
            tabindex="-1"
            class="pointer-events-none"
            :checked="isSelected"
            :disabled="isDisabled"
          >
        </template>
      </span>

      <SlotOutlet v-if="ctx.slots.item" :render="ctx.slots.item" :slot-props="slotProps" />
      <template v-else>
        <SlotOutlet v-if="ctx.slots['item-leading']" :render="ctx.slots['item-leading']" :slot-props="slotProps" />
        <span class="truncate" data-slot="tree-label">
          <SlotOutlet v-if="ctx.slots['item-label']" :render="ctx.slots['item-label']" :slot-props="slotProps" />
          <template v-else>{{ node.label }}</template>
        </span>
        <span v-if="ctx.slots['item-trailing']" class="ms-auto flex shrink-0 items-center gap-1">
          <SlotOutlet :render="ctx.slots['item-trailing']" :slot-props="slotProps" />
        </span>
      </template>
    </div>

    <!-- A Leaf Node gets no Transition, because leaves are most of the rows. -->
    <!-- children -->
    <Transition v-if="isParent(node)" name="tree-expand">
      <div v-if="isExpanded" class="tree-children">
        <ul role="group" class="tree-group" data-slot="tree-group">
          <TreeRow v-for="child in node.children" :key="child.key" :node="child" />
        </ul>
      </div>
    </Transition>
  </li>
</template>
