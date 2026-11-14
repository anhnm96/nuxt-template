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

  function readCursor(event: MouseEvent | TouchEvent) {
    const point = 'touches' in event ? event.touches[0] : event
    if (!point || !('clientX' in point)) return false

    cursor.x = point.clientX
    cursor.y = point.clientY
    return true
  }

  function handleCursorMove(event: MouseEvent | TouchEvent) {
    if (!readCursor(event)) return

    hasCursor.value = true
    if (moveFrame !== undefined) return

    moveFrame = requestAnimationFrame(() => {
      moveFrame = undefined
      moves.value++
    })
  }

  /**
   * Subscribes to the anchor's pointer moves, seeding the position from `event`
   * when it carries coordinates. Returns whether it did.
   */
  function track(event?: MouseEvent | TouchEvent) {
    const gotCursor = Boolean(event && readCursor(event))
    if (gotCursor) hasCursor.value = true

    // the anchor can change under us, so only ever listen on one element at a
    // time and let `untrack` unsubscribe from that same one
    if (trackedEl !== anchorEl.value) {
      untrack()
      trackedEl = anchorEl.value
      trackedEl?.addEventListener('mousemove', handleCursorMove, { passive: true })
    }

    return gotCursor
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
