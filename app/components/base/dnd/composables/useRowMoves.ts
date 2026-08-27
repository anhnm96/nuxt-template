import { TransitionGroup } from 'vue'

/**
 * The class a row carries while it is on its way to a new place, which is how the
 * drag handlers know a row is not where it looks. `transition-group` is told to
 * use it, and the moves this composable plays itself put it on too.
 */
export const MOVE_CLASS = 'drag-list--move'
/** how long a row takes to get there, matching `.drag-list--move` */
const MOVE_DURATION = 200
/** the class Vue is told to give a row on its way out */
const LEAVE_CLASS = 'drag-list--leave-active'
/** a row rendered only to stay mounted, which has no place among the others */
const PINNED_CLASS = 'drag-list__pinned'

interface RowMovesParams {
  /**
   * the list's root element. Read per call rather than passed: it changes with
   * the root itself, which `rootIs` below swaps
   */
  root: () => HTMLElement | undefined
  /** HTML tag the root renders as, and `transition-group`'s own `tag` */
  tag: () => string
  /** true while a virtualizer decides which part of the list is rendered */
  isWindowed: () => boolean
  /**
   * which window the rows on screen belong to, from `useDragRows`. Two updates
   * sharing one key mean the rows stayed and only their order can have changed
   */
  windowKey: () => string
}

/**
 * Owns how a drag list's rows are animated into place, and the root element that
 * follows from it. One decision, two faces:
 *
 * A list that is not windowed hands its moves to `transition-group`, which is
 * then its root. A windowed one cannot: `transition-group` will not be talked out
 * of its move animations, `css: false` only reaches its enter and leave, while the
 * move path runs on every update, probing a cloned row for a transform transition
 * and forcing a reflow before it animates whatever it read as moved. A virtualizer
 * updates the rows on every scroll step, so that runs on every one of them, and
 * the transforms it puts on rows move them under the scroll anchor the browser
 * picked, which scrolls the container to compensate, which updates the rows again.
 *
 * So a windowed list is a plain element and plays the moves here instead, for the
 * updates that deserve one: a reorder or a landing spot moving, never a scroll
 * step, which is the virtualizer handing over a different set of rows.
 */
