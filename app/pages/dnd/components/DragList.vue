<script lang="ts" setup>
import DragList from '~/components/base/dnd/DragList.vue'

const list = ref([
  'vue',
  'ReactiveX',
  'Drag and Drop',
  'react',
  'preact',
  'golang',
  'docker',
])

const items = ref([1, 2, 3, 4, 5, 6, 7])
</script>

<template>
  <div class="flex">
    <div>
      <p>Drag with handle</p>
      <DragList v-model:list="list" handle=".handle" reorder="placeholder">
        <template #default="{ item, index }">
          <p class="p-2 font-normal shadow">
            <button class="handle">
              &#9776;
            </button>
            <span class="p-2">{{ item }} - {{ index }}</span>
          </p>
        </template>
        <template #placeholder>
          <div style="border: 1px solid green; height: 1px" />
        </template>
      </DragList>
    </div>
    <div>
      <p>&nbsp;placeholder per origin |</p>
      <DragList v-model:list="items" reorder="placeholder">
        <template #default="{ item, index }">
          <p class="p-2 font-normal shadow">
            {{ item }} - {{ index }}
          </p>
        </template>
        <!-- one slot, told apart by where the item comes from -->
        <template #placeholder="{ origin, item }">
          <template v-if="origin === 'self'">
            moving
          </template>
          <template v-else>
            {{ item }}
          </template>
        </template>
      </DragList>
    </div>
    <div>
      <p>&nbsp;immediate reorder, placeholder for incoming |</p>
      <DragList v-model:list="list" transfer="cut">
        <template #default="{ item, index }">
          <p class="p-2 font-normal shadow">
            {{ item }} - {{ index }}
          </p>
        </template>
        <template #placeholder>
          <p class="p-2 font-normal shadow">
            test
          </p>
        </template>
      </DragList>
    </div>
    <div>
      <p>&nbsp;placeholder reorder |</p>
      <DragList v-model:list="list" reorder="placeholder">
        <template #default="{ item, index, dragging }">
          <p class="p-2 font-normal shadow" :class="{ ghost: dragging }">
            {{ item }} - {{ index }}
          </p>
        </template>
        <template #placeholder="{ data }">
          <p
            class="border-light-blue-500 border-2 border-dashed p-2 font-normal shadow"
          >
            {{ data?.value }} - {{ data?.index }}
          </p>
        </template>
        <!-- <template #drag-image="{data, width, height}">
                <p class="p-2 font-normal shadow border-2 border-green-300 rounded-md" :style="{width: width + 6 + 'px', height: height + 6 +'px'}">
                  :)) - {{ data.value }}
                </p>
              </template> -->
      </DragList>
    </div>
    <div>
      <p>&nbsp;drag image |</p>
      <DragList
        v-model:list="items"
        reorder="placeholder"
        :accept-data="data => typeof data?.value === 'number'"
      >
        <template #default="{ item, index }">
          <p class="p-2 font-normal shadow">
            {{ item }} - {{ index }}
          </p>
        </template>
        <template #placeholder="{ origin, item }">
          <p class="p-2 font-normal shadow">
            {{ origin === 'self' ? 'move' : item }}
          </p>
        </template>
        <template #drag-image>
          <p class="p-2 font-normal shadow">
            hehe
          </p>
        </template>
      </DragList>
    </div>
  </div>
</template>

<style scoped>
p {
  margin: 0 !important;
}

.ghost {
  opacity: 0.4;
}
</style>
