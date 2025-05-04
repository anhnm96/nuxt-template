<script setup lang="ts">
import type { EChartsOption } from 'echarts'

withDefaults(
  defineProps<{
    padding?: number
  }>(),
  {
    padding: 0,
  },
)

const chartOptions = computed<EChartsOption>(() => ({
  animation: true,
  series: [
    {
      type: 'pie',
      radius: ['40%', '90%'],
      padAngle: 2,
      itemStyle: { borderRadius: 4 },
      label: { show: false },
      data: [
        { value: 1048, itemStyle: { color: '#60a5fa' } },
        { value: 735, itemStyle: { color: '#34d399' } },
        { value: 580, itemStyle: { color: '#f59e0b' } },
        { value: 484, itemStyle: { color: '#f87171' } },
        { value: 300, itemStyle: { color: '#c084fc' } },
      ],
    },
  ],
}))
</script>

<template>
  <article class="grid grid-cols-[auto_1fr] grid-rows-[auto_1fr] aspect-[2/1] gap-2 border border-abd rounded-lg">
    <!-- title -->
    <header class="h-fit">
      <h2>Community</h2>
    </header>
    <!-- main -->
    <main class="col-start-1 row-start-2 mt-2.5">
      <!-- value -->
      <p class="text-2xl font-semibold">
        6,574
      </p>
      <!-- percentage -->
      <span class="flex items-center gap-1 text-success">
        <Icon class="mt-0.5" name="tabler:triangle-filled" /> 12.8%
      </span>
    </main>
    <!-- chart -->
    <VChart
      :option="chartOptions"
      autoresize
      class="pointer-events-none row-span-2 col-start-2"
    />
  </article>
</template>
