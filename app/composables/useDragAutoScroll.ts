import type { MaybeRefOrGetter } from 'vue'

interface DragAutoScrollOptions {
  /** how close to an edge, in px, the cursor has to be to start scrolling */
  edgeSize?: number
  /** px scrolled per frame */
  speed?: number
  /**
   * px at the bottom of the scroll range this must not scroll into, measured
   * again on every frame, from the container and where the cursor is in it.
   * Defaults to the room a drop preview holds, see `previewRoom`.
   */
  reserve?: (target: HTMLElement, cursorY: number) => number
}

/**
 * Room the drop preview holds while the cursor is at the slot of the item being
 * dragged, and none at any other time.
 *
 * A gap previewing a landing spot is a row of its list like any other, so the
 * container grows by it while it is rendered. Where the gap merely moves from
 * one slot to the next that growth stays, and scrolling into it is how the drag
 * reaches the end of a list. At the dragged item's own slot it does not: a spot
 * there is the one the item already holds, which is previewed by no gap at all,
 * so the room comes and goes with the reading. Scrolling into it pulls the rows
 * up under a resting cursor, the row the cursor then lands on names the spot the
 * item already holds, the gap retires, the room goes with it and the rows drop
 * back. Two things moving the same pixels, each one reading what the other did.
 *
 * So around the item's own slot the scroll stops where the list ends without the
 * preview, which is where it ends once the drop is made, and everywhere else it
 * runs to the end of what is rendered.
 */
function previewRoom(el: HTMLElement, cursorY: number) {
  let room = 0
  for (const gap of el.querySelectorAll('.drag-placeholder')) {
    room += gap.getBoundingClientRect().height
  }
  if (!room) return 0
  // the row the drag came from, while it is one of this container's own
  const dragged = el.querySelector('.drag-container[data-dragging]')
  if (!dragged) return 0
  const rect = dragged.getBoundingClientRect()
  // its own slot and the one either side of it name the spot it already holds,
  // and a step of the scroll is worth a gap's height of cursor either way
  const reach = rect.height + room
  return cursorY > rect.top - reach && cursorY < rect.bottom + reach ? room : 0
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
  { edgeSize = 80, speed = 12, reserve = previewRoom }: DragAutoScrollOptions = {},
) {
  /** -1 scrolls up, 1 down, 0 not scrolling */
  const direction = ref(0)
  /** the pending animation frame, 0 while the loop is not running */
  let frame = 0
  /** how far the container could scroll when its rows last stood still */
  let settledEnd = Number.POSITIVE_INFINITY
  /** where the cursor was at the last event, the loop having none of its own */
  let cursorY = 0

  /**
   * How far down this may scroll: where the content ends, minus what the drag
   * itself put there, and never past where it ended while the rows last stood
   * still.
   *
   * A row on its way to a new slot is a transform, and a transformed box counts
   * towards the scrollable area for as long as the move lasts. Retiring the gap
   * therefore hands the scroll the room the gap held for another 200ms, out of a
   * layout that is already on its way back: Chrome scrolls into it and has it
   * taken back when the move lands, Firefox refuses the scroll and leaves this
   * asking for it again on every frame. Either way every one of those frames is
   * a scroll event, an update, and the moves in flight replayed from where they
   * had got to, which is rows that never land.
   */
  function scrollEnd(el: HTMLElement) {
    const end = el.scrollHeight - el.clientHeight - reserve(el, cursorY)
    // room measured over a move in flight is room that is already going
    if (!el.querySelector('.drag-list--move')) settledEnd = end
    return Math.min(end, settledEnd)
  }

  function step() {
    const el = toValue(target)
    if (!el || direction.value === 0) {
      frame = 0
      return
    }
    // nothing holds room at the top, a gap above the cursor pushes the rows
    // below it down and the scroll follows them
    if (direction.value < 0) {
      el.scrollTop -= speed
    } else {
      const end = scrollEnd(el)
      // only ever forward: `end` may already be behind us, and giving the scroll
      // back is a jump of its own
      if (el.scrollTop < end) el.scrollTop = Math.min(el.scrollTop + speed, end)
    }
    // the loop keeps running with nothing left to scroll: more items may still
    // load in, which is room this can carry on into
    frame = requestAnimationFrame(step)
  }

  function stop() {
    direction.value = 0
    // the next drag measures its own, this one is only about the layout it saw
    settledEnd = Number.POSITIVE_INFINITY
    if (frame) cancelAnimationFrame(frame)
    frame = 0
  }

  function onDragOver(e: DragEvent) {
    const el = toValue(target)
    if (!el) return
    cursorY = e.clientY
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
