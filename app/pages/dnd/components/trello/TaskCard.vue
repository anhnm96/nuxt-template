<script lang="ts" setup>
import type { Task } from './data'
import { taskTypes } from './data'

const props = defineProps<{ task: Task }>()

const badge = computed(() => taskTypes[props.task.type])
</script>

<template>
  <div class="block rounded-md bg-white p-5 shadow">
    <div class="flex justify-between gap-2">
      <p class="text-sm leading-snug font-semibold text-gray-900">
        {{ task.title }}
      </p>
      <span class="shrink-0">
        <img class="h-6 w-6 rounded-full" :src="task.avatar" alt="avatar">
      </span>
    </div>
    <div class="flex items-baseline justify-between">
      <div class="text-sm text-gray-600">
        <time :datetime="task.date">{{ task.date }}</time>
      </div>
      <div class="mt-2">
        <span
          class="inline-flex items-center rounded px-2 py-1 leading-tight"
          :class="badge.class"
        >
          <svg class="h-2 w-2" fill="currentColor" viewBox="0 0 8 8">
            <circle cx="4" cy="4" r="3" />
          </svg>
          <span class="ml-2 text-sm font-medium">{{ badge.label }}</span>
        </span>
      </div>
    </div>
  </div>
</template>
