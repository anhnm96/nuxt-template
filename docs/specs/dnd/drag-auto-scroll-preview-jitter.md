# Drag auto-scroll and the drop preview fight over the same pixels

## Problem Statement

Dragging a row near the end of a long, scrolling list is unusable.

Take the last row of a virtualized drag list and drag it slowly towards the middle of the row above it. The row above starts jumping down and up, several times a second, and the dashed gap that previews where the item will land flickers in and out with it. Nothing about the cursor is moving; the list is moving under it. In Firefox the same gesture ends worse: the gap disappears but the space it held stays behind, and the row never travels back to where it belongs, so the list is left with a hole in it until the drag ends.

Commenting out the container's drag auto-scroll makes all of it go away — but then a drag can never reach anything below the visible part of the list, which is the whole point of having auto-scroll.

## Solution

The drag auto-scroll stops treating room the drag itself created as room the list has.

While a drag is running, two things change the size of the scrolling container: the gap held for the landing spot, and the transforms playing rows into their new slots. Both are temporary, and both appear exactly at the bottom edge where the auto-scroll is armed. Scrolling into that room moves the rows under a resting cursor, which makes the list read a different landing spot, which changes the room again — a loop with no user input in it.

So the auto-scroll now measures how far down it may go rather than running to the end of the scroll range: never into room a move in flight is holding, and never into the gap's room while the cursor is at the slot the dragged item already holds — the one place where the gap can retire and take its room back with it. Everywhere else the gap's room is permanent and scrolling into it is how a drag reaches the end of a list, so nothing is withheld and the last row stays reachable.

Alongside it, a drag list no longer replays its row moves for an update that only handed over the same rows. A virtualizer re-renders on every scroll step, and replaying a move cancels what is in flight and gives the row a fresh two hundred milliseconds to cover what is left of its way. At sixty steps a second the rows keep starting over and never land, which is the hole Firefox leaves behind.

## User Stories

1. As someone reordering a list, I want the row under my cursor to hold still while I aim at it, so that I can put the item where I mean to.
2. As someone reordering a list, I want the gap previewing the landing spot to stay where it is until I move, so that I can trust what it is telling me.
3. As someone dragging the last row of a list, I want to hover the row above it without the list flickering, so that I can drop one place up.
4. As someone dragging a row, I want the rows that move out of my way to arrive at their new places, so that the list is never left with a hole in it.
5. As someone dragging a row in Firefox, I want the same behaviour I get in Chrome, so that the list is not a different product in each browser.
6. As someone dragging an item from the top of a long list to its end, I want to hold the cursor at the bottom edge and have the list scroll all the way, so that I can reach the end without letting go.
7. As someone holding at the bottom edge, I want the very last row to come fully into view, so that I can aim below it and drop the item at the end.
8. As someone holding at the bottom edge, I want the list to keep scrolling as more items load in, so that a long list does not strand me part way down.
9. As someone holding at the top edge, I want the list to scroll upwards just as it always did, so that dragging towards the start of the list is unaffected.
10. As someone who has scrolled to the end of a list, I want the auto-scroll to stop there rather than jerking back, so that the list never gives back scroll I did not ask it to.
11. As someone dragging a row over the gap itself, I want nothing to happen, so that the preview does not chase my resting cursor.
12. As someone dragging an item onto a list it does not belong to, I want the same steadiness, so that moving items between lists behaves like moving them within one.
13. As someone dragging a row whose landing spot is where it already sits, I want the list to show no gap and to stay perfectly still, so that a drop that changes nothing looks like nothing.
14. As someone dragging across a list whose rows animate, I want a row that is on its way somewhere to be left alone to get there, so that the list settles instead of shimmering.
15. As someone dragging quickly after a previous drop, I want a row I grab mid-animation to behave like any other, so that a fast second drag is not a broken one.
16. As a consumer of the drag list, I want a placeholder of any height — a full row or a one pixel line — to work, so that I can preview a landing spot in whatever way suits my list.
17. As a consumer of the drag list, I want the dragged row to stay visible in place while I drag it, so that my own styling of the dragging state still means something.
18. As a consumer of the drag item, I want classes I add to a row myself to survive a drag, so that hover styling and move styling are not silently dropped.
19. As a consumer of the auto-scroll, I want to use it on a container that has no drag list in it, so that it stays a general composable.
20. As a consumer of the auto-scroll, I want to say what room in my container must be left alone, so that a preview of my own is handled the same way the drag list's gap is.
21. As a developer, I want the auto-scroll's limit to be measured every frame, so that a list that grows or shrinks mid-drag is followed rather than remembered.
22. As a developer, I want the limit to be forgotten when a drag ends, so that the next drag measures the layout it actually has.
23. As a developer, I want to know which scrolls the page made and which the browser made, so that a report of jitter can be diagnosed rather than guessed at.
24. As a developer, I want the auto-scroll's arithmetic covered by fast tests, so that a change to the limit is caught before it reaches a browser.
25. As a developer, I want the row-move player covered at the component seam, so that "which updates deserve an animation" is a stated rule rather than a coincidence.
26. As a developer, I want one test that drives a real drag in a real browser, so that a regression in the loop itself is caught by something other than a user.

