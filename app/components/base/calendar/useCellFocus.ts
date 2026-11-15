import type { ShallowRef } from 'vue'
import { injectCalendarContext } from './context'

/**
 * Moves real DOM focus to a cell when the cell holds the roving tabindex. A day cell and a
 * panel cell share this, so the claim token has one implementation.
 *
 * Focus moves only for a focus request that no cell has claimed. Keyboard handlers,
 * `setView` and the exposed `focus()` make the requests, so paging from the model, from the
 * parent or from a header button never takes focus from the element that the user is on.
 *
 * A watcher is not sufficient, because a cell that did not exist at the time of the request
 * does not see it. `PageDown` to a day outside the grid, `Escape` from a panel and a view
 * change all create the target cell after the request. The cell therefore also asks when it
 * mounts. No request exists at the first mount, so the Calendar does not take focus when it
 * renders. See DESIGN.md, "Moving real DOM focus".
 */
export function useCellFocus(
  isTabbable: () => boolean,
  button: Readonly<ShallowRef<HTMLElement | null>>,
) {
  const { calendar } = injectCalendarContext()

  async function focusIfClaimed() {
    // Read `isTabbable` after the tick, so that the check sees the props of this render.
    await nextTick()
    if (!isTabbable()) return

    // Claim last. This callback is deferred, so the cell can be unmounted when it runs; the
    // outgoing cell of a page is, and it still reports its old `isTabbable`. A claim there
    // uses the token, and the incoming cell cannot take focus.
    const el = button.value
    if (!el?.isConnected) return
    if (!calendar.claimFocusRequest()) return

    el.focus()
  }

  watch(calendar.focusRequest, focusIfClaimed)
  onMounted(focusIfClaimed)
}
