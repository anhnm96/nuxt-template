import type { MaybeRefOrGetter } from 'vue'

/**
 * How far a finger may travel and still count as a Tap. Kept at the schedule
 * grid's drag threshold: an Anchor that is also draggable must never see one
 * press count as both a drag and a Tap.
 */
export const TAP_SLOP_PX = 4

export interface TouchPressHandlers {
  /** A finger went down on the element. */
  onPress?: (event: PointerEvent) => void
  /** The finger lifted without having travelled — a Tap, however long it was held. */
  onTap?: (event: PointerEvent) => void
  /** The press became a drag or the browser took it over (scroll, zoom). Fires at most once per press. */
  onAbort?: (event: PointerEvent) => void
}

/**
 * Classifies touch presses on an element as a Tap or not. Mouse and pen
 * pointers are ignored — they have hover.
 *
 * Only the press has to start on the element. Its move and release are watched
 * on the window, so they are seen even when the finger slides off the element
 * or something else claims the pointer.
 */
export function useTouchPress(target: MaybeRefOrGetter<HTMLElement | null | undefined>, handlers: TouchPressHandlers) {
  let press: { id: number, x: number, y: number } | undefined

  const listenerOptions = { capture: true, passive: true }

  function end() {
    window.removeEventListener('pointermove', handleMove, listenerOptions)
    window.removeEventListener('pointerup', handleUp, listenerOptions)
    window.removeEventListener('pointercancel', handleCancel, listenerOptions)
    press = undefined
  }

  function isOurs(event: PointerEvent) {
    return press !== undefined && event.pointerId === press.id
  }

  function handleMove(event: PointerEvent) {
    if (!isOurs(event)) return
    const travelled = Math.max(Math.abs(event.clientX - press!.x), Math.abs(event.clientY - press!.y))
    if (travelled < TAP_SLOP_PX) return
    end()
    handlers.onAbort?.(event)
  }

  function handleUp(event: PointerEvent) {
    if (!isOurs(event)) return
    end()
    handlers.onTap?.(event)
  }

  function handleCancel(event: PointerEvent) {
    if (!isOurs(event)) return
    end()
    handlers.onAbort?.(event)
  }

  useEventListener(target, 'pointerdown', (event: PointerEvent) => {
    if (event.pointerType !== 'touch' || !event.isPrimary) return
    end()
    press = { id: event.pointerId, x: event.clientX, y: event.clientY }
    window.addEventListener('pointermove', handleMove, listenerOptions)
    window.addEventListener('pointerup', handleUp, listenerOptions)
    window.addEventListener('pointercancel', handleCancel, listenerOptions)
    handlers.onPress?.(event)
    // capture phase: a child that stops pointerdown (a resize handle, say) is
    // still part of the element
  }, { capture: true, passive: true })

  onScopeDispose(end)
}

/**
 * Cancels the click a browser synthesises after a Tap on `el`, so the Tap
 * replaces the element's own activation instead of adding to it.
 *
 * Caught at the window in the capture phase — before any listener on `el` or
 * inside it — and disarmed by the next press or after a moment, so it can
 * never eat a later, unrelated click (a keyboard one has no press).
 *
 * The page-level listeners still hear about it: a copy is dispatched from
 * `document.body`, reporting the original target, so outside-click detectors
 * (which listen on body, document or window and compare `target`) see the Tap
 * where it really happened. Nothing between `el` and body receives it — those
 * are the ancestors that might activate on it.
 */
export function preventNextClick(el: HTMLElement) {
  const options = { capture: true }
  // generous: a page without a mobile viewport delays the click ~300ms
  const timeout = setTimeout(disarm, 1000)

  function disarm() {
    clearTimeout(timeout)
    window.removeEventListener('click', handleClick, options)
    window.removeEventListener('pointerdown', disarm, options)
  }

  function handleClick(event: MouseEvent) {
    disarm()
    const target = event.target
    if (!el.contains(target as Node | null)) return
    event.preventDefault()
    event.stopPropagation()

    // the init dictionary reads its fields off the original event
    const echo = new MouseEvent('click', event)
    Object.defineProperty(echo, 'target', { get: () => target })
    document.body.dispatchEvent(echo)
  }

  window.addEventListener('click', handleClick, options)
  window.addEventListener('pointerdown', disarm, options)
}
