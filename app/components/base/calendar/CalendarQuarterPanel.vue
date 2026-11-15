<script setup lang="ts">
import CalendarPanelCell from './CalendarPanelCell.vue'
import { injectCalendarContext } from './context'
import { usePanelKeyboard } from './usePanelKeyboard'
import { QUARTER_PANEL_COLUMNS } from './utils'

const ctx = injectCalendarContext()
const { calendar } = ctx

const { rows, needsOwnTabStop, handleKeydown } = usePanelKeyboard({
  cells: calendar.quarterCells,
  columns: QUARTER_PANEL_COLUMNS,
  focusedIndex: calendar.focusedQuarter,
  // Quarter is terminal or absent, so this always commits.
  onSelect: index => calendar.selectQuarter(index),
  onPage: delta => calendar.pageBy(delta * 12),
})
</script>

<template>
  <!--
    2x2 rather than the single row `QuarterPicker` used: the body is pinned to the day
    grid's height, and four cells strung across one row leave it almost entirely empty.
  -->
  <div
    role="grid"
    :tabindex="needsOwnTabStop ? 0 : undefined"
    class="grid gap-1"
    :aria-label="ctx.labels.value.chooseQuarter"
    @keydown="handleKeydown"
  >
    <div v-for="(row, index) in rows" :key="index" role="row" class="grid grid-cols-2 gap-1">
      <CalendarPanelCell
        v-for="cell in row"
        :key="cell.value"
        :cell="cell"
        @click="calendar.selectQuarter(cell.value)"
      />
    </div>
  </div>
</template>
