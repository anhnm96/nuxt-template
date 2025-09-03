<script setup lang="ts">
import type { EChartsOption } from 'echarts'

const props = withDefaults(
  defineProps<{
    padding?: number
  }>(),
  {
    padding: 30,
  },
)

const name1 = '1'
const name2 = '2'
const name3 = '3'
const name4 = '4'

const chartOptions = computed<EChartsOption>(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'shadow',
    },
  },
  grid: {
    top: props.padding - 30,
    right: props.padding - 30,
    bottom: props.padding - 10,
    left: props.padding - 30,
  },
  xAxis: {
    type: 'category',
    data: ['121(일)', '122 (월)', '123 (화)', '124 (수)', '125（号)'],
    axisTick: { show: false },
    axisLine: { show: true },
  },
  yAxis: {
    type: 'value',
    show: false,
  },
  series: [
    {
      name: name1,
      type: 'bar',
      stack: 'total',
      data: [56.7, 52.7, 46.7, 56.7, 46.7],
      barCategoryGap: '50%',
      itemStyle: { color: '#60a5fa' },
      label: {
        show: true,
        position: 'inside',
        color: '#fff',
      },
    },
    {
      name: name2,
      type: 'bar',
      stack: 'total',
      data: [20.4, 22.4, 20.4, 20.4, 22.4],
      itemStyle: { color: '#34d399' },
      label: {
        show: true,
        position: 'inside',
        color: '#fff',
      },
    },
    {
      name: name3,
      type: 'bar',
      stack: 'total',
      data: [14.3, 14.3, 18.3, 14.3, 20.3],
      itemStyle: { color: '#f59e0b' },
      label: {
        show: true,
        position: 'inside',
        color: '#fff',
      },
    },
    {
      name: name4,
      type: 'bar',
      stack: 'total',
      data: [8.6, 10.6, 14.6, 8.6, 10.6],
      itemStyle: { color: '#f87171', borderRadius: [3, 3, 0, 0] },
      label: {
        show: true,
        position: 'inside',
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
    class="b b-abd rounded-8 aspect-[3/2] shadow-sm"
  />
</template>
