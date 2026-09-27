<script setup lang="ts">
import CalendarPanelCell from './CalendarPanelCell.vue'
import { injectCalendarContext } from './context'
import { usePanelKeyboard } from './usePanelKeyboard'
import { YEAR_PANEL_COLUMNS } from './utils'

const ctx = injectCalendarContext()
const { calendar } = ctx

const cells = computed(() => calendar.yearCells.value)

/** The year panel's roving state is a year, not an index; bridge the two. */
const focusedIndex = computed<number>({
  get: () => Math.max(0, cells.value.findIndex(cell => cell.value === calendar.focusedYear.value)),
  set: (index) => {
    const cell = cells.value[index]
    if (cell) calendar.focusedYear.value = cell.value
  },
})

const { buttonRefs, needsOwnTabStop, handleKeydown } = usePanelKeyboard({
  view: 'year',
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
    class="grid grid-cols-4 gap-1"
    :aria-label="ctx.labels.value.chooseYear"
    @keydown="handleKeydown"
  >
    <CalendarPanelCell
      v-for="(cell, index) in cells"
      :key="cell.value"
      :ref="el => { if (el) buttonRefs[index] = (el as any).$el }"
      :cell="cell"
      @click="calendar.selectYear(cell.value)"
    />
  </div>
</template>
