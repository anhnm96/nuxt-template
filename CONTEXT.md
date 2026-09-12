# Context

The shared vocabulary of this project. Terms only — no implementation, no decisions.

## Schedule

**Time grid** — The scrollable body of the day and week views: one column per displayed
day, divided into hours. Shows timed events only.

**All-day row** — The band pinned above the time grid. Shows events that occupy whole
days rather than a span of hours, as bars that can cross columns.

**Slot** — One hour of one day column in the time grid. The unit the keyboard navigates
between, and the smallest region that carries a label of its own.

**Snap unit** — The granularity every time a gesture produces is rounded to. A gesture may
be asked for finer precision, in which case it rounds to the minute instead.

**Segment** — One day's slice of a timed event. An event crossing midnight has a segment
in each day it touches; the edges where it was cut are not its own edges.

**Promoted event** — A timed event long enough that the time grid would paint it as a full
column, so it is shown in the all-day row instead. It keeps its clock times; it has not
become an all-day event.

## Gestures

**Drag threshold** — The distance a pointer must travel before a press counts as a drag
rather than a click. One threshold for the whole view: it describes the hand and the
pointing device, not the thing being pointed at.

**Drag-to-create** — Pressing empty space, travelling past the drag threshold, and
releasing. Defines the new event's range directly: where the gesture started and where it
ended are its start and end.

**Double-click-to-create** — Two clicks on empty space. Creates an event of the default
length at the position clicked, for when the range does not need to be drawn.

**Default length** — The length given to an event created without a range being drawn —
by double-click, or from the keyboard.

**Create selection** — The provisional range drawn on screen while a drag-to-create is in
flight. It exists only once the gesture has become a create; a press being watched to see
whether it will travel is not yet a create and shows nothing.

**Clipped event** — An event with any part outside the displayed days or hours. It has no
true edges on screen to shift, so it cannot be moved as a whole.
