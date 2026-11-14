<script setup lang="ts">
import type { DraggingPayload } from '~/stores/dnd'
import DragItem from '~/components/base/dnd/DragItem.vue'
import DragList from '~/components/base/dnd/DragList.vue'
import { isDragListPayload } from '~/stores/dnd'

const immediate = ref(['Write', 'Review', 'Test', 'Ship'])
const previewed = ref(['Write', 'Review', 'Test', 'Ship'])

const columns = ref([
  { name: 'Todo', tasks: ['Design', 'Build', 'Document'] },
  { name: 'Done', tasks: [] as string[] },
])

const COLORS = ['red', 'green', 'blue', 'amber']
const picked = ref<string[]>(['green'])

/**
 * A row of the list can always move. A colour of the palette comes in only one time,
 * because the list keys its rows by the colour.
 */
function acceptColor(payload?: DraggingPayload) {
  if (isDragListPayload(payload)) return true
  return typeof payload?.value === 'string' && !picked.value.includes(payload.value)
}

/**
 * The trash takes a row of the list, and not a colour of the palette. It needs no
 * `dropped` handler: the list has `transfer="cut"`, so the list removes the row
 * after the trash accepts it.
 */
function acceptRow(payload?: DraggingPayload) {
  return isDragListPayload(payload)
}

const handled = ref(['Write', 'Review', 'Ship'])
const imaged = ref(['Write', 'Review', 'Ship'])
const horizontal = ref(['One', 'Two', 'Three', 'Four', 'Five'])

const many = ref(Array.from({ length: 300 }, (_, id) => ({ id, text: `Item ${id}` })))
const { list: rendered, containerProps, wrapperProps } = useVirtualList(many, {
  // The height of a row and its margin; see the `h-10 mb-2` row below.
  itemHeight: 48,
  overscan: 10,
})
/** The part of `many` that the virtualizer renders. `DragList` takes the whole list. */
const visible = computed(() => ({
  offset: rendered.value[0]?.index ?? 0,
  count: rendered.value.length,
}))
// A native drag does not scroll a container.
useDragAutoScroll(containerProps.ref)
</script>

