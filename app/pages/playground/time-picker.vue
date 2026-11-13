<script setup lang="ts">
const time = ref('')
const meeting = ref('09:30')
const quarterHour = ref('')
</script>

<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-10 p-8">
    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        Empty — type, or pick from the columns
      </h2>
      <p class="text-sm opacity-70">
        Pick an hour: the field shows `09:MM`, and the model stays empty until the minute is set.
        Click the field to place the caret: the popover stays open. Press `Escape`: closing pads
        the entry to `09:00`.
      </p>
      <TimePicker v-model="time" aria-label="Time" />
      <p class="text-sm opacity-70">
        {{ JSON.stringify(time) }}
      </p>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        A seeded value — the columns scroll to it
      </h2>
      <p class="text-sm opacity-70">
        `ArrowUp` and `ArrowDown` step the column that holds the caret. `Tab` moves between the
        columns while the popover is open.
      </p>
      <TimePicker v-model="meeting" aria-label="Meeting time" />
      <p class="text-sm opacity-70">
        {{ JSON.stringify(meeting) }}
      </p>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        `minute-step` — quarter hours
      </h2>
      <TimePicker v-model="quarterHour" :minute-step="15" aria-label="Quarter hour" />
      <p class="text-sm opacity-70">
        {{ JSON.stringify(quarterHour) }}
      </p>
    </section>
  </div>
</template>