## Implementation Decisions

**The auto-scroll composable owns a limit, not just a direction.** It already tracked which way to scroll and stepped the container once per frame; it now also decides how far down it may step. Upward scrolling is untouched: a gap inserted above the cursor pushes the rows below it down, and following them down is the correct behaviour, while nothing creates room at the top.

**The limit is the end of the scroll range minus room the drag created.** Measured on every frame rather than remembered, so a list that grows — more items loading in mid-drag — is followed.

**Room a move in flight holds is never scrolled into.** A transformed box counts towards a container's scrollable area for as long as the transform lasts, so retiring the gap hands the scroll the gap's room for the length of the move, out of a layout already on its way back. The limit is therefore clamped to the last value measured while no row was moving. This is checked by the presence of the move marker a drag list puts on a travelling row, which the auto-scroll reads from the container.

**Room the drop preview holds is withheld only at the dragged item's own slot.** This is the decision that took two passes to get right. Withholding it unconditionally keeps the list steady but leaves the last row of the list permanently out of reach, because the limit then always hides one gap's worth of content at the bottom. The distinction that matters: where the gap merely moves from one slot to the next, the container's size does not change and its room is permanent; only around the slot the dragged item already holds does the landing spot flip between "gap here" and "the spot it is already in", which is previewed by no gap at all, so the room comes and goes with the reading. The preview's room is therefore withheld only while the cursor is within the dragged row's own box plus a row's reach either side — reach being the row's height plus the gap's height, because a step of the scroll is worth a gap's height of cursor movement.

**The dragged row is marked with a data attribute, not a class.** The auto-scroll needs to find the row a drag came from. A class binding is rewritten as a whole whenever its value changes, and the dragging state changing is exactly such a change, which drops any class put on the element imperatively — the hover class the drag item adds, and the move class the row-move player adds. An attribute is patched independently of the class attribute, so both survive. The component's root must stay a single element for attribute fallthrough to work, which rules out documenting this with a comment beside the root.

**The auto-scroll only ever moves forward.** Where the limit is already behind the current position, it stops rather than scrolling back: giving scroll back is a jump of its own, and the limit legitimately sits behind the position whenever the gap's room is being withheld.

**The loop keeps running with nothing left to scroll**, so that room appearing later — items loading in — is carried into without waiting for another drag event.

**Reserving is an option of the composable.** The default reads the drag list's gap and dragged row from the container. A consumer previewing a landing spot some other way can supply its own function, or none.

**A drag list does not replay its row moves for an update that changed nothing.** The player already skipped updates where the virtualizer handed over a different window; it now also skips updates that handed over the same rows in the same order, which is what a scroll step inside one window produces. Detected by the order the rows are in, not by where they sit: a box is where a row has got to, which a move in flight makes a different thing from the slot it holds, whereas the slots are what an update either changes or does not. Rows the list keeps mounted out of flow hold no slot and are excluded from the comparison at both ends of it.

