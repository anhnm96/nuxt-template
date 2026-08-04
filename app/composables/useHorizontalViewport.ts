/**
 * Reactively tracks the horizontal scroll state (`scrollLeft` / `clientWidth`)
 * of a scrollable element.
 *
 * Scroll updates are throttled to one per frame via `requestAnimationFrame`,
 * and size changes are tracked with a `ResizeObserver`. Both the scroll listener
 * and the observer are attached on mount and torn down automatically when the
 * owning scope is disposed.
 *
 * @param target - Ref to the scrollable element to observe.
 * @returns An object with:
 *   - `scrollLeft` - Ref of the element's current `scrollLeft`.
 *   - `viewportWidth` - Ref of the element's current `clientWidth`.
 *   - `sync` - Reads the element's current values immediately; call it right
 *     after a programmatic scroll to reflect the new position without waiting
 *     for the next scroll event.
 */
export function useHorizontalViewport(target: Ref<HTMLElement | null>) {
  const scrollLeft = ref(0)
  const viewportWidth = ref(0)

  let resizeObserver: ResizeObserver | null = null
  let raf = 0

  function sync() {
    const el = target.value
    if (!el) return
    scrollLeft.value = el.scrollLeft
    viewportWidth.value = el.clientWidth
  }

  // Throttle scroll handling to one update per frame.
  function onScroll() {
    if (raf) return
    raf = requestAnimationFrame(() => {
      raf = 0
      sync()
    })
  }

  onMounted(() => {
    const el = target.value
    if (!el) return
    el.addEventListener('scroll', onScroll, { passive: true })
    resizeObserver = new ResizeObserver(sync)
    resizeObserver.observe(el)
    sync()
  })

  onScopeDispose(() => {
    target.value?.removeEventListener('scroll', onScroll)
    resizeObserver?.disconnect()
    if (raf) cancelAnimationFrame(raf)
  })

  return { scrollLeft, viewportWidth, sync }
}
