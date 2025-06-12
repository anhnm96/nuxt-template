<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import dayjs from 'dayjs/esm'
import Paginator from 'primevue/paginator'
import { getResolutionRate } from '~/services/inquiries'

const PAGE_SIZE = 30
const { data: resolutionRateData } = useQuery({
  key: ['resolutionRate'],
  query: () => fetchResolutionRateData(),
})

const unit = 'day'
const currentResolutionRatePage = ref(1)
async function fetchResolutionRateData() {
  const startDate = dayjs().subtract(1, 'month').startOf('month')
  const endDate = dayjs().endOf('day')

  // Get the UTC offset in minutes
  const offsetInMinutes = startDate.utcOffset() // e.g., 420 for UTC+7

  // Convert to hours
  const offsetInHours = offsetInMinutes / 60

  const params = {
    period: {
      from: startDate.add(offsetInHours, 'hour').toISOString(),
      to: endDate.add(offsetInHours, 'hour').toISOString(),
      size: PAGE_SIZE,
    },
  }

  const data = await getResolutionRate(params)

  if (!data) return

  // handle dates displayed in x-axis
  const timeline = data.reception[0]?.dateTimeCount.map((item, index) => {
    const date = new Date(item.dateTime)

    // format timeline for daily data
    if (unit === 'day') {
      const value = formatDateTime(date, index === 0 || (date.getDate() === 1 && date.getMonth() === 0) ? 'YYYY.MM.DD' : 'MM.DD') || ''

      // sunday
      if (date.getDay() === 0) {
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
    }

    // format timeline for monthly data
    return formatDateTime(date, index === 0 || date.getMonth() === 0 ? 'YYYY.MM' : 'MM') || ''
  }) || []

  const reception = data.reception[0]?.dateTimeCount.map(item => item.count) || []
  const completed = data.completed[0]?.dateTimeCount.map(item => item.count) || []
  const processingRates = data.processingRates.map((item) => {
    if (item.percent === 'NaN') {
      return 0
    }

    return item.percent as number
  }) || []

  return {
    timeline,
    reception,
    completed,
    processingRates,
    totalElements: data.totalElements || 0,
  }
}

const receptionLabel = '접수 개수'
const completedLabel = '처리 개수'
const processingRatesLabel = '처리율'
// calculate max value for left side yAxis
function calculateMaxValue(value: number) {
  const factorLength = Math.max(2, Math.ceil(Math.log10(value))) - 2
  const roundingFactor = 10 ** factorLength
  const rounded = Math.ceil(Math.max(1, value) / (4 * roundingFactor)) * 4 * roundingFactor

  return rounded
}

// values for left side yAxis
const receptionIntervals = computed(() => {
  const lower = 0
  const upper = calculateMaxValue(Math.max(...resolutionRateData.value!.reception))
  const interval = (upper - lower) / 4

  return [upper, 3 * interval, 2 * interval, interval, 0]
})

// #region custom legend
const showReception = ref(true)
const showProcesses = ref(true)
const showThroughputRate = ref(true)
const chart = useTemplateRef('chart')

function toggleSelect(name: string) {
  switch (name) {
    case receptionLabel:
      showReception.value = !showReception.value
      break
    case completedLabel:
      showProcesses.value = !showProcesses.value
      break
    case processingRatesLabel:
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
    appendTo: 'body',
  },
  xAxis: {
    type: 'category',
    data: resolutionRateData.value!.timeline,
    axisTick: { show: false },
    axisLabel: { interval: 0 },
  },
  yAxis: [
    { show: true, type: 'value', interval: receptionIntervals.value[0]! - receptionIntervals.value[1]!, min: 0, max: receptionIntervals.value[0]!, position: 'left', axisLabel: { show: false } },
    { show: true, type: 'value', interval: 33.33, min: 0, max: 100, position: 'right', axisLabel: { show: false } },
  ],
  legend: {
    selected: {
      [receptionLabel]: showReception.value,
      [completedLabel]: showProcesses.value,
      [processingRatesLabel]: showThroughputRate.value,
    },
    data: [
      { name: receptionLabel, icon: 'circle' },
      { name: completedLabel, icon: 'circle' },
      processingRatesLabel,
    ],
    show: false,
  },
  series: [
    {
      name: receptionLabel,
      data: resolutionRateData.value!.reception,
      type: 'bar',
      yAxisIndex: 0,
      barCategoryGap: '42%',
      itemStyle: { color: '#60a5fa', borderRadius: [3, 3, 0, 0] },
    },
    {
      name: completedLabel,
      data: resolutionRateData.value!.completed,
      type: 'bar',
      yAxisIndex: 0,
      itemStyle: { color: '#475569', borderRadius: [3, 3, 0, 0] },
    },
    {
      name: processingRatesLabel,
      data: resolutionRateData.value!.processingRates,
      type: 'line',
      yAxisIndex: 1,
      smooth: true,
      itemStyle: { color: '#86efac' },
    },
  ],
}))

