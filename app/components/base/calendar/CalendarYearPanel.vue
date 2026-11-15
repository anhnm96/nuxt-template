<script setup lang="ts">
import CalendarPanelCell from './CalendarPanelCell.vue'
import { injectCalendarContext } from './context'
import { usePanelKeyboard } from './usePanelKeyboard'
import { YEAR_PANEL_COLUMNS } from './utils'

const ctx = injectCalendarContext()
const { calendar } = ctx

const cells = calendar.yearCells

/** The year panel's roving state is a year, not an index; bridge the two. */
const focusedIndex = computed<number>({
  get: () => Math.max(0, cells.value.findIndex(cell => cell.value === calendar.focusedYear.value)),
  set: (index) => {
    const cell = cells.value[index]
    if (cell) calendar.focusedYear.value = cell.value
  },
})

const { rows, needsOwnTabStop, handleKeydown } = usePanelKeyboard({
  cells,
  columns: YEAR_PANEL_COLUMNS,
  focusedIndex,
  onSelect: index => calendar.selectYear(cells.value[index]!.value),
  onPage: delta => calendar.pageYearsBy(delta),
})
</script>

<template>
  <div
    role="grid"
    :tabindex="needsOwnTabStop ? 0 : undefined"
    class="grid gap-1"
    :aria-label="ctx.labels.value.chooseYear"
    @keydown="handleKeydown"
  >
    <div v-for="(row, index) in rows" :key="index" role="row" class="grid grid-cols-4 gap-1">
      <CalendarPanelCell
        v-for="cell in row"
        :key="cell.value"
        :cell="cell"
        @click="calendar.selectYear(cell.value)"
      />
    </div>
  </div>
</template>
