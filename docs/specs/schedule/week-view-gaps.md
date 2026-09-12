# Four gaps the week view shipped with

## Problem Statement

The day and week views work, and the gestures they were built around — drag to
draw a range, double-click for an event of the default length, drag a block to
move it, drag an edge to resize — all do what they should. Four things at the
edges of that work do not.

**A keyboard user cannot create an all-day event.** In the time grid, arrow keys
move between slots and Enter creates an event. The all-day row has no
equivalent. Its empty track is focusable — clicking it lands focus inside the
view, and an arrow from there steps onto the first bar — but there is nothing
per column to stand on, and Enter on the track does nothing. So the only way to
add an all-day event is with a pointer. A keyboard user can move and resize the
all-day events that already exist, which makes the missing create conspicuous
rather than merely absent.

**Creating an event with every calendar switched off produces nothing visible.**
The new event is filed onto the first calendar in the list, which in that state
is a hidden one. No block appears and nothing is said. The natural response is to
repeat the gesture, which silently stacks up duplicates the user will find later
with no idea where they came from.

**Double-clicking the all-day row's "+N more" counter can create an event.** The
first click expands the row and removes the counter; the second click lands on
the track revealed underneath, and the browser dispatches the double-click to
their common ancestor, which is the surface that creates. A gesture meant to
reveal hidden events adds one instead.

**Resizing a timed event past midnight previews in only one column.** Drag the
bottom edge of a late-evening event down past the end of the day and the part
that belongs to the next day is invisible until the drag is released. The
committed result is correct; only the preview is short, so the user is asked to
commit something they cannot see.

## Solution

Every create gesture produces something the user can perceive, and every surface
that accepts a create is reachable from the keyboard.

The all-day row gains a focusable empty region per day column, navigated the same
way the time grid's slots are, where Enter creates a one-day event. Creating is
refused, with a spoken reason, when no calendar could show the result. Controls
layered over a create surface stop double-clicks as well as clicks. And a preview
is drawn in every column the proposed range touches, so what is on screen during
a drag is what will be committed when it ends.

## User Stories

1. As a keyboard user, I want to move through the all-day row column by column, so that I can reach each day without a pointer.
2. As a keyboard user, I want Enter or Space on an empty all-day column to create a one-day event, so that I have the same reach there as I do on a slot in the time grid.
3. As a keyboard user, I want the all-day row to have a single tab stop like the grid does, so that tabbing through the page does not walk me through a day at a time.
4. As a keyboard user, I want my position in the all-day row to be remembered while I move between events and empty space, so that focus does not jump back to the first column.
5. As a screen reader user, I want an empty all-day column to announce its date and the gesture that works there, so that I know what creating will produce before I do it.
6. As a screen reader user, I want a created event announced with its date, so that I know the gesture worked without seeing the bar appear.
7. As a screen reader user, I want a refused create announced with its reason, so that silence never means "something happened that you cannot see".
8. As someone scheduling, I want to be told when no calendar can hold a new event, so that I fix the calendar filter instead of repeating a gesture that appears to do nothing.
9. As someone scheduling, I want a new event to go to a calendar I can currently see, so that it appears the moment I create it.
10. As someone scheduling, I want to double-click the "+N more" counter and have it only expand the row, so that reading the hidden events does not add one.
11. As someone scheduling, I want any control sitting over the grid or the all-day row to absorb my double-click, so that a mis-aimed gesture near a button does not create an event behind it.
12. As someone resizing an event across midnight, I want to see the preview in both days while I drag, so that I can judge the result before releasing.
13. As someone resizing an event across midnight, I want the preview to match what gets committed, so that I do not have to release the drag to find out what I did.
14. As someone scheduling, I want the event I just created to be the thing I can act on next, so that creating and then adjusting is one continuous flow.
15. As someone scheduling, I want none of these fixes to change the gestures I already use, so that what I have learned keeps working.
16. As a developer, I want the rule for what counts as a create written down in one place, so that changing it does not mean finding it scattered through a gesture handler.
17. As a developer, I want that rule covered by tests that do not depend on layout, so that its edge cases can be changed with confidence.
18. As a developer, I want the gestures covered end to end in a real browser, so that pointer capture and real geometry are exercised rather than stubbed.
19. As a developer, I want the create path free of debug logging, so that the console stays useful and the lint output stays clean.

