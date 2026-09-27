<script setup lang="ts">
import { injectCalendarContext } from './context'
import { MONTH_PANEL_COLUMNS, nextEnabledIndex } from './utils'

const ctx = injectCalendarContext()
const { calendar } = ctx

const cells = computed(() => calendar.monthCells.value)
const buttonRefs = ref<HTMLButtonElement[]>([])

/**
 * When no cell in the panel can take focus — every month or year is out of bounds — the
 * panel itself becomes the tab stop, the same fallback the day grid uses. Without it there
 * is no keyboard route back: `Escape` is handled here, on a div that is not focusable, and
 * the header's paging buttons live in a sibling subtree so their `Escape` never reaches it.
 */
const needsOwnTabStop = computed(() =>
  !ctx.disabled.value && cells.value.every(cell => cell.isDisabled))

watch(() => calendar.focusRequest.value, async () => {
  if (calendar.view.value !== 'month') return
  await nextTick()
  buttonRefs.value[calendar.focusedMonth.value]?.focus()
}, { immediate: true })

function move(delta: number) {
  calendar.focusedMonth.value = nextEnabledIndex(
    cells.value,
    calendar.focusedMonth.value,
    delta,
  )
  calendar.requestFocus()
}

function moveToEdge(delta: 1 | -1) {
  const from = delta === 1 ? -1 : cells.value.length
  calendar.focusedMonth.value = nextEnabledIndex(cells.value, from, delta)
  calendar.requestFocus()
}

function handleKeydown(event: KeyboardEvent) {
  switch (event.key) {
    case 'ArrowLeft':
      move(-1)
      break
    case 'ArrowRight':
      move(1)
      break
    case 'ArrowUp':
      move(-MONTH_PANEL_COLUMNS)
      break
    case 'ArrowDown':
      move(MONTH_PANEL_COLUMNS)
      break
    case 'Home':
      moveToEdge(1)
      break
    case 'End':
      moveToEdge(-1)
      break
    // Paging a year keeps the panel; only Enter drills down to the day grid.
    case 'PageUp':
      calendar.pageBy(-12)
      break
    case 'PageDown':
      calendar.pageBy(12)
      break
    case 'Enter':
    case ' ':
      calendar.selectMonth(calendar.focusedMonth.value)
      break
    case 'Escape':
      calendar.setView('day')
      break
    default:
      return
  }

  event.preventDefault()
}
</script>

<template>
  <div
    role="grid"
    :tabindex="needsOwnTabStop ? 0 : undefined"
    class="grid grid-cols-3 gap-1"
    :aria-label="ctx.labels.value.chooseMonth"
    @keydown="handleKeydown"
  >
    <button
      v-for="(cell, index) in cells"
      :key="cell.value"
      :ref="el => { if (el) buttonRefs[index] = el as HTMLButtonElement }"
      type="button"
      role="gridcell"
      class="calendar-panel-cell"
      :disabled="cell.isDisabled"
      :tabindex="cell.isTabbable ? 0 : -1"
      :aria-selected="cell.isCurrent || undefined"
      :data-current="cell.isCurrent || undefined"
      @click="calendar.selectMonth(cell.value)"
    >
      {{ cell.label }}
    </button>
  </div>
</template>

<style scoped>
@reference "#main.css";

.calendar-panel-cell {
  @apply relative flex items-center justify-center rounded-md;
  @apply transition-colors;
  @apply hover:bg-list-item-bg;

  /* Tracks the day grid's row height, so the two views stay visually the same scale. */
  height: var(--calendar-cell);

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

  &[data-current] {
    @apply font-semibold text-primary;
  }

  &:disabled {
    @apply cursor-default text-muted hover:bg-transparent;
  }
}
</style>
