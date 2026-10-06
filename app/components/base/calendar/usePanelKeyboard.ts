import type { ComputedRef, Ref } from 'vue'
import type { CalendarPanelCell, CalendarView } from './useCalendar'
import { injectCalendarContext } from './context'
import { nextEnabledIndex } from './utils'

export interface UsePanelKeyboardOptions {
  /** Which view this panel is, so a stale focus request for another panel is ignored. */
  view: CalendarView
  cells: ComputedRef<CalendarPanelCell[]>
  /** Cells per row — 3 for months, 2 for quarters, 4 for years. */
  columns: number
  /** Where the roving tabindex is. Writable, because arrow keys move it. */
  focusedIndex: Ref<number>
  /** Commit or drill down, depending on whether this panel is terminal. */
  onSelect: (index: number) => void
  /** `PageUp`/`PageDown`: a year for the month and quarter panels, a page for years. */
  onPage: (delta: -1 | 1) => void
}

/**
 * The month, quarter and year panels differ only in their column count and what paging
 * means. Sharing the keymap keeps the `Escape` contract identical across all three, which
 * is the part most likely to drift: a terminal panel must let `Escape` bubble so a wrapping
 * `Dropdown` can close, while a navigational one consumes it to step back.
 */
export function usePanelKeyboard(options: UsePanelKeyboardOptions) {
  const { view, cells, columns, focusedIndex, onSelect, onPage } = options
  const ctx = injectCalendarContext()
  const { calendar } = ctx

  const buttonRefs = ref<HTMLButtonElement[]>([])

  /**
   * When no cell can take focus — everything out of bounds — the panel itself becomes the
   * tab stop, the same fallback the day grid uses. Without it there is no keyboard route
   * back: `Escape` is handled on a div that is not focusable, and the header's paging
   * buttons live in a sibling subtree so their `Escape` never reaches it.
   */
  const needsOwnTabStop = computed(() =>
    !ctx.disabled.value && cells.value.every(cell => cell.isDisabled))

  /**
   * Moves real DOM focus onto the roving cell, but only for a focus request nobody has
   * acted on yet — the same one-shot token `CalendarCell` uses, and for the same reason.
   *
   * This used to be `{ immediate: true }`, which was safe while a panel could only be
   * reached by a user action. `period` made a panel the *initial* view, so an immediate
   * focus meant an inline `<Calendar period="quarter">` grabbed the page's focus the moment
   * it rendered. The token gives mount-time focus when `setView` asked for it and silence
   * when nothing did.
   */
  async function focusIfClaimed() {
    await nextTick()
    if (calendar.view.value !== view) return

    const button = buttonRefs.value[focusedIndex.value]
    if (!button?.isConnected) return
    if (!calendar.claimFocusRequest()) return

    button.focus()
  }

  watch(() => calendar.focusRequest.value, focusIfClaimed)

  // A panel entered through `setView` mounts *after* the request was made, so the watcher
  // above never sees it.
  onMounted(focusIfClaimed)

  function move(delta: number) {
    focusedIndex.value = nextEnabledIndex(cells.value, focusedIndex.value, delta)
    calendar.requestFocus()
  }

  function moveToEdge(delta: 1 | -1) {
    const from = delta === 1 ? -1 : cells.value.length
    focusedIndex.value = nextEnabledIndex(cells.value, from, delta)
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
        move(-columns)
        break
      case 'ArrowDown':
        move(columns)
        break
      case 'Home':
        moveToEdge(1)
        break
      case 'End':
        moveToEdge(-1)
        break
      // Paging keeps the panel; only Enter commits or drills down.
      case 'PageUp':
      case 'PageDown':
        // `Shift` is the day grid's "jump a year" modifier. A panel's unshifted page
        // already *is* a year (months, quarters) or twelve of them (years), so there is
        // nothing coarser for the modifier to mean, and aliasing it to the plain page
        // would make the gesture mean two different distances in one component.
        //
        // The key is still claimed either way: falling through to the browser would
        // scroll the document behind an open popover, which is not "no effect".
        if (!event.shiftKey) onPage(event.key === 'PageUp' ? -1 : 1)
        break
      case 'Enter':
      case ' ':
        onSelect(focusedIndex.value)
        break
      case 'Escape':
        // Bubbles from the terminal view — there is nothing to step back to, and the
        // wrapper owns it. See DESIGN.md.
        if (!calendar.returnToTerminalView()) return
        // Consumed: stop it reaching a wrapping `Dropdown`, which closes on Escape from
        // anywhere in its popover. Without this, stepping back from the year panel would
        // also shut the popup — one keypress doing two things.
        event.stopPropagation()
        break
      default:
        return
    }

    event.preventDefault()
  }

  return { buttonRefs, needsOwnTabStop, handleKeydown }
}