## Implementation Decisions

**The create decision becomes a pure module.** Whether a press has become a
create — did it clear the drag threshold, is the resulting range non-empty in
this surface's unit, what length does a double-click get — moves out of the
gesture composable into a module that takes positions and options and returns a
verdict. The reason is testability rather than reuse: the rule has edge cases
worth pinning (finer precision when the modifier is held, a drag that clears the
threshold in pixels but rounds to no time at all, the default length near the end
of the visible hours) and they cannot be reached through the composable, whose
every input is a measured box.

**The non-empty test stays a per-surface parameter.** On the time grid a range
that snaps to a single minute is empty and creates nothing; on the all-day row a
range within one column is a valid one-day event. The module takes this as an
argument rather than inferring it from the unit of the delta. Inferring it is
what previously let a day-granular keyboard resize collapse a timed event to
zero length, and the same trap is waiting for anything else that reasons from
the unit.

**The all-day row gets focusable empty slots, one per column.** They carry the
same roving-tabindex model the time grid's slots use, so the row remains one tab
stop; they are labelled with their date and the gesture available; and Enter or
Space creates a one-day event in that column. They sit beneath the bars so they
never intercept a gesture aimed at an event.

Two things already in the row make room for them. Its track is focusable, so
that clicking empty space lands focus inside the view rather than on the
document; once per-column slots exist they take that job and the track's own
tabindex should go with them. And the row's key handler already resolves its
target from the focused element rather than from the roving tab stop — it
distinguishes "a bar has focus" from "something else in the row does" — so the
new slots plug into that existing test rather than adding a second one beside
it.

**Creating requires a calendar that is currently shown.** The create handler
takes the first selected calendar rather than the first calendar in the list.
When nothing is selected the create is refused and the view announces why. The
handler is the only place this rule lives, so both surfaces inherit it.

**Anything layered over a create surface declares itself for both click and
double-click.** The overflow counter is the instance found, but the rule is
general: a control that stops `pointerdown` and `click` and then removes itself
still leaves a double-click to resolve on whatever is underneath.

**Previews are computed per column, for every column the range touches.** The
geometry helper that maps an absolute-minute range into one column's box already
exists and already returns nothing for a column the range misses; the change is
to ask it for each column in the displayed range rather than only the one the
gesture started in.

**Debug logging comes out of the create path.**

**Nothing changes about what a created event contains.** Default length, snap
granularity, and the payload handed to the create handler stay as they are.

## Testing Decisions

**What a good test looks like here.** A test states what a user can observe: an
event exists or does not, with these times, on this day, in this calendar; a
message was announced; a preview is visible in two columns. It does not reach
into gesture state, assert the shape of a preview object, or name a composable's
internals. The question under test is "what does this gesture produce", and the
test should say exactly that.

**The pure create decision is tested in the unit suite.** It is data in, verdict
out, so it belongs beside the schedule's other pure layout functions, which
already have a colocated spec covering segmentation, promotion, lane packing and
the awkward cases — zero-length events, ranges clipped by the visible hours,
events crossing midnight. Worth pinning: a press that never travels; travel below
the threshold; travel above it that still rounds to an empty range; travel that
produces a real range; those same inputs under the all-day rule where a single
column is not empty; and the default length applied near the end of the visible
hours, where it must be pulled back inside them.

