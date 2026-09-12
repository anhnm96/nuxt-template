# Schedule

A calendar page with three view families over one set of events.

- **Day** and **Week** share a component and differ only in how many columns
  they render. They are the calendar proper: a scrollable time grid with an
  all-day row pinned above it.
- **Timeline** is a different animal — rows are calendars and time runs
  horizontally, which makes it a resource timeline nearer to a Gantt chart than
  to a calendar. It shares the event data and nothing else.
- **Month** is not built.

Events are fetched for the month around the selected day, padded by a week on
each side, and held in a local mutable copy: dragging and creating change that
copy, because there is no write endpoint.

## Vocabulary

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

## Accessibility

Two rules explain most of the keyboard map:

- **Axis** — vertical means minutes, horizontal means days. A timed event
  therefore resizes vertically only (its end cannot move in days), and an
  all-day bar resizes horizontally only.
- **Modifier** — a plain arrow moves *focus*, Shift moves the *event*, Alt
  resizes its end, and Alt+Shift resizes its start.

The view has three focus scopes. Each is a single tab stop with a roving
tabindex inside it, so Tab moves between scopes and arrows move within one.

### Slot grid — empty time

| Keys | Does |
| --- | --- |
| `←` `→`, `PageUp` `PageDown` | Previous / next day column |
| `↑` `↓` | Previous / next hour |
| `Home` `End` | First / last hour of that day |
| `Enter` `Space` | Create an event of the default length in that slot |

Modifiers are ignored here: `Alt`+`←` moves focus one column left like a bare
arrow, and is consumed either way, so it never reaches the browser as Back.

### Timed event

| Keys | Does |
| --- | --- |
| `←` `→` `↑` `↓` | Focus the previous / next event, in time order |
| `Shift`+`↑` `↓` | Move the event by one snap unit |
| `Shift`+`←` `→` | Move the event by one day |
| `Alt`+`↑` `↓` | Resize the end by one snap unit |
| `Alt`+`Shift`+`↑` `↓` | Resize the start by one snap unit |
| `Alt`+`←` `→` | Nothing — consumed. See the axis rule |
| `Enter` `Space` | Open the event |

A clipped event refuses to move, because it has no true edges on screen to
shift.

### All-day row

| Keys | Does |
| --- | --- |
| `←` `→` | Focus the previous / next bar |
| `Shift`+`←` `→` | Move the event by one day |
| `Alt`+`←` `→` | Resize the end by one day |
| `Alt`+`Shift`+`←` `→` | Resize the start by one day |
| `Enter` `Space` | Open the event |
| `←` `→` *from the empty track* | Step into the row, onto the first bar |

Vertical arrows are unused here and scroll as usual. There is no keyboard way
to *create* an all-day event yet — see Outstanding work.

`Escape` cancels a pointer gesture in flight, from anywhere in the view.

### What gets announced

Edits are mirrored into a polite live region, because a keyboard edit otherwise
changes the screen with nothing said.

| When | Live region says |
| --- | --- |
| `Enter` on a slot | `Event created Mon 7 Sep 10:00` |
| A timed event is resized | `Standup end moved, now Mon 7 Sep 10:00 to 10:45` |
| …and it crossed 24 hours | the same, plus `, now in the all-day row` |
| A timed event is moved | `Standup moved to Tue 8 Sep 10:00 to 10:45` |
| An all-day bar is resized | `Sprint week end moved, now Mon 17 Aug to Thu 20 Aug` |
| …and a promoted one dropped under 24 hours | the same, plus `, now in the time grid` |
| An all-day bar is moved | `Sprint week moved to Tue 18 Aug to Fri 21 Aug` |

## Things worth knowing before you change it

**Every day is exactly 24 hours.** Minutes are counted from midnight and day
boundaries are a fixed 1440 minutes apart. That holds in fixed-offset locales; on
a daylight-saving transition day the grid stays 24 rows tall and is an hour out
after the change. Making it exact would mean a different pixel-to-minute mapping
in every column.

**Gestures work in minutes from the first displayed day's midnight.** A day
change is just ±1440, which is what lets a block be dragged across columns
without special cases. The all-day row uses whole day indices instead — the same
gesture code, a different unit.

**Columns are located by arithmetic, not by the DOM.** A pointer's column comes
from its offset within the grid's box, because a real drag captures the pointer:
every `pointermove` then targets the element that was grabbed, so reading a
`data-` attribute off the event target would name the column the drag started in
for the whole gesture. This assumes columns are equal width, which the CSS
guarantees.

**Header, all-day row and time grid share one scroll container.** That is what
keeps their columns aligned: a scrollbar narrows all three together. Giving the
grid its own scroller misaligns it from the header by the scrollbar's width.

**Pointer gestures focus their target by hand, and quietly.** Every gesture
calls `preventDefault` on pointerdown to stop text selection mid-drag, which
also suppresses the browser's focus handling — without help, clicking the
calendar leaves focus on the document and the next Tab restarts at the top of
the page. So the gesture focuses what was pressed. That focus passes
`focusVisible: false`, because focus moved by script otherwise matches
`:focus-visible` and lights the indicator up on a plain click. The keyboard
paths focus without that flag, which is what keeps arrows and Tab visible.

**A keyboard edit targets what holds focus, not the roving tab stop.** The
all-day row resolves the bar to act on from the focused element, because its
track is focusable too — clicking empty space lands there. Answering a keypress
with the tab stop's fallback instead would edit whichever bar happened to be
first, an event the user never selected.

**Focus follows an event that an edit relocates.** Moving one to another day
changes its segment key, so Vue mounts a new element rather than patching the
old; a resize past 24 hours re-homes it to the all-day row entirely. Either way
the focused element is gone and focus would fall to the document — outside every
handler here, where the next `Alt`+`←` reaches the browser as Back.

**An all-day event occupies at least one whole day.** A day-granular resize that
would carry one edge past the other's day is refused outright rather than
clamped to that day's last instant: clamping rewrites the timestamp to
`23:59:59.999`, the store keeps whole seconds, and every further press then
"moves" the event by a millisecond and announces it. A promoted event is exempt,
being a timed event drawn in that row: its floor is a snap unit, and shrinking it
under 24 hours is how it returns to the grid.

**Anything absolutely positioned inside the scroll container needs the container
positioned.** A `sr-only` live region caught this once — with no positioned
ancestor it resolved against the document and gave the page a second scrollbar.

**The unit test environment cannot measure layout.** `getBoundingClientRect`
returns a 0×0 box there, so anything mapping coordinates to columns or minutes is
covered by Playwright instead. Pure layout maths — segmentation, promotion, lane
packing — is unit tested next to it.

## Outstanding work

See `docs/specs/schedule/week-view-gaps.md`.
