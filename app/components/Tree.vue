<script lang="ts">
import type { MoveEvent, SortableEvent, SortableOptions } from 'sortablejs'
import type { AutoScrollOptions } from 'sortablejs/plugins'
import { Sortable } from 'sortablejs-vue3'

export interface TreeItem {
  id: string
  isExpanded?: boolean
  children?: TreeItem[]
}

const TREE_INJECTION_KEY: InjectionKey<{ isRootDraggingAny: Ref<boolean> }> = Symbol('Tree')
</script>

<script lang="ts" setup generic="T extends TreeItem">
const props = withDefaults(defineProps<{
  list: T[]
  sortableOptions?: SortableOptions | AutoScrollOptions
  isRoot?: boolean
  disabled?: boolean
  depth?: number
  depthLimit?: number
  pt?: {
    nestedTree?: any
  }
}>(), { isRoot: true, depth: 1, depthLimit: Infinity })

const emit = defineEmits<{
  drop: [value: { list: T[], event: SortableEvent }]
  choose: [event: SortableEvent]
  unchoose: [event: SortableEvent]
  start: [event: SortableEvent]
  end: [event: SortableEvent]
  add: [event: SortableEvent]
  update: [event: SortableEvent]
  sort: [event: SortableEvent]
  remove: [event: SortableEvent]
  filter: [event: SortableEvent]
  move: [event: MoveEvent, originalEvent: Event]
  clone: [event: SortableEvent]
  change: [event: SortableEvent]
}>()

defineSlots<{
  default: (props: {
    element: T
    disabled: boolean
    depth: number
  }) => any
}>()

const key = ref(Math.random().toString(36).slice(-6))
// flag if dragging direct child
const isDragging = ref(false)
// flag if dragging root's direct child or any of its descendants
let isRootDraggingAny: Ref<boolean>

if (props.isRoot) {
  isRootDraggingAny = ref(false)

  provide(TREE_INJECTION_KEY, { isRootDraggingAny })
}

if (!props.isRoot) {
  isRootDraggingAny = inject(TREE_INJECTION_KEY)!.isRootDraggingAny
}

function handleStart(event: SortableEvent) {
  document.body.style.cursor = 'move'
  isDragging.value = true
  isRootDraggingAny.value = true
  emit('start', event)
}

function handleEnd(event: SortableEvent) {
  document.body.style.cursor = 'default'
  isDragging.value = false
  isRootDraggingAny.value = false
  emit('end', event)
  emit('drop', { list: props.list, event })
}

const options: SortableOptions | AutoScrollOptions = {
  draggable: '[data-draggable="true"]',
  animation: 250,
  ghostClass: 'ghost-item',
  dragClass: 'dragging-item',
  handle: `.draggable-handle:not(.disabled)`,
  scroll: true,
  forceFallback: true,
  bubbleScroll: true,
  ...props.sortableOptions,
}

const handleRef = ref()
const { height } = useElementSize(handleRef)

// force re-render when list length changes
watch(() => props.list.length, () => {
  key.value = Math.random().toString(36).slice(-6)
})
</script>

<template>
  <Sortable
    :key
    :list
    item-key="id"
    :options
    class="flex flex-col gap-4"
    :data-root-dragging="isRootDraggingAny"
    @start="handleStart"
    @end="handleEnd"
    @choose="$emit('choose', $event)"
    @unchoose="$emit('unchoose', $event)"
    @add="$emit('add', $event)"
    @update="$emit('update', $event)"
    @sort="$emit('sort', $event)"
    @remove="$emit('remove', $event)"
    @filter="$emit('filter', $event)"
    @move="(event, originalEvent) => $emit('move', event, originalEvent)"
    @clone="$emit('clone', $event)"
    @change="$emit('change', $event)"
  >
    <template #item="{ element }">
      <div
        :key="element.id"
        :style="{ '--height': `${height}px` }"
        class="draggable"
        :class="{ root: isRoot }"
        :data-dragging="isDragging"
        :data-draggable="!(disabled || element.disabled)"
      >
        <div
          ref="handleRef"
          class="draggable-handle"
          :class="[(disabled || element.disabled) && 'disabled']"
        >
          <slot
            :element
            :depth
            :disabled="disabled || element.disabled"
          />
        </div>
        <div
          v-if="element.children?.length && depth < depthLimit"
          class="collapse-when-drag grid grid-rows-[1fr] transition-[grid-template-rows] duration-200 ease-in-out"
          :class="{ '!grid-rows-[0fr]': !element.isExpanded }"
        >
          <div class="overflow-hidden">
            <Tree
              class="mt-4 ml-6"
              :list="element.children"
              :item-key="(item: T) => item.id"
              :options
              :is-root="false"
              :disabled="disabled || element.disabled"
              :depth="depth + 1"
              :depth-limit
              v-bind="getPtValue(pt, 'nestedTree')"
              @drop="$emit('drop', $event)"
              @choose="$emit('choose', $event)"
              @unchoose="$emit('unchoose', $event)"
              @start="$emit('start', $event)"
              @end="$emit('end', $event)"
              @add="$emit('add', $event)"
              @update="$emit('update', $event)"
              @sort="$emit('sort', $event)"
              @remove="$emit('remove', $event)"
              @filter="$emit('filter', $event)"
              @move="(event, originalEvent) => $emit('move', event, originalEvent)"
              @clone="$emit('clone', $event)"
              @change="$emit('change', $event)"
            >
              <template #default="slotProps">
                <slot v-bind="slotProps" />
              </template>
            </Tree>
          </div>
        </div>
      </div>
    </template>
  </Sortable>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.draggable {
  @apply relative;
}

.draggable:not(.root)::before {
  @apply absolute -left-4 -top-4 h-[calc((var(--height)_/_2)_+_16px)] w-4 border-b border-l border-gray-200 content-[''];
}

.draggable:not(.root):last-child::before {
  @apply rounded-bl-md;
}

.draggable:not(.root):not(:last-child)::after {
  @apply absolute -left-4 bottom-0 h-full w-4 border-l border-gray-200 content-[''];
}

.draggable[data-dragging='true']::before,
.draggable[data-dragging='true']::after,
.dragging-item::before,
.dragging-item::after,
.ghost-item :slotted(.draggable-item) {
  @apply opacity-0;
}

.ghost-item .collapse-when-drag,
.dragging-item .collapse-when-drag {
  @apply grid-rows-[0fr];
}

.tree[data-root-dragging='true'] .draggable-item {
  @apply cursor-move;
}

.tree[data-root-dragging='false'] .draggable-item {
  @apply hover:bg-gray-400;
}

.dragging-item :slotted(.draggable-item) {
  @apply bg-gray-400;
}

:slotted(.draggable-item) {
  @apply flex cursor-pointer select-none items-center rounded-md border border-gray-400 bg-gray-200 px-4 py-2 transition-colors duration-200;
}
</style>
