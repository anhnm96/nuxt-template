<script lang="ts" setup>
import DragList from '~/components/base/dnd/DragList.vue'

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

const data = ref<Item[]>(createItems(30, 'Lorem Ipsum'))

const infinite = useTemplateRef<HTMLElement>('infinite')
const { list, containerProps, wrapperProps } = useVirtualList(data, {
  // Keep `itemHeight` in sync with the item's row.
  itemHeight: 96,
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
const loading = ref(false)

useIntersectionObs(
  infinite,
  () => {
    if (loading.value) return
    loading.value = true
    // stand-in for a fetch, also keeps the observer from firing in a loop while
    // the sentinel stays visible
    setTimeout(() => {
      data.value.push(...createItems(10, 'More lorem Ipsum'))
      loading.value = false
    }, 300)
  },
  // load before the sentinel is actually reached, so dragging towards the
  // bottom keeps finding content
  { root: containerProps.ref, rootMargin: '0px 0px 200px 0px' },
)

// dragging near an edge scrolls the container, which is also what pulls the
// sentinel into view and loads more items mid-drag
useDragAutoScroll(containerProps.ref)
</script>

<template>
  <div class="text-gray-400">
    <div
      class="bg-green text-medium fixed top-4 left-4 rounded p-2 text-xl shadow-lg"
    >
      Loaded items: {{ data.length }}
    </div>
    <div class="h-120 overflow-y-auto rounded p-2" v-bind="containerProps">
      <div v-bind="wrapperProps" class="mx-auto max-w-sm">
        <DragList
          v-model:list="data"
          :visible="visible"
          reorder="placeholder"
          group="infinite"
          :item-key="item => item.id"
        >
          <template #default="{ item, index, dragging }">
            <div
              class="mb-4 flex h-[80px] flex-col justify-center rounded-lg border-neutral-600 bg-neutral-800 px-4 select-none"
              :class="{ 'opacity-40': dragging }"
            >
              <!-- index is the position in the whole list, not in the window -->
              <h2 class="mb-2 text-2xl">
                #{{ index }} — item {{ item.id }}
              </h2>
              <p class="text-sm">
                {{ item.text }}
              </p>
            </div>
          </template>
          <template #placeholder="{ data: payload }">
            <div
              class="mb-4 flex h-[80px] flex-col justify-center rounded-lg border-2 border-dashed border-green-500 px-4"
            >
              <p class="text-sm">
                {{ payload.value?.text }}
              </p>
            </div>
          </template>
        </DragList>
      </div>
      <div ref="infinite" class="h-px" />
      <p v-if="loading" class="py-2 text-center text-sm">
        Loading more…
      </p>
    </div>
  </div>
</template>
