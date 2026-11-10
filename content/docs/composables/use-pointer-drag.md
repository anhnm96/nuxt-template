# usePointerDrag

The shared plumbing for a press, drag and release gesture on native Pointer Events. One code path covers mouse, touch and pen.

It captures the pointer on the element that started the gesture, and listens on `window`, so the gesture keeps tracking when the pointer leaves that element. It owns the listeners and nothing else. What a move means, and how a press is accepted, stay with the host.

Used by the [Slider](/docs/components/slider) and by the schedule timeline and week grid gestures.

## Usage

```vue
<div class="touch-none select-none" @pointerdown="onPointerDown" />
```

```ts
const drag = usePointerDrag({ onMove, onEnd })

function onPointerDown(event: PointerEvent) {
  // The host decides which presses count. usePointerDrag accepts any pointerdown.
  if (event.button !== 0 || !event.isPrimary) return
  event.preventDefault() // Stops text selection while dragging.

  // Record where the gesture began, then hand over to usePointerDrag.
  drag.start(event)
}

function onMove(event: PointerEvent) {
  // Runs for every move until the pointer is released.
}

function onEnd(event: PointerEvent) {
  // Runs once. The listeners are already gone.
}
```

Bind `onPointerDown` on the element that should hold the capture. `start` reads `event.currentTarget`, so it must run from a handler on that element.

## Signature

```ts
interface PointerDragHandlers {
  /** Called on each pointermove while the gesture is active. */
  onMove: (event: PointerEvent) => void
  /** Called once when the gesture ends, on pointerup or pointercancel. */
  onEnd?: (event: PointerEvent) => void
}

function usePointerDrag(handlers: PointerDragHandlers): {
  start: (event: PointerEvent) => void
  stop: () => void
  isDragging: Ref<boolean>
}
```

| Return | What it does |
| --- | --- |
| `start(event)` | Begins the gesture from a `pointerdown` event. Captures the pointer on `event.currentTarget`, then subscribes to `pointermove`, `pointerup` and `pointercancel` on `window`. |
| `stop()` | Releases the capture and unsubscribes. It does not call `onEnd`. |
| `isDragging` | `true` from `start` until the gesture ends or `stop` runs. |

## Behaviour

- **One pointer at a time.** `start` stores the `pointerId` of the press. Moves and releases from any other pointer, such as a second finger, are ignored.
- **A release or a cancel ends the gesture.** The composable releases the capture and removes the listeners first, and then calls `onEnd`. By the time `onEnd` runs, `isDragging` is already `false`.
- **`start` is ignored while a gesture is running.** A host that wants to begin a new gesture over an old one calls `stop()` first. `Slider` does this.
- **Capture is best effort.** If `setPointerCapture` throws, for example on a synthetic event, the gesture still runs from the `window` listeners.
- **It cleans up after itself.** The scope disposal calls `stop`, so a drag in progress never leaves a listener on `window`.

## Notes

- **`stop()` and disposal do not call `onEnd`.** A host that must finish its work when the gesture is cut short, such as a Slider that becomes disabled mid-drag, has to do that itself.
- **It does not filter the press.** It does not check `button` or `isPrimary`, and it does not call `preventDefault`. The callers do: the Slider and the schedule gestures return early unless `event.button === 0`, and the Slider also requires `isPrimary`.
- **It does not stop touch scrolling.** Put `touch-action: none` on the element, for example the `touch-none` class. Without it, a touch drag scrolls the page and the browser sends `pointercancel`.
- Listeners are added to `window`, so call `start` only in the browser, from an event handler.
