<script setup lang="ts">
import type { EChartsOption } from 'echarts'

withDefaults(
  defineProps<{
    padding?: number
  }>(),
  {
    padding: 30,
  },
)

const chartOptions = computed<EChartsOption>(() => ({
  animation: true,
  tooltip: {
    trigger: 'item',
  },
  series: [
    {
      name: 'Access From',
      type: 'pie',
      radius: ['40%', '90%'],
      avoidLabelOverlap: true,
      padAngle: 2,
      itemStyle: { borderRadius: 6 },
      label: {
        show: true,
        position: 'outside',
        formatter: '{b}', // {b}: {c} ({d}%)
        fontSize: 12,
      },
      data: [
        { value: 1048, name: 'Search Engine', itemStyle: { color: '#60a5fa' } },
        { value: 735, name: 'Direct', itemStyle: { color: '#34d399' } },
        { value: 580, name: 'Email', itemStyle: { color: '#f59e0b' } },
        { value: 484, name: 'Union Ads', itemStyle: { color: '#f87171' } },
        { value: 300, name: 'Video Ads', itemStyle: { color: '#c084fc' } },
      ],
    },
  ],
}))
</script>

<template>
  <VChart
    :option="chartOptions"
    autoresize
    class="aspect-[2/1] b b-abd rounded-8 shadow-sm"
  />
</template>