<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-10 p-8">
    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        Default — rows change places during the drag
      </h2>
      <DragList v-model:list="immediate" group="immediate">
        <template #default="{ item, index, dragging }">
          <p class="row" :class="{ 'opacity-40': dragging }">
            {{ index + 1 }}. {{ item }}
          </p>
        </template>
      </DragList>
      <p class="text-sm opacity-70">
        {{ immediate.join(', ') }}
      </p>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        `reorder="placeholder"` — the rows stay, a placeholder shows the landing spot
      </h2>
      <p class="text-sm opacity-70">
        The item moves on the drop. No placeholder shows for the spot the item already has.
      </p>
      <DragList v-model:list="previewed" group="previewed" reorder="placeholder">
        <template #default="{ item, dragging }">
          <p class="row" :class="{ 'opacity-40': dragging }">
            {{ item }}
          </p>
        </template>
        <template #placeholder="{ data }">
          <p class="row border-dashed opacity-60">
            {{ data.value }}
          </p>
        </template>
      </DragList>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        Two lists of one group — `transfer="cut"`
      </h2>
      <p class="text-sm opacity-70">
        The `placeholder` slot is what lets a list take an item of the other list. `origin`
        tells an incoming item from an item of the list itself.
      </p>
      <div class="grid grid-cols-2 gap-4">
        <div v-for="column in columns" :key="column.name">
          <h3 class="mb-1 text-sm">
            {{ column.name }} ({{ column.tasks.length }})
          </h3>
          <!-- min-h: an empty list has no row, so the list itself must have a size to drop on -->
          <DragList
            v-model:list="column.tasks"
            group="task"
            transfer="cut"
            reorder="placeholder"
            class="min-h-24 rounded border border-dashed p-2"
          >
            <template #default="{ item, dragging }">
              <p class="row" :class="{ 'opacity-40': dragging }">
                {{ item }}
              </p>
            </template>
            <template #placeholder="{ origin, data }">
              <p class="row border-dashed opacity-60">
                {{ origin === 'self' ? 'move here' : `add ${data.value}` }}
              </p>
            </template>
          </DragList>
        </div>
      </div>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        `DragItem` alone — a palette, a list and a trash
      </h2>
      <p class="text-sm opacity-70">
        `acceptData` decides what each target takes. The list refuses a colour it already
        has, and the trash takes only a row of the list.
      </p>
      <div class="flex gap-2">
        <!-- palette: drag sources that accept no drop -->
        <DragItem
          v-for="color in COLORS"
          :key="color"
          group="color"
          :droppable="false"
          :payload="{ value: color }"
          class="row cursor-grab"
        >
          {{ color }}
        </DragItem>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <DragList
          v-model:list="picked"
          group="color"
          transfer="cut"
          reorder="placeholder"
          :accept-data="acceptColor"
          class="min-h-24 rounded border border-dashed p-2"
        >
          <template #default="{ item }">
            <p class="row">
              {{ item }}
            </p>
          </template>
          <template #placeholder="{ data }">
            <p class="row border-dashed opacity-60">
              {{ data.value }}
            </p>
          </template>
        </DragList>
        <!-- trash: a drop target that is not a drag source -->
        <DragItem
          group="color"
          :draggable="false"
          :accept-data="acceptRow"
          hover-class="ring-2"
          allow-class="border-green-600"
          forbidden-class="opacity-40"
          class="flex min-h-24 items-center justify-center rounded border border-dashed"
        >
          Trash
        </DragItem>
      </div>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        `handle` — a row drags only from its grip
      </h2>
      <DragList v-model:list="handled" group="handled" handle=".grip">
        <template #default="{ item }">
          <p class="row flex items-center gap-2">
            <button type="button" class="grip cursor-grab" aria-label="Drag">
              ☰
            </button>
            {{ item }}
          </p>
        </template>
      </DragList>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        `drag-image` slot — the consumer's markup follows the cursor
      </h2>
      <DragList v-model:list="imaged" group="imaged">
        <template #default="{ item, dragging }">
          <p class="row" :class="{ 'opacity-40': dragging }">
            {{ item }}
          </p>
        </template>
        <template #drag-image="{ item, width }">
          <p class="row bg-surface shadow-lg" :style="{ width: `${width}px` }">
            Moving {{ item }}
          </p>
        </template>
      </DragList>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        A flex row — the list reads the landing spot along x
      </h2>
      <DragList
        v-model:list="horizontal"
        group="horizontal"
        reorder="placeholder"
        class="flex gap-2"
      >
        <template #default="{ item, dragging }">
          <p class="row" :class="{ 'opacity-40': dragging }">
            {{ item }}
          </p>
        </template>
        <template #placeholder="{ data }">
          <p class="row border-dashed opacity-60">
            {{ data.value }}
          </p>
        </template>
      </DragList>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        `visible` — a virtual list of {{ many.length }} items
      </h2>
      <p class="text-sm opacity-70">
        Drag a row to the top or the bottom edge. `useDragAutoScroll` scrolls the container,
        and the row lands in a part of the list that was not rendered.
      </p>
      <div v-bind="containerProps" class="h-80 overflow-y-auto rounded border p-2">
        <div v-bind="wrapperProps">
          <DragList
            v-model:list="many"
            :visible
            group="many"
            reorder="placeholder"
            :item-key="item => item.id"
          >
            <template #default="{ item, index, dragging }">
              <p class="row flex h-10 items-center" :class="{ 'opacity-40': dragging }">
                #{{ index }} — {{ item.text }}
              </p>
            </template>
            <template #placeholder="{ data }">
              <p class="row flex h-10 items-center border-dashed opacity-60">
                {{ data.value?.text }}
              </p>
            </template>
          </DragList>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* One row. The placeholder uses it too, so the rows do not move when it appears. */
.row {
  margin-bottom: 0.5rem;
  border-width: 1px;
  border-radius: 0.25rem;
  padding: 0.5rem 0.75rem;
  user-select: none;
}
</style>
