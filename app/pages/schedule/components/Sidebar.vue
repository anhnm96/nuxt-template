<script setup lang="ts">
import type { CalendarItem } from '~/services/schedule'
import AccordionContent from '~/components/base/accordion/AccordionContent.vue'
import AccordionHeader from '~/components/base/accordion/AccordionHeader.vue'
import AccordionPanel from '~/components/base/accordion/AccordionPanel.vue'

defineProps<{
  ownCalendarList: CalendarItem[]
  otherCalendarList: CalendarItem[]
}>()

const SIDEBAR_WIDTH_OPEN = '272px'
const SIDEBAR_WIDTH_CLOSED = '0rem'
const openSidebar = defineModel('open', { type: Boolean, default: true })
// calendarIds of the currently checked calendars (own + other)
const selectedCalendarIds = defineModel<(string | number)[]>('selected', { default: () => [] })
</script>

<template>
  <aside
    :data-open="openSidebar"
    :style="{ '--sidebar-width': openSidebar ? SIDEBAR_WIDTH_OPEN : SIDEBAR_WIDTH_CLOSED }"
    class="group z-(--sidebar) w-(--sidebar-width) shrink-0 overflow-x-hidden overflow-y-auto border-r border-elevated transition-[width] duration-200 ease-linear will-change-[width]"
  >
    <!-- <div>
      <v-date-picker
        show-adjacent-months hide-header
        class="date-picker origin-top-left scale-80 bg-transparent!"
        event-color="red"
        :events="getHolidayEvents"
      />
    </div> -->
    <div class="w-(--sidebar-width-open) px-4" :style="{ '--sidebar-width-open': SIDEBAR_WIDTH_OPEN }">
      <!-- my calendar -->
      <AccordionPanel expanded>
        <AccordionHeader class="text-base font-medium">
          マイカレンダー
        </AccordionHeader>
        <AccordionContent>
          <div class="flex flex-col gap-1">
            <Checkbox
              v-for="(item, index) in ownCalendarList" :key="index"
              v-model="selectedCalendarIds"
              :label-props="{ class: 'p-1' }"
              :style="{ '--background': item.calendarColor }"
              :label="item.calendarName"
              :value="item.calendarId"
            />
          </div>
        </AccordionContent>
      </AccordionPanel>
      <!-- other calendar -->
      <AccordionPanel expanded class="mt-6">
        <AccordionHeader class="text-base font-medium">
          他のカレンダー
        </AccordionHeader>
        <AccordionContent>
          <div class="flex flex-col gap-1">
            <Checkbox
              v-for="(item, index) in otherCalendarList" :key="index"
              v-model="selectedCalendarIds"
              :label-props="{ class: 'py-1' }"
              :style="{ '--background': item.calendarColor }"
              :label="item.calendarName"
              :value="item.calendarId"
            />
          </div>
        </AccordionContent>
      </AccordionPanel>
    </div>
  </aside>
</template>
