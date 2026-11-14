# Drag and drop — design

Why `DragList` and `DragItem` are built the way they are. For how to *use* them — props,
slots, styling hooks — see [README.md](./README.md).

Most of the decisions below answer to one constraint: a native drag gives the page very
little. The browser runs it, the events come from the element under the cursor, and the
source element must stay in the document or the drag ends.

## One drag session in a store

The browser runs one native drag at a time, so `useDnDStore` holds one session. Each list and
each item has its own id, from `createDnDId`, so that many lists can use the one store. The
ids come from a counter of the module and not from `useId`: a list id is also the `id` of an
element, and `useId` is unique only inside one application.

Drop targets read the payload from the store and not from `dataTransfer`. The payload in
`dataTransfer` is JSON, which loses everything that is not serializable. It is written there
only for a drop outside the application.

`endDrag` does not clear the session. It sets `inProgress` to false and keeps `success` and
`dropTargetIds`, because `dragend` reaches the dragged item first and the source list after
it, and the list must still read the result. The session is replaced when the next drag
starts.

## An item reports to its list through `provide`, not through events

`DragItem` injects `DragListKey` and calls `onItemDragStart` and `onItemDragEnter` on the
closest list. With nested lists, each item then reports to its own list and to no other. The
code also notes that a component event for `dragenter` made the list lag.

A list cannot trust the payload to tell its rows from other items. A consumer can put a
`DragItem` inside a row, and that item reports to the same list, possibly with an `index` in
its payload. `isOwnRow` therefore tests the DOM: a row of the list is a direct child of the
list root.

## The rows are one keyed sequence

`useDragRows` gives one array for the `v-for`: the rows that hold items, the placeholder row,
and the pinned row of a windowed list. Each is a `DragItem`. A row that changes its kind or
its place keeps its element, because Vue matches it by key. This matters for the dragged
row: when its element is unmounted, the browser ends the drag and sends no `dragend`.

The `index` of a row is always a position in `list`. The placeholder row has a place in the
sequence and no position in the list.

## The landing spot is read from the middle of a row

`insertionIndexAt` compares the cursor with the middle of the row below it. The leading half
gives the index of the row, the other half gives the next index. The two halves of
neighbouring rows name the same gap. This keeps the placeholder still: when the placeholder
moves, the rows move below a cursor that does not move, and the reading from the new row is
the reading that was already made.

`dragenter` on a row sets the spot immediately, and a throttled `dragover` keeps it current
while the cursor moves inside one row.

The list shows no placeholder for the spot the dragged item already has (`landsInPlace`).
The slot above the item and the slot below it are both that spot. The list continues to read
the spot while no placeholder is rendered, so that the placeholder can come back.

On a drop in `placeholder` mode, the move and the removal of the placeholder are one update.
As two updates they are two layout changes, and `transition-group` finishes the first set of
moves before it measures the second, so the rows jump.

## The list background is a drop target

The browser sends `drop` only to a target that cancels `dragover`. A row does that, but the
cursor is often not over a row: the margin of a row collapses out of it, so the space between
two rows belongs to the list, and so do the padding and the area below the last row. The list
therefore cancels `dragover` itself, for a drag of its group that `acceptData` does not
refuse. Without it, a release in one of those places ended the drag with nothing moved, which
looked like a drop that failed at random.

`drop` then uses the landing spot that was read last, because the background has no row to
read a new one from.

## `cut` depends on who accepted the drop

A source list with `transfer="cut"` removes its item in `dragend` when `droppedOutside` is
true: the drop succeeded, and this list is not one of the drop targets.

In `immediate` mode the list moves the item on `dragenter`, before a drop. It then records
itself as a drop target (`addDropTarget`), so that a release inside the list does not cut the
item. When the item leaves the list, `dragleave` removes that record (`removeDropTarget`).
Without the removal, an item that was moved in its own list and then dropped in another list
stayed in both.