export function useRowMoves({
  root,
  tag,
  isWindowed,
  windowKey,
}: RowMovesParams) {
  /** which window the rows on screen were rendered for */
  let renderedWindow = ''
  /**
   * Row boxes from before the update, against the list's own box: a scroll moves
   * the rows and the list by the same amount, so what is left is what the update
   * moved. Null when there is nothing to play.
   */
  let movedFrom: Map<HTMLElement, { left: number, top: number }> | null = null
  /** the move this list gave a row, to be cancelled by the next one */
  const rowMoves = new WeakMap<HTMLElement, Animation>()

  const rootIs = computed(() => (isWindowed() ? tag() : TransitionGroup))
  /** `transition-group`'s own props, none of which a plain element understands */
  const transitionProps = computed(() =>
    isWindowed()
      ? {}
      : {
          tag: tag(),
          moveClass: MOVE_CLASS,
          leaveActiveClass: LEAVE_CLASS,
          onBeforeLeave: pinLeavingRow,
        },
  )

  /** where the rows sit relative to the list, pinned ones having no place to sit */
  function rowBoxes() {
    const listRoot = root()
    if (!listRoot) return null
    const rootRect = listRoot.getBoundingClientRect()
    const boxes = new Map<HTMLElement, { left: number, top: number }>()
    for (const child of listRoot.children) {
      const row = child as HTMLElement
      if (row.classList.contains(PINNED_CLASS)) continue
      const rect = row.getBoundingClientRect()
      boxes.set(row, {
        left: rect.left - rootRect.left,
        top: rect.top - rootRect.top,
      })
    }
    return boxes
  }

  /**
   * Whether the update moved the rows around at all, read off the order they
   * are in rather than off where they sit: a box is where a row has got to,
   * which a move in flight makes a different thing from the slot it holds, and
   * the slots are what an update either changes or does not.
   */
  function reordered(from: Map<HTMLElement, unknown>, listRoot: HTMLElement) {
    const was = [...from.keys()]
    let index = 0
    for (const child of listRoot.children) {
      const row = child as HTMLElement
      // pinned rows hold no slot, and `rowBoxes` left them out of `was` too
      if (row.classList.contains(PINNED_CLASS)) continue
      if (was[index++] !== row) return true
    }
    // a row went, the gap among them being the one that comes and goes
    return index !== was.length
  }

  function playRowMoves(from: Map<HTMLElement, { left: number, top: number }>) {
    const listRoot = root()
    if (!listRoot) return
    const rows: { row: HTMLElement, was: { left: number, top: number } }[] = []
    for (const child of listRoot.children) {
      const row = child as HTMLElement
      const was = from.get(row)
      // a row that was not there has nowhere to come from, and an environment
      // without the animation API simply lands the rows
      if (!was || typeof row.animate !== 'function') continue
      rows.push({ row, was })
    }

    // The same rows in the same order have nowhere to have moved to: this update
    // only handed them over again, which is what a virtualizer does on every
    // scroll step it takes inside one window. Replaying the moves for one of
    // those cancels what is in flight and gives each row a fresh 200ms to cover
    // what is left of its way, and a scroll takes a step per frame: the rows
    // would keep starting over, closing in on a place they never reach.
    if (!reordered(from, listRoot)) return

    // Drop the moves still in flight before reading anything: a running one
    // offsets the very box read below, and a row measured mid-flight reports where
    // it had got to instead of where it now belongs, which reads as no move at all.
    for (const { row } of rows) rowMoves.get(row)?.cancel()

    // Read where every row landed, all of it before the writes below: a write in
    // between makes the next read flush a style pass of its own.
    const rootRect = listRoot.getBoundingClientRect()
    const moves: { row: HTMLElement, dx: number, dy: number }[] = []
    for (const { row, was } of rows) {
      const rect = row.getBoundingClientRect()
      // `was` is where the row was last seen, mid-flight or at rest, so what is
      // left to play is the distance from there to the place it now holds
      const dx = was.left - (rect.left - rootRect.left)
      const dy = was.top - (rect.top - rootRect.top)
      if (dx || dy) moves.push({ row, dx, dy })
    }

    for (const { row, dx, dy } of moves) {
      row.classList.add(MOVE_CLASS)
      const move = row.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
        { duration: MOVE_DURATION, easing: 'ease-out' },
      )
      rowMoves.set(row, move)
      Promise.race([
        // rejects when the next move cancels this one, which owns the class from there
        move.finished.catch(() => {}),
        // the class is a hint for the drag handlers rather than part of the
        // animation, and a paused timeline never finishes one: a hidden tab would
        // otherwise leave every row reading as moving for good
        new Promise(resolve => setTimeout(resolve, MOVE_DURATION + 50)),
      ]).then(() => {
        if (rowMoves.get(row) !== move) return
        rowMoves.delete(row)
        row.classList.remove(MOVE_CLASS)
      })
    }
  }

  /**
   * The box a leaving row keeps while it is out of flow, see `.drag-list--leave-
   * active` in the list's own style. Out of flow there is nothing left to size or
   * place it: a percentage width resolves against the list's padding box, padding
   * included, so a padded list would get a row wider than itself and flicker a
   * scrollbar, and in a flex or grid list an out-of-flow row does not even keep
   * its place, it takes the container's start corner. So it carries its own box,
   * measured here, before the leave classes land and while it is still in flow.
   *
   * Only ever called for a list that has a `transition-group` to leave, which a
   * windowed one has not.
   */
  function pinLeavingRow(el: Element) {
    const row = el as HTMLElement
    // offsets are measured from the padding box of `.drag-list`, which is exactly
    // the containing block the row is about to be placed in
    const { offsetLeft, offsetTop, offsetWidth, offsetHeight } = row
    row.style.left = `${offsetLeft}px`
    row.style.top = `${offsetTop}px`
    row.style.width = `${offsetWidth}px`
    row.style.height = `${offsetHeight}px`
    // its margins space no siblings now, and `left`/`top` place the margin box
    row.style.margin = '0'
  }

  onBeforeUpdate(() => {
    // the DOM is still the previous render, while the window is already the one
    // about to be painted: skipping the scroll step here is also what keeps the
    // scrolling free of the layout this measurement forces
    if (!isWindowed() || windowKey() !== renderedWindow) return
    movedFrom = rowBoxes()
  })

  onUpdated(() => {
    const from = movedFrom
    movedFrom = null
    renderedWindow = windowKey()
    if (from) playRowMoves(from)
  })

  onMounted(() => {
    renderedWindow = windowKey()
  })

  return { rootIs, transitionProps }
}
