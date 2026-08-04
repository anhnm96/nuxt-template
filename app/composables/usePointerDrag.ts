interface PointerDragHandlers {
  /** Called on each pointermove while the gesture is active. */
  onMove: (event: PointerEvent) => void
  /** Called once when the gesture ends (pointerup or pointercancel). */
  onEnd?: (event: PointerEvent) => void
}

/**
 * Shared plumbing for a press-drag-release gesture on native Pointer Events
 * (covers mouse, touch, and pen from one code path).
 *
 * Listens on `window` so the gesture keeps tracking even once the pointer
 * leaves the element that started it, and captures the pointer on that
 * element so the browser keeps routing events to this gesture regardless of
 * what the pointer moves over next.
 *
 *   start(event) captures the pointer from `event` and subscribes; stop()
 *   releases capture and unsubscribes. stop() also runs automatically on
 *   pointerup/pointercancel or when the owning scope is disposed, so a
 *   listener is never left behind.
 */
export function usePointerDrag(handlers: PointerDragHandlers) {
  const isDragging = ref(false)
  let captureTarget: Element | null = null
  let pointerId: number | null = null

  function onMove(event: PointerEvent) {
    if (event.pointerId !== pointerId) return
    handlers.onMove(event)
  }

  function onEnd(event: PointerEvent) {
    if (event.pointerId !== pointerId) return
    stop() // Release capture and unsubscribe before the end handler runs.
    handlers.onEnd?.(event)
  }

  function start(startEvent: PointerEvent) {
    if (isDragging.value) return
    isDragging.value = true
    pointerId = startEvent.pointerId
    captureTarget = startEvent.currentTarget as Element
    try {
      captureTarget.setPointerCapture(pointerId)
    } catch {
      // Capture is an enhancement, never a requirement (e.g. a synthetic event).
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onEnd)
    window.addEventListener('pointercancel', onEnd)
  }

  function stop() {
    if (!isDragging.value) return
    isDragging.value = false
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onEnd)
    window.removeEventListener('pointercancel', onEnd)
    try {
      if (captureTarget && pointerId !== null) captureTarget.releasePointerCapture(pointerId)
    } catch {
      // Capture may already be gone (pointer released, element detached).
    }
    captureTarget = null
    pointerId = null
  }

  // Ensure the listeners are released even if the gesture is mid-drag when the scope is disposed.
  onScopeDispose(stop)

  return { start, stop, isDragging }
}
