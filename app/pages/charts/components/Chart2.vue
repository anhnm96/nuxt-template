<script setup lang="ts">
import type { EChartsOption } from 'echarts'

const props = withDefaults(
  defineProps<{
    padding?: number
  }>(),
  {
    padding: 0,
  },
)

const chartOptions = computed<EChartsOption>(() => ({
  animation: true,
  grid: {
    top: props.padding + 15,
    right: props.padding,
    bottom: props.padding,
    left: props.padding,
  },
  xAxis: { type: 'category', show: false },
  yAxis: { type: 'value', show: false },
  series: [
    {
      data: [4, 8, 5, 10, 7, 4, 6, 3, 4, 5, 2],
      type: 'line',
      barCategoryGap: '50%',
      itemStyle: { color: '#60a5fa' },
      smooth: true,
      symbol: 'none',
    },
  ],
}))
</script>

<template>
  <article class="grid aspect-[2/1] grid-cols-[auto_1fr] grid-rows-[auto_1fr] gap-2 rounded-lg border border-elevated">
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
      <span class="flex items-center gap-1 text-error">
        <Icon class="mt-0.5 rotate-180" name="tabler:triangle-filled" /> 12.8%
      </span>
    </main>
    <!-- chart -->
    <VChart
      :option="chartOptions"
      autoresize
      class="pointer-events-none col-start-2 row-span-2"
    />
  </article>
</template>
