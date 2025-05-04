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

const name1 = '버그/장에'
const name2 = '신고/복구'
const name3 = '결제 문의'
const name4 = '계정 문제'
const name5 = '게임 정보'
const chartOptions = computed<EChartsOption>(() => ({
  grid: {
    top: props.padding - 20,
    right: props.padding - 30,
    bottom: props.padding + 15,
    left: props.padding + 0,
  },
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'shadow',
    },
  },
  xAxis: {
    type: 'category',
    data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    axisTick: { show: false },
  },
  yAxis: {
    type: 'value',
  },
  legend: {
    bottom: '0',
    left: 'center',
    padding: 0,
    itemGap: 25,
    data: [name1, name2, name3, name4, name5],
  },
  series: [
    {
      name: name1,
      data: [280, 150, 180, 200, 160, 120, 100],
      type: 'line',
      itemStyle: { color: '#60a5fa' },
      smooth: true,
    },
    {
      name: name2,
      data: [200, 140, 160, 150, 170, 160, 150],
      type: 'line',
      itemStyle: { color: '#34d399' },
      smooth: true,
    },
    {
      name: name3,
      data: [180, 120, 150, 150, 180, 160, 160],
      type: 'line',
      itemStyle: { color: '#f59e0b' },
      smooth: true,
    },
    {
      name: name4,
      data: [150, 110, 100, 130, 140, 150, 140],
      type: 'line',
      itemStyle: { color: '#f87171' },
      smooth: true,
    },
    // {
    //   name: name5,
    //   data: [120, 100, 90, 100, 50, 70, 80],
    //   type: 'line',
    //   itemStyle: { color: '#c084fc' },
    //   smooth: true,
    // },
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
