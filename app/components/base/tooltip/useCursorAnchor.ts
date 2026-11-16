import type { VirtualElement } from '@floating-ui/vue'

import type { CursorFollow } from '~/utils/position'

interface Point { x: number, y: number }

/**
 * Tracks the pointer over an anchor element and exposes it as a floating-ui
 * virtual element, so a floating element can follow the cursor instead of (or
 * on one axis, as well as) the anchor.
 *
 * Owns the mechanism only: coordinates, the pointer subscription and the
 * measured rect. When to fall back to anchoring is the caller's policy — read
 * `hasCursor`, and set it to `false` to release the cursor.
 *
 * `follow` is read on every measure, so which axes track may change at runtime.
 */
export function useCursorAnchor(anchorEl: Ref<HTMLElement | null>, follow: () => CursorFollow | undefined) {
  const cursor: Point = { x: 0, y: 0 }
  // false until a pointer has given us coordinates — until then there is nothing
  // to position against
  const hasCursor = ref(false)
  // bumped once per animation frame in which the cursor moved — watch it to
  // reposition. a counter rather than a callback keeps the floating element's
  // `update` out of this composable's setup order.
  const moves = ref(0)

  let moveFrame: number | undefined
  let trackedEl: HTMLElement | null = null

  // The identity is stable so `useFloating` keeps a single `autoUpdate`
  // subscription instead of re-attaching on every move — `moves` drives the
  // updates instead.
  const cursorEl: VirtualElement = {
    getBoundingClientRect: () => getCursorRect(cursor, follow() ?? false, anchorEl.value?.getBoundingClientRect()),
    // lets autoUpdate observe the anchor — its scroll ancestors, resizes and moves
    get contextElement() {
      return anchorEl.value ?? undefined
    },
  }

  function readCursor(event: MouseEvent) {
    cursor.x = event.clientX
    cursor.y = event.clientY
    hasCursor.value = true
  }

  function handleCursorMove(event: MouseEvent) {
    readCursor(event)
    if (moveFrame !== undefined) return

    moveFrame = requestAnimationFrame(() => {
      moveFrame = undefined
      moves.value++
    })
  }

  /**
   * Subscribes to the anchor's pointer moves, seeding the position from `event`
   * when there is one. A touch press is a `PointerEvent`, so it
   * seeds the position too; only `mousemove` moves it afterwards.
   */
  function track(event?: MouseEvent) {
    if (event) readCursor(event)

    // the anchor can change under us, so only ever listen on one element at a
    // time and let `untrack` unsubscribe from that same one
    if (trackedEl !== anchorEl.value) {
      untrack()
      trackedEl = anchorEl.value
      trackedEl?.addEventListener('mousemove', handleCursorMove, { passive: true })
    }
  }

  function untrack() {
    trackedEl?.removeEventListener('mousemove', handleCursorMove)
    trackedEl = null
    if (moveFrame !== undefined) cancelAnimationFrame(moveFrame)
    moveFrame = undefined
  }

  onScopeDispose(untrack, true)

  return { cursorEl, hasCursor, moves, track, untrack }
}