The cut removes the item at `ownDragAtIndex`, the index the item has now, and not at
`ownDragFromIndex`. The two are different when the item left while a row was in transition,
because `dragleave` does not put the item back in that case; see
[Known limitations](#known-limitations).

## The list changes the array in place

`moveItem` and `splice` change `props.list` directly. `moveItem` keeps the identity of the
array and of each item, which is what lets `transition-group` animate a reorder, and an
`immediate` reorder makes a move on each `dragenter`. A new array for each move is a new
`update:list` and a parent render for each row the cursor crosses.

The cost: a reorder sends no event, and a consumer that binds `:list` without `v-model` has
its array changed. The README states this.

## A windowed list is not a `transition-group`

A list without `visible` has a `transition-group` as its root, which animates the moves. A
list with `visible` cannot use one. `transition-group` runs its move path on every update,
and a virtualizer updates the rows on every scroll step. The transforms it sets move rows
below the scroll anchor of the browser, the browser scrolls to correct that, and the scroll
updates the rows again.

So `useRowMoves` makes a windowed list a plain element and animates the moves itself, with
`Element.animate`, and only for an update that changes the order of the rows. `windowKey`
names the rendered part of the list: an update with a new key is a scroll step, and it is not
animated. Rows that move get the class `drag-list--move` in both kinds of list, because the
drag handlers and `useDragAutoScroll` read that class to know that a row is not at its place.

While the dragged item is scrolled out of the rendered part, `useDragRows` adds it as a
pinned row: out of the flow, not visible, not a target, but mounted.

## A row that leaves keeps its box

`transition-group` measures the new layout while a leaving row is still in the DOM. A leaving
row in the flow puts each row below it one slot too low. The leaving row is therefore
`position: absolute`, and `pinLeavingRow` gives it the position and the size it had, because
out of the flow a percentage width and a place in a flex or grid container are both lost.

## Scroll anchoring is off during a drag

The placeholder changes the height of the list. A container that is scrolled to its end
answers with a scroll, to hold its scroll anchor still. That moves the rows below a cursor
that does not move, the landing spot changes, the placeholder goes, and the cycle repeats.

`suspendScrollAnchoring` sets `overflow-anchor: none` for the length of the drag, on the
element that scrolls and not on the list: on the list, the property only excludes the list as
an anchor. Several lists can have one scroller, so the function counts the holds and puts the
first value back when the last hold ends.

Unit tests cannot see this. The layout, the scroll anchoring and the native drag are real
only in a browser; `tests/playwright/e2e/dnd-drop-preview.spec.ts` covers it.

## `data-dragging` is an attribute

The dragged item is marked with an attribute and not with a class. Vue writes a bound `class`
as a whole when its value changes, which removes the classes that the code adds directly:
`hoverClass` on a drop target, and `drag-list--move` on a row.

## The drag image is an element in `body`

The browser makes its drag image one time, at `dragstart`, so it cannot change during the
drag. With the `drag-image` slot, `DragItem` hides the image of the browser and moves its own
element with the cursor.

- The element is teleported to `body`. It is `position: fixed`, and a list gives a row a
  transform while the row moves, which makes the row the containing block of a fixed child.
- The image that hides the browser image is a transparent GIF. Safari ends the drag
  immediately when an element is used for this.
- The position comes from `dragover` on the document and not from the `drag` event, because
  Firefox reports `0, 0` there. The same listener sends `customdrag`, and its
  `preventDefault` stops the animation of the browser image back to the source after a drop
  outside a target.

## The handle locks the item

With `handle`, the item is not draggable until a `mousedown` on the handle element. `dragend`
locks the item again, because no `mouseup` follows a native drag, and a `mouseup` listener on
the document locks it after a press that starts no drag.

## Known limitations

- **`hoverClass` can stay after the hovered child is removed.** When a re-render removes the
  child that is below the cursor, the next `dragleave` fires on that detached child and does
  not reach the item. The class stays until the next drop on the item. To clear it on
  `dragend` needs a document listener for each drop target.

- **Nested drop targets both show `hoverClass`.** `DragItem` ignores a `dragleave` whose
  related target is inside the item, because the browser sends one each time the cursor goes
  to a child. An inner drop target is such a child, so the outer one keeps its class.
- **An item that leaves during a move transition is not put back.** Firefox sends `dragenter`
  and `dragleave` without end at the border of a list while a row is in transition, so
  `dragleave` does not restore the order in that state. The item stays at the slot it was
  moved to if the drag ends outside every target.
- **The handle is found one time, when the item mounts.** It is the first element in the item
  that matches the selector. A handle that the slot renders later is not found, and the item
  then does not drag.
- **No keyboard and no touch handle.** The components have no keyboard behaviour, and the
  handle answers to `mousedown` only.
- **The size for the `drag-image` slot is measured at mount.** A row that changes size later
  reports the old size.
- **The landing spot has one axis.** A grid of several tracks gets the spot from one of its
  two directions, the one `axis` names.

## Out of scope

- **Dropping files from the desktop.** The components do not handle a drag that the store did
  not start. A `DragItem` still cancels `dragenter` and `dragover` for it, so the browser
  shows the drop as allowed, and no code handles the drop.
- **Sorting by keyboard.** Give the user controls for it in the row; see Accessibility in the
  README.
