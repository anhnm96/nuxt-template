<script setup lang="ts">
import CalendarPanelCell from './CalendarPanelCell.vue'
import { injectCalendarContext } from './context'
import { usePanelKeyboard } from './usePanelKeyboard'
import { QUARTER_PANEL_COLUMNS } from './utils'

const ctx = injectCalendarContext()
const { calendar } = ctx

const cells = computed(() => calendar.quarterCells.value)

const { buttonRefs, needsOwnTabStop, handleKeydown } = usePanelKeyboard({
  view: 'quarter',
  cells,
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
    class="grid grid-cols-2 gap-1"
    :aria-label="ctx.labels.value.chooseQuarter"
    @keydown="handleKeydown"
  >
    <CalendarPanelCell
      v-for="(cell, index) in cells"
      :key="cell.value"
      :ref="el => { if (el) buttonRefs[index] = (el as any).$el }"
      :cell="cell"
      @click="calendar.selectQuarter(cell.value)"
    />
  </div>
</template>
