<script setup lang="ts">
import type { CalendarPanelCell } from './useCalendar'

defineProps<{ cell: CalendarPanelCell }>()
</script>

<template>
  <!--
    Two vocabularies, never both on one grid:
      navigational panel  data-current  — the period the view below is parked on
      terminal panel      data-selected / data-today / unavailable
    Because they cannot co-occur, bold-primary can serve Current and Today without ambiguity.
  -->
  <button
    type="button"
    role="gridcell"
    class="calendar-panel-cell"
    :disabled="cell.isDisabled"
    :aria-disabled="cell.isUnavailable || undefined"
    :aria-label="cell.ariaLabel"
    :aria-selected="cell.isSelected || cell.isCurrent || undefined"
    :tabindex="cell.isTabbable ? 0 : -1"
    :data-current="cell.isCurrent || undefined"
    :data-selected="cell.isSelected || undefined"
    :data-today="cell.isToday || undefined"
    :data-unavailable="cell.isUnavailable || undefined"
  >
    {{ cell.label }}
  </button>
</template>

<style scoped>
@reference "#main.css";

.calendar-panel-cell {
  @apply relative flex items-center justify-center rounded-md;
  @apply transition-colors;
  @apply hover:bg-list-item-bg;

  /* Tracks the day grid's row height, so the views stay visually the same scale. */
  height: var(--calendar-cell);

  &[data-current],
  &[data-today] {
    @apply font-semibold text-primary;
  }

  &[data-selected] {
    @apply text-primary ring-1 ring-primary;
  }

  &[data-unavailable] {
    @apply cursor-default text-muted line-through;
  }

  &:disabled {
    @apply cursor-default text-muted hover:bg-transparent;
  }

  /* A value we refuse to strip (ADR-0007) can be selected and out of bounds at once. */
  &:disabled[data-selected] {
    @apply text-muted ring-muted;
  }

  /* Same halo as the day cell — see CalendarCell.vue for why it is not an `outline`. */
  &:focus-visible {
    @apply outline-none;
  }

  &:focus-visible::after {
    content: '';

    @apply pointer-events-none absolute -inset-[3px];

    border: 2px solid var(--color-primary);
    border-radius: inherit;
    box-shadow: 0 0 6px 1px var(--color-primary);
    opacity: 0.6;
  }
}
</style>
