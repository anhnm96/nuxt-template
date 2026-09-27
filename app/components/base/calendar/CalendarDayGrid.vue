<script setup lang="ts">
import CalendarCell from './CalendarCell.vue'
import { injectCalendarContext } from './context'
import { addMonths, addYears } from './utils'

const ctx = injectCalendarContext()
const { calendar } = ctx

/** The displayed row holding the roving focus — `Home` / `End` operate over it. */
/**
 * When every day is disabled, no button can take focus, so the grid itself becomes the tab
 * stop — otherwise a keyboard user cannot reach the arrow keys that would page out of the
 * dead month. Never while `disabled`, which must skip the Calendar entirely.
 */
const needsOwnTabStop = computed(() =>
  !ctx.disabled.value && !calendar.hasTabbableDay.value)

const focusedWeek = computed(() =>
  calendar.weeks.value.find(week =>
    week.days.some(day => day.isTabbable))
  ?? calendar.weeks.value[0])

function handleKeydown(event: KeyboardEvent) {
  if (ctx.disabled.value) return
  const focused = calendar.focusedDate.value

  switch (event.key) {
    case 'ArrowLeft':
      calendar.moveFocusBy(-1)
      break
    case 'ArrowRight':
      calendar.moveFocusBy(1)
      break
    case 'ArrowUp':
      calendar.moveFocusBy(-7)
      break
    case 'ArrowDown':
      calendar.moveFocusBy(7)
      break
    case 'Home':
      calendar.moveFocusTo(focusedWeek.value!.days[0]!.date, 1)
      break
    case 'End':
      calendar.moveFocusTo(focusedWeek.value!.days[6]!.date, -1)
      break
    case 'PageUp':
      calendar.moveFocusTo(
        event.shiftKey ? addYears(focused, -1) : addMonths(focused, -1),
        -1,
      )
      break
    case 'PageDown':
      calendar.moveFocusTo(
        event.shiftKey ? addYears(focused, 1) : addMonths(focused, 1),
        1,
      )
      break
    case 'Enter':
    case ' ':
      calendar.select(focused)
      break
    // `Escape` is deliberately absent from the day view: it belongs to whatever wraps the
    // Calendar, so it must bubble.
    default:
      return
  }

  event.preventDefault()
}
</script>

<template>
  <table
    role="grid"
    class="table-fixed border-collapse"
    :aria-label="calendar.headingLabel.value"
    :aria-disabled="ctx.disabled.value || undefined"
    :tabindex="needsOwnTabStop ? 0 : undefined"
    @keydown="handleKeydown"
  >
    <thead>
      <tr role="row">
        <!-- Named so the week column is not announced as an unlabelled column. -->
        <th
          v-if="ctx.showWeekNumbers.value"
          scope="col"
          role="columnheader"
          :style="{ width: 'var(--calendar-week-column)' }"
        >
          <span class="sr-only">{{ ctx.labels.value.weekColumn }}</span>
        </th>
        <th
          v-for="weekday in calendar.weekdays.value"
          :key="weekday.key"
          scope="col"
          role="columnheader"
          :style="{ width: 'var(--calendar-cell)' }"
          class="pb-1 text-xs font-medium text-muted"
        >
          <!--
            A real wrapper element, not `Slot`: `Slot` merges attributes onto its child's
            root element, and the documented override (`{{ short }}`) renders a bare text
            node with no element to merge onto — so `aria-hidden` silently vanished and the
            override was announced alongside the long name below.
          -->
          <span aria-hidden="true">
            <slot name="weekday" v-bind="weekday">{{ weekday.narrow }}</slot>
          </span>
          <span class="sr-only">{{ weekday.long }}</span>
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="week in calendar.weeks.value" :key="week.key" role="row">
        <th
          v-if="week.weekNumber !== null"
          scope="row"
          role="rowheader"
          class="text-xs font-normal text-muted"
        >
          {{ week.weekNumber }}
        </th>
        <CalendarCell v-for="day in week.days" :key="day.key" :day="day">
          <template #default="slotProps">
            <slot name="day" v-bind="slotProps">
              {{ day.dayOfMonth }}
            </slot>
          </template>
        </CalendarCell>
      </tr>
    </tbody>
  </table>
</template>
