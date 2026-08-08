import type { MaybeRefOrGetter } from 'vue'

interface DragAutoScrollOptions {
  /** how close to an edge, in px, the cursor has to be to start scrolling */
  edgeSize?: number
  /** px scrolled per frame */
  speed?: number
}

/**
 * Scrolls a container while a native drag hovers near its top or bottom edge.
 * A drag scrolls nothing on its own, so without this an item can never reach a
 * position outside the visible part of a scrolling list.
 *
 * Binds its own listeners to `target`, the template needs nothing. Vertical
 * only: a horizontal axis would need its own direction, and no caller wants it
 * yet.
 */
export function useDragAutoScroll(
  target: MaybeRefOrGetter<HTMLElement | null | undefined>,
  { edgeSize = 80, speed = 12 }: DragAutoScrollOptions = {},
) {
  /** -1 scrolls up, 1 down, 0 not scrolling */
  const direction = ref(0)
  /** the pending animation frame, 0 while the loop is not running */
  let frame = 0

  function step() {
    const el = toValue(target)
    if (!el || direction.value === 0) {
      frame = 0
      return
    }
    el.scrollTop += direction.value * speed
    frame = requestAnimationFrame(step)
  }

  function stop() {
    direction.value = 0
    if (frame) cancelAnimationFrame(frame)
    frame = 0
  }

  function onDragOver(e: DragEvent) {
    const el = toValue(target)
    if (!el) return
    const { top, bottom } = el.getBoundingClientRect()
    if (e.clientY - top < edgeSize) direction.value = -1
    else if (bottom - e.clientY < edgeSize) direction.value = 1
    else direction.value = 0
    if (direction.value !== 0 && !frame) frame = requestAnimationFrame(step)
    else if (direction.value === 0) stop()
  }

  /** dragleave bubbles from the content too, only leaving `target` counts */
  function onDragLeave(e: DragEvent) {
    const el = toValue(target)
    const related = e.relatedTarget as Node | null
    if (!el || (related && el.contains(related))) return
    stop()
  }

  useEventListener(target, 'dragover', onDragOver)
  useEventListener(target, 'dragleave', onDragLeave)
  // dragend fires on the dragged item, and a drop elsewhere never reaches
  // `target`, so both are watched from the document
  useEventListener(document, 'dragend', stop)
  useEventListener(document, 'drop', stop)
  tryOnScopeDispose(stop)

  return { direction, stop }
}
