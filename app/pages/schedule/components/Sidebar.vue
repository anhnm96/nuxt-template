<script setup lang="ts">
import type { Dayjs } from 'dayjs/esm'
import type { CalendarGroup } from '~/services/schedule'
import { DatePicker } from 'primevue'
import AccordionContent from '~/components/base/accordion/AccordionContent.vue'
import AccordionHeader from '~/components/base/accordion/AccordionHeader.vue'
import AccordionPanel from '~/components/base/accordion/AccordionPanel.vue'

defineProps<{
  calendars: CalendarGroup[]
}>()

const value = defineModel<Dayjs>({ default: $dayjs() })
const _value = computed({
  get() {
    return value.value.toDate()
  },
  set(newVal) {
    value.value = $dayjs(newVal)
  },
})
const SIDEBAR_WIDTH_OPEN = '272px'
const SIDEBAR_WIDTH_CLOSED = '0rem'
const openSidebar = defineModel('open', { type: Boolean, default: true })
// ids of the currently checked calendars, across every group
const selectedCalendarIds = defineModel<string[]>('selected', { default: () => [] })
</script>

<template>
  <aside
    :data-open="openSidebar"
    :style="{ '--sidebar-width': openSidebar ? SIDEBAR_WIDTH_OPEN : SIDEBAR_WIDTH_CLOSED }"
    class="group z-(--sidebar) w-(--sidebar-width) shrink-0 overflow-x-hidden overflow-y-auto border-r border-elevated transition-[width] duration-200 ease-linear will-change-[width]"
  >
    <div>
      <DatePicker
        v-model="_value"
        class="text-sm"
        inline
        :pt="{ panel: 'date-picker bg-transparent! p-0! border-none! h-100 overflow-hidden',
               calendar: 'group scale-72 origin-top-left',
               header: 'group-has-[.p-datepicker-year-view]:scale-140 group-has-[.p-datepicker-month-view]:scale-140 origin-top-left',
        }"
      />
    </div>
    <div class="w-(--sidebar-width-open) px-4" :style="{ '--sidebar-width-open': SIDEBAR_WIDTH_OPEN }">
      <AccordionPanel
        v-for="group in calendars"
        :key="group.id"
        expanded
        class="not-first:mt-6"
      >
        <AccordionHeader class="text-base font-medium">
          {{ group.title }}
        </AccordionHeader>
        <AccordionContent>
          <div class="flex flex-col gap-1">
            <Checkbox
              v-for="item in group.children" :key="item.id"
              v-model="selectedCalendarIds"
              :label-props="{ class: 'p-1' }"
              :style="{ '--background': item.color }"
              :label="item.title"
              :value="item.id"
            />
          </div>
        </AccordionContent>
      </AccordionPanel>
    </div>
  </aside>
</template>
