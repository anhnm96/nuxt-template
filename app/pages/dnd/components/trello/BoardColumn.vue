<script lang="ts" setup>
import type { Task } from './data'
import DragList from '~/components/base/dnd/DragList.vue'
import TaskCard from './TaskCard.vue'

defineProps<{ name: string }>()
/**
 * the column's own cards. A model, not a prop: cards leave for other columns
 * and arrive from them, and only the board owns the list they all come from
 */
const tasks = defineModel<Task[]>('tasks', { required: true })
</script>

<template>
  <!--
    h-full: without it the column is as tall as its cards, so taking one adds or
    drops height, which resizes every column on the board and rewraps its text
  -->
  <div
    class="ml-3 flex h-full w-80 max-w-sm shrink-0 flex-col rounded-md bg-gray-100"
  >
    <!-- the column drags by its header, so pressing a card drags the card -->
    <h3
      class="column-handle flex shrink-0 cursor-grab justify-between px-3 pt-3 pb-1 text-sm font-medium text-gray-700"
    >
      {{ name }}
      <span class="text-gray-500">{{ tasks.length }}</span>
    </h3>
    <!-- the gutter is always there, so a card arriving cannot narrow the cards -->
    <div class="min-h-0 flex-1 [scrollbar-gutter:stable] overflow-y-auto">
      <!--
        cut: a card taken over by another column leaves this one.
        min-h-full: the list is what takes the drag, so it has to reach the whole
        column. As tall as its cards it would leave the space below them dead,
        and an empty column would have no drop target at all
      -->
      <DragList
        v-model:list="tasks"
        tag="ul"
        item-tag="li"
        group="task"
        transfer="cut"
        reorder="placeholder"
        class="min-h-full px-3 pt-1 pb-3"
        :item-key="task => task.id"
      >
        <template #default="{ item, dragging }">
          <TaskCard
            :task="item"
            class="mb-3"
            :class="{ 'opacity-40': dragging }"
          />
        </template>
        <!--
          one slot for both origins: a card of this column is only moving, so
          the gap it will land in is enough, while a card of another column is
          not here yet and gets previewed
        -->
        <template #placeholder="{ origin, data }">
          <!--
            the card itself, only to hold the exact gap it will land in. Outline
            over border: it draws outside the box, so the gap stays card-sized
          -->
          <div
            v-if="origin === 'self'"
            class="mb-3 rounded-md outline-2 outline-teal-400 outline-dashed"
          >
            <TaskCard :task="data.value" class="invisible" />
          </div>
          <TaskCard
            v-else
            :task="data.value"
            class="mb-3 opacity-70 ring-2 ring-teal-400"
          />
        </template>
      </DragList>
    </div>
  </div>
</template>
