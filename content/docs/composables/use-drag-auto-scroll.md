# useDragAutoScroll

Scrolls a container while a drag is near its top or bottom edge.

A native drag does not scroll a container. Without this composable, a dragged item cannot reach a position outside the visible part of a list that scrolls.

Used with [DragList](/docs/components/dnd), and by the schedule week grid, whose gestures are Pointer Events and not a native drag.

## Usage

Pass the element that scrolls. The composable adds its own listeners to that element, so the template needs nothing more.

```vue
<script setup lang="ts">
const items = ref(Array.from({ length: 100 }, (_, index) => `Item ${index}`))

const scroller = useTemplateRef<HTMLElement>('scroller')
useDragAutoScroll(scroller)
</script>

<template>
  <div ref="scroller" class="h-80 overflow-y-auto">
    <DragList v-model:list="items" reorder="placeholder">
      <template #default="{ item }">
        <p>{{ item }}</p>
      </template>
      <template #placeholder>
        <p class="border border-dashed">
          &nbsp;
        </p>
      </template>
    </DragList>
  </div>
</template>
```

A gesture that is not a native drag sends no `dragover`. Give the composable the cursor position on each move, and tell it when the gesture ends.

```ts
const scroller = useTemplateRef<HTMLElement>('scroller')
const autoScroll = useDragAutoScroll(scroller)

function onMove(event: PointerEvent) {
  autoScroll.updateFromPointer(event.clientY)
}

function onEnd() {
  autoScroll.endDrag()
}
```

## Signature

```ts
interface DragAutoScrollOptions {
  /** How close to an edge the cursor must be to start the scroll, in px. Default 80. */
  edgeSize?: number
  /** The px scrolled on each frame. Default 12. */
  speed?: number
  /** The px at the bottom of the scroll range that the scroll must not enter. */
  reserve?: (target: HTMLElement, cursorY: number) => number
}

function useDragAutoScroll(
  target: MaybeRefOrGetter<HTMLElement | null | undefined>,
  options?: DragAutoScrollOptions,
): {
  direction: Ref<number>
  endDrag: () => void
  updateFromPointer: (clientY: number) => void
}
```

| Return | What it does |
| --- | --- |
| `direction` | `-1` while it scrolls up, `1` while it scrolls down, `0` while it does not scroll. |
| `updateFromPointer(clientY)` | Starts or stops the scroll for a cursor at `clientY`. The native `dragover` listener calls it; a pointer gesture calls it itself. |
| `endDrag()` | Stops the scroll and forgets the scroll limit of this drag. Call it when a pointer gesture ends. A native drag ends by itself. |

## Behaviour

- **It scrolls on each animation frame** while the cursor is less than `edgeSize` from the top or the bottom edge of `target`.
- **It stops when the cursor leaves `target`,** and when the drag ends. It listens for `dragend` and `drop` on the document, because neither event is sure to reach `target`.
- **It continues at the end of the content.** More items can load during the drag, and the scroll goes on into them.
- **It does not scroll into the room of a drop placeholder near the dragged row.** A `DragList` placeholder adds height to the container. Around the slot of the dragged row that height comes and goes, and a scroll into it moves the rows below a cursor that does not move. `reserve` gives that room; the default reads it from the `DragList` classes.
- **It does not trust a scroll range measured during a row transition.** A row that moves has a transform, and a transformed box adds to the scroll range until the move ends.
- **It cleans up after itself.** The scope disposal stops the scroll.

## Notes

- **Vertical only.** It reads `clientY` and writes `scrollTop`.
- **`target` must be the element that scrolls,** not the list inside it.
- **The default `reserve` knows `DragList`.** It reads `.drag-placeholder` and `.drag-container[data-dragging]`. For other content it returns 0, so the scroll runs to the end.
- The listeners are added in the browser, so call it from `setup`.
