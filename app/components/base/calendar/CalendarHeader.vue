<script setup lang="ts">
import { injectCalendarContext } from './context'

const ctx = injectCalendarContext()
const { calendar } = ctx
const labels = ctx.labels
</script>

<template>
  <div class="mb-2 flex items-center justify-between gap-1">
    <!-- Day view: « ‹ [month][year] › » -->
    <template v-if="calendar.view.value === 'day'">
      <div class="flex items-center">
        <button
          type="button" class="calendar-nav" :aria-label="labels.previousYear"
          :disabled="!calendar.canPagePrevYear.value" @click="calendar.pageBy(-12)"
        >
          <Icon name="ph:caret-double-left" />
        </button>
        <button
          type="button" class="calendar-nav" :aria-label="labels.previousMonth"
          :disabled="!calendar.canPagePrevMonth.value" @click="calendar.pageBy(-1)"
        >
          <Icon name="ph:caret-left" />
        </button>
      </div>

      <!--
        Rendered from `Intl.formatToParts`, so the two buttons appear in locale order:
        [September][2026] in English, [2026]年[9]月 in Japanese, with no conditional here.
      -->
      <div class="flex items-center text-sm font-medium">
        <template v-for="(part, index) in calendar.headingParts.value" :key="index">
          <button
            v-if="part.type === 'month'"
            type="button" class="calendar-heading" :aria-label="labels.chooseMonth"
            :disabled="ctx.disabled.value" @click="calendar.setView('month')"
          >
            {{ part.value }}
          </button>
          <button
            v-else-if="part.type === 'year'"
            type="button" class="calendar-heading" :aria-label="labels.chooseYear"
            :disabled="ctx.disabled.value" @click="calendar.setView('year')"
          >
            {{ part.value }}
          </button>
          <!--
            `whitespace-pre` keeps English's separating space, which flex would otherwise
            collapse. Japanese's literals (年, 月) must sit flush against their numbers, so
            the row carries no gap and the buttons only minimal padding.
          -->
          <span v-else class="whitespace-pre">{{ part.value }}</span>
        </template>
      </div>

      <div class="flex items-center">
        <button
          type="button" class="calendar-nav" :aria-label="labels.nextMonth"
          :disabled="!calendar.canPageNextMonth.value" @click="calendar.pageBy(1)"
        >
          <Icon name="ph:caret-right" />
        </button>
        <button
          type="button" class="calendar-nav" :aria-label="labels.nextYear"
          :disabled="!calendar.canPageNextYear.value" @click="calendar.pageBy(12)"
        >
          <Icon name="ph:caret-double-right" />
        </button>
      </div>
    </template>

    <!-- Month view: ‹ [year] › — the year label is the only way up to the year panel. -->
    <template v-else-if="calendar.view.value === 'month'">
      <button
        type="button" class="calendar-nav" :aria-label="labels.previousYear"
        :disabled="!calendar.canPagePrevYear.value" @click="calendar.pageBy(-12)"
      >
        <Icon name="ph:caret-left" />
      </button>
      <button
        type="button" class="calendar-heading text-sm font-medium"
        :aria-label="labels.chooseYear" :disabled="ctx.disabled.value"
        @click="calendar.setView('year')"
      >
        {{ calendar.visibleYear.value }}
      </button>
      <button
        type="button" class="calendar-nav" :aria-label="labels.nextYear"
        :disabled="!calendar.canPageNextYear.value" @click="calendar.pageBy(12)"
      >
        <Icon name="ph:caret-right" />
      </button>
    </template>

    <!-- Year view: ‹ [2016 - 2027] › — the label is text; there is nothing above it. -->
    <template v-else>
      <button
        type="button" class="calendar-nav" :aria-label="labels.previousYears"
        :disabled="!calendar.canPagePrevYears.value" @click="calendar.pageYearsBy(-1)"
      >
        <Icon name="ph:caret-left" />
      </button>
      <span class="text-sm font-medium">{{ calendar.yearPageLabel.value }}</span>
      <button
        type="button" class="calendar-nav" :aria-label="labels.nextYears"
        :disabled="!calendar.canPageNextYears.value" @click="calendar.pageYearsBy(1)"
      >
        <Icon name="ph:caret-right" />
      </button>
    </template>
  </div>
</template>

<style scoped>
@reference "#main.css";

.calendar-nav {
  @apply flex items-center justify-center rounded-md text-muted;

  /*
    Matches a day cell's button. Hardcoded at `size-8` these four buttons plus the month and
    year labels overflowed a calendar narrowed to fit a sidebar, and `overflow-x-hidden` on
    the container quietly clipped the last one.
  */
  width: calc(var(--calendar-cell) - var(--calendar-cell-gap));
  height: calc(var(--calendar-cell) - var(--calendar-cell-gap));
  @apply transition-colors outline-offset-1 outline-primary;
  @apply hover:bg-list-item-bg hover:text-bold focus-visible:outline-2;

  &:disabled {
    @apply cursor-default opacity-40 hover:bg-transparent hover:text-muted;
  }
}

.calendar-heading {
  @apply rounded-md px-0.5 py-1 transition-colors outline-offset-1 outline-primary;
  @apply hover:bg-list-item-bg focus-visible:outline-2;

  &:disabled {
    @apply cursor-default hover:bg-transparent;
  }
}
</style>
