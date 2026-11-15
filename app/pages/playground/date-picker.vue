<script setup lang="ts">
import type { CalendarPeriod } from '~/components/base/calendar/utils'

const PERIODS: CalendarPeriod[] = ['date', 'month', 'quarter', 'year']

const due = ref<Date>()
const dueId = useId()

const seeded = ref<Date | undefined>(new Date(2026, 8, 14))

// One model for each period. A value from one period is not the first day of another.
const byPeriod = ref<Record<CalendarPeriod, Date | undefined>>({
  date: undefined,
  month: undefined,
  quarter: undefined,
  year: undefined,
})

const today = new Date()
const minDate = new Date(today.getFullYear(), today.getMonth(), 5)
const maxDate = new Date(today.getFullYear(), today.getMonth() + 1, 20)
const bounded = ref<Date>()
// The component keeps a value outside the bounds and shows it; see ADR-0007.
const outside = ref<Date | undefined>(new Date(today.getFullYear(), today.getMonth() - 2, 10))

const slash = ref<Date | undefined>(new Date(2026, 8, 14))
const locked = ref<Date | undefined>(new Date(2026, 8, 14))

const show = (value: Date | undefined) => value ? value.toString() : 'undefined'
</script>

<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-10 p-8">
    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        Empty — type, or pick from the calendar
      </h2>
      <p class="text-sm opacity-70">
        Click the field: the calendar opens and the field keeps the focus, so you can type.
        Click the field again to place the caret: the popover stays open. Press `ArrowDown` to
        move into the grid. `Escape`, a pick and a click outside close the popover.
      </p>
      <label :for="dueId" class="text-sm">Due date</label>
      <DatePicker v-model="due" :input-id="dueId" />
      <p class="text-sm opacity-70">
        {{ show(due) }}
      </p>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        A seeded value — the calendar opens on it
      </h2>
      <p class="text-sm opacity-70">
        Pick the selected day again: the popover closes and the value does not change. Type
        `2026.02.31`: the day does not exist, so the model keeps its value.
      </p>
      <DatePicker v-model="seeded" aria-label="Seeded date" />
      <p class="text-sm opacity-70">
        {{ show(seeded) }}
      </p>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        `period` — day, month, quarter and year
      </h2>
      <p class="text-sm opacity-70">
        The mask and the calendar view follow `period`. The model is the first day of the
        period: Q3 gives 1 July.
      </p>
      <div v-for="period in PERIODS" :key="period" class="flex items-center gap-3">
        <span class="w-16 text-sm">{{ period }}</span>
        <div class="w-40">
          <DatePicker v-model="byPeriod[period]" :period :aria-label="`Period ${period}`" />
        </div>
        <span class="text-sm opacity-70">{{ show(byPeriod[period]) }}</span>
      </div>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        `min-date` and `max-date`
      </h2>
      <p class="text-sm opacity-70">
        The range is the 5th of this month to the 20th of the next month. The calendar disables
        the days outside it. The field does not: a typed date outside the range stays, and your
        schema must reject it.
      </p>
      <DatePicker v-model="bounded" :min-date :max-date aria-label="Bounded date" />
      <p class="text-sm opacity-70">
        {{ show(bounded) }}
      </p>
      <p class="text-sm opacity-70">
        A value outside the range is kept and shown. Its day is selected and disabled.
      </p>
      <DatePicker v-model="outside" :min-date :max-date aria-label="Date outside the range" />
      <p class="text-sm opacity-70">
        {{ show(outside) }}
      </p>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        `separator`
      </h2>
      <DatePicker v-model="slash" separator="/" aria-label="Date with a slash" />
      <p class="text-sm opacity-70">
        {{ show(slash) }}
      </p>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        `disabled`
      </h2>
      <DatePicker v-model="locked" disabled aria-label="Disabled date" />
    </section>
  </div>
</template>
