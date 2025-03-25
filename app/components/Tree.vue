<script lang="ts">
import type { MoveEvent, SortableEvent, SortableOptions } from 'sortablejs'
import type { AutoScrollOptions } from 'sortablejs/plugins'
import { Sortable } from 'sortablejs-vue3'

export interface TreeItem {
  id: string
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
    class="flex flex-col gap-16"
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
          class="collapse-when-drag grid grid-rows-[1fr] transition-grid-rows"
          :class="{ '!grid-rows-[0fr]': !element.isExpanded }"
        >
          <div class="overflow-hidden">
            <Tree
              class="ml-24 mt-16"
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
