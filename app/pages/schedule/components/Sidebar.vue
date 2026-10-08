<script setup lang="ts">
import type { Dayjs } from 'dayjs/esm'
import type { CalendarGroup } from '~/services/schedule'
import AccordionContent from '~/components/base/accordion/AccordionContent.vue'
import AccordionHeader from '~/components/base/accordion/AccordionHeader.vue'
import AccordionPanel from '~/components/base/accordion/AccordionPanel.vue'

defineProps<{
  calendars: CalendarGroup[]
}>()

const value = defineModel<Dayjs>({ default: () => $dayjs() })

/** Calendar speaks `Date`; the rest of the schedule speaks `Dayjs`. */
const selectedDate = computed<Date | null>({
  get: () => value.value.toDate(),
  set: (next) => {
    // Single mode only emits `null` when `deselectable` is on, which it is not — but the
    // type allows it, and clearing the schedule's anchor date would be meaningless.
    if (next) value.value = $dayjs(next)
  },
})

const SIDEBAR_WIDTH_OPEN = '272px'
const SIDEBAR_WIDTH_CLOSED = '0rem'
/** `px-4` on both sides of the sidebar's content. */
const SIDEBAR_GUTTER = '2rem'

/**
 * The calendar is sized to the sidebar rather than the other way round: seven columns share
 * whatever is left after the gutter. Derived from the constants above so widening the
 * sidebar needs no second edit, and no `scale()` — see the note in the template.
 */
const CALENDAR_CELL = `calc((${SIDEBAR_WIDTH_OPEN} - ${SIDEBAR_GUTTER}) / 7)`

const openSidebar = defineModel('open', { type: Boolean, default: true })
// ids of the currently checked calendars, across every group
const selectedCalendarIds = defineModel<string[]>('selected', { default: () => [] })
const { locale, locales } = useI18n()
const currentLanguage = computed(() => {
  const current = locales.value.find(l => l.code === locale.value)
  return current?.language || locale.value
})
</script>

<template>
  <aside
    :data-open="openSidebar"
    :style="{
      '--sidebar-width': openSidebar ? SIDEBAR_WIDTH_OPEN : SIDEBAR_WIDTH_CLOSED,
      '--sidebar-width-open': SIDEBAR_WIDTH_OPEN,
    }"
    class="group z-(--sidebar) w-(--sidebar-width) shrink-0 overflow-x-hidden overflow-y-auto border-r border-elevated transition-[width] duration-200 ease-linear will-change-[width]"
  >
    <!--
      Pinned to the open width so the contents do not reflow while the sidebar animates
      shut — the same trick the accordion column below already uses.
    -->
    <div class="w-(--sidebar-width-open)">
      <Calendar
        v-model="selectedDate"
        :locale="currentLanguage"
        :style="{ '--calendar-cell': CALENDAR_CELL }"
        class="w-full"
      />
    </div>

    <div class="w-(--sidebar-width-open) px-4">
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
              label-props="p-1"
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
