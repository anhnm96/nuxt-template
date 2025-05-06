<script setup lang="ts">
import type { EChartsOption } from 'echarts'

const name1 = '접수 개수'
const name2 = '처리 개수'
const name3 = '처리율'
const data = {
  timeline: Array.from({ length: 31 }, (_, i) => {
    const currentDate = new Date('2024-12-01T00:00:00.000Z')

    currentDate.setDate(currentDate.getDate() + i)
    const value = formatDateTime(currentDate, i === 0 ? 'YYYY.MM.DD' : 'MM.DD') || ''

    // sunday
    if (currentDate.getDay() === 0) {
      return {
        value,
        textStyle: {
          color: '#e24c4c',
        },
      }
    } else {
      return {
        value,
        textStyle: {
          color: '#475569',
        },
      }
    }
  }),
  reception: [280, 150, 120, 180, 140, 145, 150, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 210, 220, 230, 240],
  processes: [130, 100, 120, 170, 15, 20, 70, 5, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
}

const throughputRate = data.reception.map((receipt, index) => {
  const process = data.processes[index] || 0

  return ((process / receipt) * 100).toFixed(2)
})

// calculate max value for left side yAxis
function roundUpToInterval(value: number, interval: number = 100): number {
  return Math.ceil(value / interval) * interval
}

// values for left side yAxis
const getReceptionIntervals = computed(() => {
  const lower = 0
  const upper = roundUpToInterval(Math.max(...data.reception))
  const interval = (upper - lower) / 3

  return [upper, lower + 2 * interval, lower + interval, lower]
})

// #region custom legend
const showReception = ref(true)
const showProcesses = ref(true)
const showThroughputRate = ref(true)
const chart = useTemplateRef('chart')

function toggleSelect(name: string) {
  switch (name) {
    case name1:
      showReception.value = !showReception.value
      break
    case name2:
      showProcesses.value = !showProcesses.value
      break
    case name3:
      showThroughputRate.value = !showThroughputRate.value
      break
  }

  chart.value?.dispatchAction({
    type: 'legendToggleSelect',
    name,
  })
}
// #endregion custom legend

const chartOptions = computed<EChartsOption>(() => ({
  animation: true,
  grid: {
    top: 30,
    bottom: 30,
    left: 15,
    right: 10,
  },
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
  },
  xAxis: {
    type: 'category',
    data: data.timeline,
    axisTick: { show: false },
    axisLabel: { interval: 0 },
  },
  yAxis: [
    { show: true, type: 'value', interval: 100, min: 0, max: roundUpToInterval(280), position: 'left', axisLabel: { show: false } },
    { show: true, type: 'value', interval: 33.33, min: 0, max: 100, position: 'right', axisLabel: { show: false } },
  ],
  legend: {
    data: [
      { name: name1, icon: 'circle' },
      { name: name2, icon: 'circle' },
      name3,
    ],
    show: false,
  },
  series: [
    {
      name: name1,
      data: data.reception,
      type: 'bar',
      yAxisIndex: 0,
      barCategoryGap: '40%',
      itemStyle: { color: '#60a5fa', borderRadius: [3, 3, 0, 0] },
    },
    {
      name: name2,
      data: data.processes,
      type: 'bar',
      yAxisIndex: 0,
      itemStyle: { color: '#475569', borderRadius: [3, 3, 0, 0] },
    },
    {
      name: name3,
      data: throughputRate,
      type: 'line',
      yAxisIndex: 1,
      smooth: true,
      itemStyle: { color: '#86efac' },
    },
  ],
}))

const chartMinWidth = computed(() => {
  if (data.timeline.length > 20) {
    return '!min-w-500'
  }

  if (data.timeline.length > 10) {
    return '!min-w-250'
  }

  return ''
})
</script>

<template>
  <!-- reception header -->
  <div class="mt-4">
    <h2 class="font-medium">
      접수 / 처리 기준
    </h2>
  </div>
  <!-- reception main -->
  <div class="mt-2 rounded-4 bg-abg p-4">
    <!-- chart -->
    <div class="rounded-md bg-white px-4">
      <div class="flex">
        <!-- left yAxis -->
        <div class="flex flex-col items-end gap-[59px] pr-4 pt-[19px] text-base">
          <p v-for="(value, index) in getReceptionIntervals" :key="index">
            {{ value }}
          </p>
        </div>
        <!-- chart -->
        <div class="w-full overflow-auto h-[300px]">
          <VChart
            ref="chart"
            :option="chartOptions"
            autoresize
            :class="chartMinWidth"
          />
        </div>
        <!-- right yAxis -->
        <div class="flex flex-col gap-[59px] pl-4 pt-[19px] text-base">
          <p v-for="(value, index) in ['100%', '66.6%', '33.3%', '0%']" :key="index">
            {{ value }}
          </p>
        </div>
        <!-- legend -->
        <div class="mt-4 w-40 flex flex-col select-none gap-8 p-4">
          <div class="flex cursor-pointer items-center gap-2" @click="toggleSelect(name1)">
            <span class="size-4.5 shrink-0 rounded-full" :class="[showReception ? 'bg-[#60a5fa]' : 'bg-slate-400']" />
            <span :class="[!showReception && 'text-slate-400']">{{ name1 }}</span>
          </div>
          <div class="flex cursor-pointer items-center gap-2" @click="toggleSelect(name2)">
            <span class="size-4.5 shrink-0 rounded-full" :class="[showProcesses ? 'bg-[#475569]' : 'bg-slate-400']" />
            <span :class="[!showProcesses && 'text-slate-400']">{{ name2 }}</span>
          </div>
          <div class="flex cursor-pointer items-center gap-3" @click="toggleSelect(name3)">
            <span
              class="relative size-4.5 shrink-0 border border-[#86efac] rounded-full after:absolute after:right-0 after:top-1/2 after:z-1 after:h-0.5 after:w-1.5 after:translate-x-full after:rounded-full after:bg-[#86efac] after:content-[''] after:-translate-y-1/2 before:absolute before:left-0 before:top-1/2 before:z-1 before:h-0.5 before:w-1.5 before:rounded-full before:bg-[#86efac] before:content-[''] before:-translate-x-full before:-translate-y-1/2"
              :class="[showThroughputRate ? 'border-[#86efac]' : 'border-slate-400 before:bg-slate-400 after:bg-slate-400']"
            />
            <span :class="[!showThroughputRate && 'text-slate-400']">{{ name3 }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
