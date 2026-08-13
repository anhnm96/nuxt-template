<script lang="ts" setup>
import DragList from '~/components/base/dnd/DragList.vue'
import BoardColumn from './BoardColumn.vue'
import { createBoard } from './data'

const columns = ref(createBoard())
</script>

<template>
  <div class="flex h-[32rem] min-w-0 flex-col bg-white">
    <div class="flex-1 overflow-auto">
      <!--
        columns reorder immediately, they are the only list of their group so
        nothing foreign can arrive and no placeholder is needed. The cards live
        in a nested list of group "task", which keeps the two drags apart.
      -->
      <DragList
        v-model:list="columns"
        tag="main"
        group="column"
        class="inline-flex h-full p-3"
        handle=".column-handle"
        :item-key="column => column.name"
      >
        <template #default="{ item }">
          <BoardColumn v-model:tasks="item.tasks" :name="item.name" />
        </template>
        <template #drag-image="{ data, width }">
          <p
            class="rounded bg-gray-800 px-3 py-2 text-sm text-white"
            :style="{ width: `${width}px` }"
          >
            Moving {{ data.value.name }}
          </p>
        </template>
      </DragList>
    </div>
  </div>
</template>
