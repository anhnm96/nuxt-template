<script lang="ts" setup>
import DragList from '~/components/base/dnd/DragList.vue'

const props = withDefaults(defineProps<{ length?: number }>(), {
  length: 30,
})

interface Item {
  id: number
  text: string
}

let nextId = 0
function createItems(count: number, label: string): Item[] {
  return Array.from({ length: count }, () => {
    const id = nextId++
    return { id, text: `${label} ${id}` }
  })
}

const data = ref<Item[]>(createItems(props.length, 'Lorem Ipsum'))

const { list, containerProps, wrapperProps } = useVirtualList(data, {
  // Keep `itemHeight` in sync with the item's row.
  itemHeight: 60,
  overscan: 10,
})
/**
 * Which part of `data` the virtualizer renders. The DragList takes the whole
 * `data` and only renders this window, so indexes, reordering and drops keep
 * working on the full list.
 */
const visible = computed(() => ({
  offset: list.value[0]?.index ?? 0,
  count: list.value.length,
}))

// dragging near an edge scrolls the container, which is also what pulls the
// sentinel into view and loads more items mid-drag
useDragAutoScroll(containerProps.ref)

// asleep until the page is opened with `?dnd-record`, then it keeps what the
// drag did to this container and who scrolled it, see `useDragRecorder`
useDragRecorder(containerProps.ref)
</script>

<template>
  <div class="h-120 overflow-y-auto rounded p-2" v-bind="containerProps">
    <div v-bind="wrapperProps" class="mx-auto max-w-sm">
      <DragList
        v-model:list="data"
        :visible="visible"
        reorder="placeholder"
        group="infinite"
        :item-key="item => item.id"
      >
        <template #default="{ item, dragging }">
          <div
            class="flex h-[60px] flex-col justify-center rounded-lg border-neutral-600 bg-neutral-800 px-4 select-none"
            :class="{ 'opacity-40': dragging }"
          >
            <div class="flex gap-1.5">
              <span class="w-14 shrink-0 truncate">share</span>
              <span class="font-semibold">{{ item.text }}</span>
              <span class="ml-auto inline-flex size-5 shrink-0 rounded-full bg-primary" />
            </div>
          </div>
        </template>
        <template #placeholder="{ data: payload }">
          <div
            class="flex h-[60px] flex-col justify-center rounded-lg border-2 border-dashed border-green-500 px-4"
          >
            <p class="text-sm">
              {{ payload.value?.text }}
            </p>
          </div>
        </template>
      </DragList>
    </div>
  </div>
</template>
