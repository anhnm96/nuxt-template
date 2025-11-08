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
  <Motion
    class="group relative flex flex-col overflow-hidden rounded-lg bg-white shadow-xs ring-1 ring-black/5 dark:bg-slate-800 dark:ring-white/15"
    initial="idle" while-hover="active" :variants="{ idle: {}, active: {} }"
  >
    <div class="relative h-80 shrink-0">
      <slot />
      <div
        v-if="fade?.includes('top')"
        class="absolute inset-0 bg-linear-to-b from-white to-50% group-dark:from-slate-800 group-dark:from-[-25%]"
      />
      <div
        v-if="fade?.includes('bottom')"
        class="absolute inset-0 bg-linear-to-t from-white to-50% group-dark:from-slate-800 group-dark:from-[-25%]"
      />
    </div>
    <div class="relative p-10">
      <h3 class="font-mono text-xs/5 font-semibold tracking-widest text-slate-500 uppercase dark:text-slate-400" />
      <p class="mt-1 text-2xl/8 font-medium tracking-tight text-slate-950 group-dark:text-white">
        {{ title }}
      </p>
      <p class="mt-2 max-w-[600px] text-sm/6 text-slate-600 group-dark:text-slate-400">
        {{ description }}
      </p>
    </div>
  </Motion>
</template>
