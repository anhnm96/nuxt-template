<script setup lang="ts">
defineProps<{
  dark?: boolean
  eyebrow: string
  title: string
  description: string
  fade?: ('top' | 'bottom')[]
}>()
</script>

<template>
  <div :data-dark="dark ? 'true' : undefined" class="group relative flex flex-col overflow-hidden rounded-lg bg-white shadow-xs ring-1 ring-black/5 data-dark:bg-gray-800 data-dark:ring-white/15">
    <div class="relative h-80 shrink-0">
      <slot />
      <div v-if="fade?.includes('top')" class="absolute inset-0 bg-linear-to-b from-white to-50% group-data-dark:from-gray-800 group-data-dark:from-[-25%]" />
      <div v-if="fade?.includes('bottom')" class="absolute inset-0 bg-linear-to-t from-white to-50% group-data-dark:from-gray-800 group-data-dark:from-[-25%]" />
    </div>
    <div class="relative p-10">
      <h3 class="font-mono text-xs/5 font-semibold tracking-widest text-gray-500 uppercase data-dark:text-gray-400" />
      <p class="mt-1 text-2xl/8 font-medium tracking-tight text-gray-950 group-data-dark:text-white">
        {{ title }}
      </p>
      <p class="mt-2 max-w-[600px] text-sm/6 text-gray-600 group-data-dark:text-gray-400">
        {{ description }}
      </p>
    </div>
  </div>
</template>
