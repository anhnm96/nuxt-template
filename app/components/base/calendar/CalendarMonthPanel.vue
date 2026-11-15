<script setup lang="ts">
import CalendarPanelCell from './CalendarPanelCell.vue'
import { injectCalendarContext } from './context'
import { usePanelKeyboard } from './usePanelKeyboard'
import { MONTH_PANEL_COLUMNS } from './utils'

const ctx = injectCalendarContext()
const { calendar } = ctx

const { rows, needsOwnTabStop, handleKeydown } = usePanelKeyboard({
  cells: calendar.monthCells,
  columns: MONTH_PANEL_COLUMNS,
  focusedIndex: calendar.focusedMonth,
  // Commits only when this panel is the terminal view.
  onSelect: index => calendar.selectMonth(index),
  // A year at a time.
  onPage: delta => calendar.pageBy(delta * 12),
})
</script>

<template>
  <div
    role="grid"
    :tabindex="needsOwnTabStop ? 0 : undefined"
    class="grid gap-1"
    :aria-label="ctx.labels.value.chooseMonth"
    @keydown="handleKeydown"
  >
    <div v-for="(row, index) in rows" :key="index" role="row" class="grid grid-cols-3 gap-1">
      <CalendarPanelCell
        v-for="cell in row"
        :key="cell.value"
        :cell="cell"
        @click="calendar.selectMonth(cell.value)"
      />
    </div>
  </div>
</template>
