<script setup lang="ts">
import Calendar from '~/components/base/calendar/Calendar.vue'

const single = ref<Date | null>(new Date(2026, 8, 20))
const month = ref<Date | null>(new Date(2026, 8, 1))
const quarter = ref<Date | null>(new Date(2026, 6, 1))
const year = ref<Date | null>(new Date(2026, 0, 1))
const quarters = ref<Date[]>([new Date(2026, 0, 1), new Date(2026, 6, 1)])
const multi = ref<Date[]>([
  new Date(2026, 8, 16),
  new Date(2026, 8, 17),
  new Date(2026, 8, 18),
  new Date(2026, 8, 19),
])

function isDateUnavailable(date: Date) {
  return date.getDate() === 11 || date.getDate() === 12
}

function isDateDisabled(date: Date) {
  return date.getDay() === 0 && date.getDate() > 20
}
</script>

<template>
  <div class="flex flex-wrap items-start gap-6 p-8">
    <section>
      <h2 class="mb-2 text-sm font-semibold">
        single
      </h2>
      <Calendar v-model="single" class="border border-ring" />
      <p class="mt-2 text-xs text-muted">
        {{ single?.toLocaleString() }}
      </p>
    </section>

    <section>
      <h2 class="mb-2 text-sm font-semibold">
        multiple
      </h2>
      <Calendar v-model="multi" mode="multiple" class="border border-ring" />
      <p class="mt-2 max-w-60 text-xs text-muted">
        {{ multi.map(d => d.toLocaleDateString()).join(', ') }}
      </p>
    </section>

    <section>
      <h2 class="mb-2 text-sm font-semibold">
        week numbers · ja · Monday start
      </h2>
      <Calendar
        v-model="single"
        show-week-numbers
        locale="ja-JP"
        :week-starts-on="1"
        class="border border-ring"
      />
    </section>

    <section>
      <h2 class="mb-2 text-sm font-semibold">
        disabled &amp; unavailable days
      </h2>
      <Calendar
        v-model="single"
        :is-date-disabled="isDateDisabled"
        :is-date-unavailable="isDateUnavailable"
        :min-date="new Date(2026, 8, 2)"
        class="border border-ring"
      />
    </section>

    <section>
      <h2 class="mb-2 text-sm font-semibold">
        whole calendar disabled
      </h2>
      <Calendar v-model="single" disabled class="border border-ring" />
    </section>

    <section>
      <h2 class="mb-2 text-sm font-semibold">
        auto-height + natural rows
      </h2>
      <Calendar
        v-model="single"
        auto-height
        :fixed-weeks="false"
        class="border border-ring"
      />
    </section>

    <section>
      <h2 class="mb-2 text-sm font-semibold">
        natural rows, height still pinned
      </h2>
      <Calendar v-model="single" :fixed-weeks="false" class="border border-ring" />
    </section>

    <section>
      <h2 class="mb-2 text-sm font-semibold">
        period="month"
      </h2>
      <Calendar v-model="month" period="month" class="border border-ring" />
      <p class="mt-2 text-xs text-muted">
        {{ month }}
      </p>
    </section>

    <section>
      <h2 class="mb-2 text-sm font-semibold">
        period="quarter"
      </h2>
      <Calendar v-model="quarter" period="quarter" class="border border-ring" />
      <p class="mt-2 text-xs text-muted">
        {{ quarter }}
      </p>
    </section>

    <section>
      <h2 class="mb-2 text-sm font-semibold">
        period="year"
      </h2>
      <Calendar v-model="year" period="year" class="border border-ring" />
      <p class="mt-2 text-xs text-muted">
        {{ year }}
      </p>
    </section>

    <section>
      <h2 class="mb-2 text-sm font-semibold">
        quarter + multiple + bounds
      </h2>
      <Calendar
        v-model="quarters"
        mode="multiple"
        period="quarter"
        :min-date="new Date(2026, 1, 15)"
        class="border border-ring"
      />
      <p class="mt-2 max-w-60 text-xs text-muted">
        {{ quarters.map(d => `${d.getFullYear()}Q${Math.floor(d.getMonth() / 3) + 1}`).join(', ') }}
      </p>
    </section>
  </div>
</template>
