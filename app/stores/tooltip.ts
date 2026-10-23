/**
 * How long after an Anchor is left the next Tooltip still counts as part of the same Sweep.
 *
 * Exported so the number has one home. Radix calls the same idea a skip-delay duration and
 * uses the same 300ms. Why a Sweep skips what it skips is in
 * ../components/base/tooltip/DESIGN.md, "Sweeping skips the delay and the animation".
 */
export const SKIP_WINDOW_MS = 300

export const useTooltipStore = defineStore('tooltip', () => {
  const tooltips = ref<Set<string>>(new Set())

  /** Whether any Tooltip is open. Read by `Tooltip2.vue`; the base Tooltip asks `isContinuingSweep`. */
  const hasVisibleTooltip = computed(() => tooltips.value.size > 0)

  /**
   * When an Anchor was last left, as a `Date.now()` reading.
   *
   * Deliberately not a ref. It is read once per open, inside an event handler, and making
   * it reactive would re-render every Tooltip on the page on every close.
   */
  let lastClosingAt = Number.NEGATIVE_INFINITY

  function addTooltip(id: string) {
    tooltips.value.add(id)
  }

  function removeTooltip(id: string) {
    tooltips.value.delete(id)
  }

  /** Record that a Tooltip has begun closing. Called when the pointer leaves an Anchor. */
  function markClosing() {
    lastClosingAt = Date.now()
  }

  /** Whether a Tooltip opening now continues a Sweep, and so skips its delay and animation. */
  function isContinuingSweep() {
    const elapsed = Date.now() - lastClosingAt

    // A negative elapsed means the clock moved back behind the mark, which a system clock
    // adjustment can do. Without this the window would stay open until the clock caught up.
    return elapsed >= 0 && elapsed <= SKIP_WINDOW_MS
  }

  return {
    tooltips,
    hasVisibleTooltip,
    addTooltip,
    removeTooltip,
    markClosing,
    isContinuingSweep,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useTooltipStore, import.meta.hot))
}
