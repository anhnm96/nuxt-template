# Carousel — design

Why `Carousel` is built the way it is. For how to *use* it — props, slots, styling — see
[README.md](./README.md).

## The items are in a native scroll container

The carousel does not move a track with a transform. The items are in an element with
`overflow-x: auto` and `scroll-snap-type: x mandatory`. A touch, a trackpad and the keyboard
then scroll it with the behaviour of the platform, momentum included, and the carousel has no
code for them.

The cost: the position belongs to the browser. `activeIndex` is a reading of `scrollLeft`,
and a carousel that goes round without an end (clones of the items) does not fit this model.
`repeat` therefore scrolls back through all items.

## The index comes from the scroll position

Because the user can scroll the element directly, `settle` sets `activeIndex` from
`scrollLeft` when a scroll has stopped. A scroll has stopped when no `scroll` event came for
`SETTLE_DELAY`. The `scrollend` event is the direct signal, but Safari added it later than the
other browsers, and the timer is needed anyway for the case below.

`scrollTo` sets `activeIndex` immediately, so that two fast calls of `next` count from the
new index. It also clears the timer: a timer from an earlier scroll would otherwise read the
old position before the new scroll starts. A call that does not move the element sends no
`scroll` event, so `scrollTo` starts the timer itself in that case.

## Only a mouse drags

A touch and a pen already scroll the element. The carousel adds a drag for the mouse only,
which has no such gesture. Code that also moves `scrollLeft` during a touch works against the
scroll of the browser.

## Snap is off during a drag

Mandatory snap puts the element on an item immediately. During a drag that stops the
movement, and at the end of a drag it stops the smooth scroll to the item. `snap` is false
from `pointerdown` until `settle`.

At the end of a drag the carousel goes to the closest item, with `DRAG_BIAS` added in the
direction of the drag. Without the bias a drag shorter than half an item goes back, which a
user reads as a drag that failed.

## The drag does not capture the pointer

`usePointerDrag` captures the pointer on the element that starts the gesture. After a
captured press, the browser sends `click` to that element and not to the element below the
pointer, so a link in an item gets no click. The carousel therefore has its own listeners on
`window`.

## The click after a drag

A drag that starts on a link ends with a `click` on the link. `click` in the capture phase
stops it when the pointer moved more than `DRAG_THRESHOLD`.

The flag is cleared by a timer in `pointerup`, and not in the click handler. `click` comes in
the same task as `pointerup`, before the timer. When the drag ends outside the carousel, no
`click` reaches the carousel, and a flag that only the click handler clears would stop the
next click, which can come from the keyboard.

The carousel also cancels `dragstart`. A link or an image starts a native drag on a press and
a move, the browser then sends `pointercancel`, and the pointer drag ends.

## Known limitations

- **One width for all items.** `measure` reads the first item. Positions for items of
  different widths need the offset of each item.
- **A change of the item width alone is not measured.** The `ResizeObserver` is on the element
  that scrolls. An observer on the first item fixes it.
- **Autoplay has no stop for the keyboard, a touch or reduced motion.** It stops for
  `mouseenter` only, and a step can come during a touch scroll.
- **The last step can be shorter than a stride.** `itemsToShow` counts whole items, so at
  `lastIndex` the offset `lastIndex * stride` can be more than the element can scroll. The
  browser stops at the end, with the last item at the trailing edge, and `settle` reads the end
  of the scroll as `lastIndex`. With `Math.round` for `itemsToShow`, an item that showed in
  part counted as an item that fits, and no position showed all of the last item.

## Out of scope

- **A vertical carousel**, and **a carousel without an end**; see the first section.
- **Buttons and dots.** The slots give the state; the consumer renders the controls.
