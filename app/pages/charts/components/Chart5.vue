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
    bottom: props.padding + 15,
    left: 80,
  },
  tooltip: {
    show: false,
  },
  xAxis: {
    show: false,
    max: 82,
  },
  yAxis: {
    type: 'category',
    data: ['기술적 문제', '제품', '특징', '배송문제', '사용법 문의'].reverse(),
    axisLine: { show: false },
    axisLabel: {
      align: 'left',
      margin: 70,
    },
    axisTick: { show: false },
  },
  series: [
    {
      data: [82, 50, 42, 23, 12].reverse(),
      type: 'bar',
      barCategoryGap: '40%',
      itemStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 1,
          y2: 0,
          colorStops: [
            { offset: 0, color: '#93c5fd' },
            { offset: 0.5, color: '#c084fc' },
            { offset: 1, color: '#3b82f6' },
          ],
        },
        borderRadius: [4, 4, 4, 4],
      },
      label: {
        show: true,
        position: 'insideRight',
        color: '#fff',
      },
    },
  ],
}))
</script>

<template>
  <VChart
    :option="chartOptions"
    autoresize
    class="b b-abd rounded-8 aspect-[2/1] shadow-sm"
  />
</template>
