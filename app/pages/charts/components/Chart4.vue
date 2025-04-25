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
  // grid: {
  //   top: props.padding + 20,
  //   right: props.padding,
  //   bottom: props.padding - 20,
  //   left: props.padding,
  // },
  // xAxis: { type: 'category', show: false },
  // yAxis: { type: 'value', show: false },
  grid: {
    top: 0,
    right: 0,
    bottom: 0, // More space for labels
    left: 0,
  },
  series: [
    {
      type: 'gauge',
      startAngle: 180,
      endAngle: 0,
      min: 0,
      max: 100,
      splitNumber: 10,
      itemStyle: {
        color: '#60a5fa',
        shadowColor: 'rgba(96, 165, 250, 0.45)',
        shadowBlur: 10,
        shadowOffsetX: 2,
        shadowOffsetY: 2,
      },
      progress: {
        show: true,
        roundCap: true,
        width: 10,
      },
      pointer: {
        show: false,
        icon: 'path://M2090.36389,615.30999 L2090.36389,615.30999 C2091.48372,615.30999 2092.40383,616.194028 2092.44859,617.312956 L2096.90698,728.755929 C2097.05155,732.369577 2094.2393,735.416212 2090.62566,735.56078 C2090.53845,735.564269 2090.45117,735.566014 2090.36389,735.566014 L2090.36389,735.566014 C2086.74736,735.566014 2083.81557,732.63423 2083.81557,729.017692 C2083.81557,728.930412 2083.81732,728.84314 2083.82081,728.755929 L2088.2792,617.312956 C2088.32396,616.194028 2089.24407,615.30999 2090.36389,615.30999 Z',
        length: '75%',
        width: 12,
        offsetCenter: [0, '5%'],
      },
      axisLine: {
        roundCap: true,
        lineStyle: { width: 10 },
      },
      axisTick: {
        show: false,
        splitNumber: 2,
        lineStyle: {
          width: 2,
          color: '#999',
        },
      },
      splitLine: {
        show: true,
        length: 4,
        lineStyle: {
          width: 1,
          color: '#999',
        },
      },
      axisLabel: {
        show: false,
        distance: 30,
        color: '#999',
        fontSize: 20,
      },
      data: [{ value: 84 }],
      detail: {
        show: true,
        valueAnimation: true,
        fontSize: 16,
        offsetCenter: [0, '-4%'],
        formatter: '{value}%',
      },
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
        84%
      </p>
      <!-- percentage -->
      <span class="flex items-center gap-1 text-success">
        <i class="i-mingcute:triangle-fill mt-0.5 size-3 rotate-180" /> 12.8%
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
