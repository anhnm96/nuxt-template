<script setup lang="ts">
/**
 * Type-level regression guard, checked by `pnpm typecheck` (vue-tsc).
 *
 * ADR-0006 chose a `mode` string union over `Select`'s `multiple` boolean. A string prop has
 * no Boolean-casting trap, but the narrowing it buys is still invisible to unit tests: only
 * a `.vue` template type-check proves that `mode="multiple"` actually turns `v-model` into
 * `Date[]`.
 *
 * The `@vue-expect-error` lines are the load-bearing half. If narrowing regresses so that
 * `modelValue` widens to `Date | Date[] | null`, the mismatched bindings stop erroring and
 * vue-tsc reports the directives as unused. Either direction fails the build.
 */
import Calendar from '~/components/base/calendar/Calendar.vue'

const single = ref<Date | null>(null)
const multi = ref<Date[]>([])

// Deliberately mismatched, to prove the narrowing bites in both directions.
const arrayBoundToSingle = ref<Date[]>([])
const scalarBoundToMultiple = ref<Date | null>(null)

const visibleMonth = ref(new Date())

function isDateDisabled(date: Date) {
  return date.getDay() === 0
}
</script>

<template>
  <div>
    <!-- Default mode is single: `Date | null`. -->
    <Calendar v-model="single" />
    <Calendar v-model="single" mode="single" />
    <Calendar v-model="multi" mode="multiple" />

    <!-- @vue-expect-error single mode must reject an array -->
    <Calendar v-model="arrayBoundToSingle" />
    <!-- @vue-expect-error multiple mode must reject a scalar -->
    <Calendar v-model="scalarBoundToMultiple" mode="multiple" />
    <!-- @vue-expect-error 'range' is not implemented yet; adding it later must not break the above -->
    <Calendar v-model="single" mode="range" />

    <!-- The predicates take a `Date`, per ADR-0007's single date type. -->
    <Calendar
      v-model="single"
      :is-date-disabled="isDateDisabled"
      :is-date-unavailable="(date: Date) => date.getDate() === 1"
      :min-date="new Date()"
      :max-date="new Date()"
    />

    <!-- @vue-expect-error the predicate takes a Date, never a dayjs object or a string -->
    <Calendar v-model="single" :is-date-disabled="(date: string) => !date" />

    <!-- Visible Month is a plain Date, same as the model. -->
    <Calendar v-model="single" v-model:visible-month="visibleMonth" />
    <!-- @vue-expect-error visibleMonth is a Date, not a month number -->
    <Calendar v-model="single" :visible-month="8" />

    <!-- Height pinning is independent of `fixedWeeks`. -->
    <Calendar v-model="single" auto-height :fixed-weeks="false" />

    <!-- `weekStartsOn` is a closed union, so a stray 7 is caught. -->
    <Calendar v-model="single" :week-starts-on="1" />
    <!-- @vue-expect-error 7 is not a weekday index -->
    <Calendar v-model="single" :week-starts-on="7" />

    <!-- `labels` is partial: passing one string must not require the rest. -->
    <Calendar v-model="single" :labels="{ weekColumn: 'Wk' }" />
    <!-- @vue-expect-error unknown label keys are rejected -->
    <Calendar v-model="single" :labels="{ notALabel: 'x' }" />

    <!-- Slots hand back resolved cell state, not raw dates. -->
    <Calendar v-model="multi" mode="multiple">
      <template #day="{ day }">
        <span :data-selected="day.isSelected">{{ day.dayOfMonth }}</span>
      </template>
      <template #weekday="{ short }">
        <span>{{ short }}</span>
      </template>
    </Calendar>
  </div>
</template>