**Rejected: collapsing the dragged row while the gap is shown.** It would keep the list's height constant for the whole drag and remove the loop at its source, but a placeholder is not the height of a row — a one pixel line is a legitimate preview — so collapsing a whole row to show one would be a much larger layout change than the gap it replaces.

**Rejected: compensating the scroll position when the gap appears.** Scrolling by the gap's height to hold the rows under the cursor still would work, but it is scroll anchoring by hand, it fights the virtualizer the list already disables anchoring for, and it changes what every consumer sees when a gap appears.

## Testing Decisions

A good test here states what someone dragging would observe: where the container ends up after a given number of frames, whether a row was animated, whether a row carries the mark and keeps its classes. It does not reach for the limit the composable is holding, the reserve function, or the order comparison — those are how, and they have already been rewritten twice while the observable behaviour stayed the same.

**The auto-scroll composable, driven directly.** The existing seam: a detached container with its geometry stubbed — bounding box, client height, scroll height, scroll top — fed synthetic drag events, stepped a frame at a time. Everything about the limit is observable here as "where did scroll top end up". Prior art: the composable's existing tests, which already stub the container this way and assert direction and movement. Cases: stopping at the end of the content rather than past it; withholding the preview's room while the cursor is at the dragged row's slot; running to the end away from that slot; withholding a move in flight's room until the move lands and taking it once it has.

**The drag list, mounted.** The existing seam for row moves: a list mounted with a fixed window and per-row boxes stubbed, with the animation API stubbed so that "was a move played" is a question the test can ask. Prior art: the block of tests that already distinguishes a reorder from a scroll step. Case: an update that hands over the same window again plays nothing.

**The drag item, mounted.** The existing seam for the row's own contract. Prior art: the component's existing tests for draggability, the handle, and the drop effect. Case: dragging marks the row and leaves classes added imperatively alone; ending the drag removes the mark.

**One Playwright test, against the drag demo page.** New seam, and the only one with the fidelity to catch this bug class: the loop needs real layout, real transforms counting towards the scrollable area, real animation timing, and real native drag events. Both regressions in this work passed the whole unit suite. The test drives a native drag with mouse press, move and release — the browser only starts a drag session for real input, so the higher level drag helper is not the tool — takes the last row of the virtualized list towards the middle of the row above it, and asserts that the container's scroll position does not change while it rests there. Prior art: the project's existing Playwright configuration and end-to-end directory, which is currently scaffolding only, so this is the first test of the drag components at that level.

The fidelity gap is worth stating in the tests themselves: the unit environment has no layout, so every geometric fact in them is a stub, and a stub that is wrong is a test that passes for the wrong reason.

## Out of Scope

- Horizontal auto-scroll. The composable is vertical only and stays that way until a caller needs otherwise.
- Changing when a gap is shown, or what "the spot the item already holds" means. The landing spot rules are unchanged; only the scroll's response to them is.
- The browser's own drag auto-scroll, which no page code can turn off. Evidence gathered during diagnosis shows it did not participate in this bug.
- Compensating the scroll position when the gap changes the layout, and any form of scroll anchoring.
- The last row remaining out of reach while the dragged item is itself within a row of the cursor near the end of the list. Accepted: the drop still lands correctly, since it does not depend on the spot being visible.
- Infinite loading behaviour. The auto-scroll must not block it, which the tests cover, but the loading itself is untouched.
- Any change to how the drag list, drag item, or store decide what may be dropped where.

## Further Notes

The implementation has landed in the working tree; the Playwright seam is the remaining deliverable.

The same root cause presented differently in each browser, which is why it was reported twice. Chrome counts a transformed box towards the scrollable area and accepts a scroll into it, then clamps the position back when the move lands — that is the jumping. Firefox refuses the scroll, so the composable asked for the same position again on every frame; each write was a scroll event, each scroll event an update, and each update restarted the moves in flight — that is the gap that hangs and the row that never travels back.

What made the diagnosis possible was recording, during a real drag, every drag event with its cursor position and every change of scroll position, tagged with whether the page had asked for it. A scroll with no request beside it is the browser's doing; a request with no movement after it is the browser refusing. Both readings were decisive, and neither is available from a simulated drag. If anything in this area is reported again, build that recorder first.
