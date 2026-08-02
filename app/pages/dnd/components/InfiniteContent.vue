<script lang="ts" setup>
const data = ref(Array.from(Array.from({ length: 30 }).keys(), index => `Lorem Ipsum ${index}`))
const { list, containerProps, wrapperProps } = useVirtualList(data, {
  // Keep `itemHeight` in sync with the item's row.
  itemHeight: 96,
})

const infinite = ref()
useIntersectionObs(
  infinite,
  () => {
    // load more
    data.value.push(...Array.from(Array.from({ length: 10 }).keys(), index => `More lorem Ipsum ${index}`))
  },
  { root: containerProps.ref, rootMargin: '0px 0px 10px 0px' },
)
</script>

<template>
  <div class="text-gray-400">
    <div
      class="bg-green text-medium fixed top-4 left-4 rounded p-2 text-xl shadow-lg"
    >
      Loaded items: {{ data.length }}
    </div>
    <div class="h-screen rounded p-2" v-bind="containerProps">
      <div v-bind="wrapperProps" class="mx-auto max-w-sm">
        <div
          v-for="{ index, data: dt } in list"
          :key="index"
          class="mb-4 flex h-[80px] flex-col justify-center rounded-lg border-neutral-600 bg-neutral-800 px-4 select-none"
        >
          <h2 class="mb-2 text-2xl">
            Item #{{ index }}
          </h2>
          <p class="text-sm">
            {{ dt }}
          </p>
        </div>
        <div ref="infinite" />
      </div>
    </div>
  </div>
</template>