**The gestures and the keyboard are tested end to end in the existing Playwright
suite.** The unit environment reports every element as zero by zero —
`getBoundingClientRect` returns a 0×0 box even for an element given explicit
dimensions — so any code converting a pointer coordinate into a column or a
minute cannot be exercised there without stubbing the thing under test. Pointer
capture differs too: a real drag captures the pointer, which is why the event
target stays the element that was grabbed for the whole gesture instead of
following the cursor. The repository already has prior art making this argument,
in the drag auto-scroll spec, whose header records that two regressions in that
area passed the unit suite and shipped anyway.

One spec covers: Enter on an empty all-day column creates a one-day event;
arrow keys move between those columns; a create with no calendar selected is
refused and announced; a double-click on the overflow counter expands without
creating; and a resize dragged past midnight shows a preview in both days.

**What is deliberately not tested.** The internal preview state of a gesture in
flight, the geometry helpers in isolation, and the visual styling of blocks and
bars — each either an implementation detail or covered indirectly above.

## Out of Scope

**The timeline view.** Its rows are calendars and its time axis is horizontal,
which makes it a resource timeline rather than a calendar — nearer to a Gantt
chart or a scheduling assistant than to the week grid. It creates an event on a
single click, and this spec deliberately does not align that with the week
view's double-click: a single click to book a resource is a reasonable gesture
for what that view is, and making two different tools impersonate each other
would be the wrong kind of consistency. It may be removed or rehoused later; if
it is, note that `assignLanes` must stay, because the week view's all-day row
packs its lanes with it, while the range-clamping and off-screen-chip helpers are
used by nothing else.

Also out of scope:

- The day and week views' existing gestures, which are delivered and unchanged
  by this spec except where a gap above requires it.
- Converting an event between timed and all-day by dragging between the time grid
  and the all-day row.
- A touch-specific create gesture such as long-press; touch users create by
  dragging, and double-tap remains the browser's zoom gesture.
- The month view, which is still disabled.
- Any change to persistence. The schedule holds a local, mutable copy of the
  fetched events and there is no write endpoint.
- Repository tooling problems noticed nearby but unrelated: the `typecheck`
  script has no type checker installed, and the `packageManager` field that
  pinned pnpm has been removed.

## Further Notes

The vocabulary this spec uses — segment, promoted event, slot, snap unit, drag
threshold, default length, create selection, clipped event — is defined in the
schedule's own README, alongside the invariants worth knowing before changing
the view. The definitions are deliberately not repeated here: a spec is closed
when its work lands, and the feature's documentation outlives it.

Every day is assumed to be exactly 24 hours long: minutes are counted from
midnight and day boundaries are a fixed 1440 minutes apart. That holds in
fixed-offset locales; on a day with a daylight-saving transition the grid stays
24 rows tall and is an hour out after the change. Making it exact would mean a
different pixel-to-minute mapping in every column, which this spec does not take
on.

Three of these gaps came out of a code review of the delivered week view and were
left unapplied at the time. The hidden-calendar create was judged plausible
rather than confirmed; it is included because its failure is silent, which is the
worst kind to leave behind.

Work has landed since this spec was written. None of it closes the four gaps
above, but an implementer should know it is there rather than rediscover or redo
it:

- Resize in the time grid became vertical-only. `Alt`+`←`/`→` on a timed event
  is consumed and does nothing, because a day later always pushed it past the
  promotion threshold and a day earlier always collapsed it to the minimum.
- Focus now follows an event that an edit relocates, across a day change and
  across the boundary between the grid and the all-day row.
- A day-granular resize of a genuine all-day event is refused once it would
  carry one edge past the other's day, so such an event can shrink to one day
  and no further. Promoted events keep the snap floor, which is how they demote.
- Pointer gestures focus what was pressed, quietly, so a click leaves focus
  inside the view without lighting the focus indicator up.
- The all-day row's key handler targets the focused bar rather than the roving
  tab stop's fallback.

The keyboard map these produced is tabulated in the schedule's README, under
Accessibility. The axis convention it records — vertical means minutes,
horizontal means days — is the rule the new empty slots should follow.