const chartMinWidth = computed(() => {
  if ((resolutionRateData.value?.reception.length || 0) > 20) {
    return '!min-w-[3000px]'
  }

  if ((resolutionRateData.value?.reception.length || 0) > 10) {
    return '!min-w-[1500px]'
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
    <div v-if="resolutionRateData" class="rounded-md bg-white px-4">
      <div class="flex">
        <!-- left yAxis -->
        <div class="flex flex-col items-end gap-[26px] pr-1 pt-[19px] text-base">
          <p v-for="(value, index) in receptionIntervals" :key="index">
            {{ value }}
          </p>
        </div>
        <!-- chart -->
        <div class="w-full overflow-auto">
          <VChart
            ref="chart"
            :option="chartOptions"
            autoresize
            class="h-300 w-full shadow-sm"
            :class="chartMinWidth"
          />
        </div>
        <!-- right yAxis -->
        <div class="flex flex-col gap-[26px] pl-1 pt-[19px] text-base">
          <p v-for="(value, index) in ['100%', '75%', '50%', '25%', '0%']" :key="index">
            {{ value }}
          </p>
        </div>
        <!-- legend -->
        <div class="mt-4 w-40 flex flex-col select-none gap-8 p-4">
          <div class="flex cursor-pointer items-center gap-2" @click="toggleSelect(receptionLabel)">
            <span class="size-4.5 shrink-0 rounded-full" :class="[showReception ? 'bg-[#60a5fa]' : 'bg-slate-400']" />
            <span :class="[!showReception && 'text-slate-400']">{{ receptionLabel }}</span>
          </div>
          <div class="flex cursor-pointer items-center gap-2" @click="toggleSelect(completedLabel)">
            <span class="size-4.5 shrink-0 rounded-full" :class="[showProcesses ? 'bg-[#475569]' : 'bg-slate-400']" />
            <span :class="[!showProcesses && 'text-slate-400']">{{ completedLabel }}</span>
          </div>
          <div class="flex cursor-pointer items-center gap-2" @click="toggleSelect(processingRatesLabel)">
            <span
              class="relative size-4.5 shrink-0 border border-[#86efac] rounded-full after:absolute after:right-0 after:top-1/2 after:z-1 after:h-0.5 after:w-1.5 after:translate-x-full after:rounded-full after:bg-[#86efac] after:content-[''] after:-translate-y-1/2 before:absolute before:left-0 before:top-1/2 before:z-1 before:h-0.5 before:w-1.5 before:rounded-full before:bg-[#86efac] before:content-[''] before:-translate-x-full before:-translate-y-1/2"
              :class="[showThroughputRate ? 'border-[#86efac]' : 'border-slate-400 before:bg-slate-400 after:bg-slate-400']"
            />
            <span :class="[!showThroughputRate && 'text-slate-400']">{{ processingRatesLabel }}</span>
          </div>
        </div>
      </div>
      <Paginator
        v-if="resolutionRateData && resolutionRateData?.totalElements > 0"
        class="p-datatable-paginator-bottom mt--1 mt-16 b-x b-t"
        :rows="PAGE_SIZE"
        :total-records="resolutionRateData.totalElements"
        :first="currentResolutionRatePage * PAGE_SIZE"
        :page-link-size="10"
      />
      <!-- @page="fetchResolutionRateData($event.page)" -->
    </div>
  </div>
</template>
