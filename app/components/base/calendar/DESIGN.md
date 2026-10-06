# Calendar — design

Why this component is built the way it is. For how to *use* it — props, slots, keyboard —
see [README.md](./README.md).

Terms in Title Case are defined in [CONTEXT.md](../../../../CONTEXT.md). Architectural
rationale lives in
[ADR-0005](../../../../docs/adr/0005-calendar-uses-roving-tabindex.md),
[ADR-0006](../../../../docs/adr/0006-calendar-selection-mode-is-an-enum.md) and
[ADR-0007](../../../../docs/adr/0007-calendar-never-mutates-its-model.md).

## Purpose

An inline month grid, on the way to replacing PrimeVue's `DatePicker` — and with it
`DateRangePicker.vue` and `DatePicker.vue`, which wrap it (the PrimeVue picker they
replaced rewrote its DOM
through a `MutationObserver`).

**This is deliberately step one of two.** Calendar is the grid. A later `DatePicker` composes
`Dropdown` + `MaskedInput` + `Calendar`, and PrimeVue stays until that lands.

Splitting it this way follows the decision `base/select/DESIGN.md` already paid for: opening,
closing, teleport, floating-ui positioning, click-outside and focus restore are **Dropdown's**
job, not a control's. Text entry is its own problem with its own solution (`MaskedInput` +
`imask`), and bundling it here would mean the grid couldn't ship until parsing was solved.
It also serves a real use case on its own — `app/pages/schedule/` wants an always-visible grid.

## Shape

```
base/calendar/
  Calendar.vue             mode narrows v-model; owns view + Visible Date; provides context
  CalendarHeader.vue       nav buttons; month/year buttons from Intl.formatToParts
  CalendarDayGrid.vue      weekday header, week-number column, the day keymap
  CalendarMonthPanel.vue   3×4
  CalendarYearPanel.vue    4×3, 12-year pages
  CalendarCell.vue         td + native button, data-* state, DOM focus
  useCalendar.ts           the deep module: state, grid derivation, movement, commit
  utils.ts                 pure date maths — no Vue, no props, fully testable alone
  context.ts               createContext, per the accordion/carousel/dnd/select house pattern
```

`utils.ts` exists because the fiddly correctness lives in pure functions of dates: matrix
building under `weekStartsOn` and `fixedWeeks`, the Thursday rule, 12-year page arithmetic,
the bounded skip scan. It is also in `nuxt.config.ts`'s component-scan ignore list, so it is
not auto-registered.

## One date type

`v-model` carries `Date` at **local midnight**, in the browser's local timezone, and that is
not configurable.

A `Date` is an *instant*, not a day, so this is the less correct model — a civil
`{ year, month, day }` (what reka-ui and Temporal converge on) cannot be off by a day. It was
rejected because this component exists to replace PrimeVue at call sites that already hold
`Date`, inside a vee-validate/valibot stack that holds `Date`. A second date type would grow a
conversion layer at every one of them, and the mixed vocabulary would cause more bugs than the
timezone edge case will in an app shipping `en` and `ja`.

The accepted cost: `.toISOString()` on an emitted value returns the previous day in JST.
`formatDateTime` in `app/utils/date.ts` is the sanctioned serializer.

**Everything compares at day granularity**, including `minDate`/`maxDate`. This is not
tidiness: `:max-date="new Date()"` is the most common thing anyone will write, and it carries
a time of 15:42 — at instant granularity that disables *today*. It also deletes the
`.endOf('day').isBefore(...)` gymnastics the old `QuarterPicker` needed.

The consequence to know: an emitted array can hold mixed precision — our midnights alongside
timestamps the parent supplied and we refuse to rewrite (ADR-0007). Nothing breaks, because
comparison is day-granular everywhere, but `dates.includes(someDate)` returns `false` and will
confuse the first person who tries it.

## Intl for display, dayjs for arithmetic

dayjs does `startOf('month')`, `add(1, 'day')`, `isSame(d, 'day')` and `isoWeek()`. Every
string a human reads comes from `Intl`.

This looks inconsistent in a dayjs codebase, so: dayjs *can* do locale display, at a worse
price.

1. **Bundle.** Each dayjs locale is a separate import someone must remember to add. `Intl` is
   in the runtime and works for locales the app has never heard of, at zero cost.
2. **`weekStartsOn` cannot be honoured through dayjs without `updateLocale`, which is global
   mutation.** It permanently rewrites the shared locale object, so a single
   `<Calendar :week-starts-on="1">` would change week behaviour in `DateRangePicker`,
   `app/utils/schedule.ts` and everything else touching dayjs. A component reaching out to
   mutate global state is a bug that would be miserable to trace back here.
3. `Intl` already produces the exact glyphs the design calls for: `S M T W T F S` for `en-US`,
   `日 月 火 水 木 金 土` for `ja-JP`.

`utils.ts` does call `dayjs.extend(isoWeek)`. That is additive — it adds a method and cannot
change the behaviour of dayjs calls made elsewhere. `updateLocale` is the one that can.

### The header is built from `formatToParts`

```
en-US  →  [month:"September", literal:" ", year:"2026"]
ja-JP  →  [year:"2026", literal:"年", month:"9", literal:"月"]
```

**The order is reversed.** The header renders these parts in the order `Intl` returns them,
wrapping `month` and `year` as buttons and literals as text — so `[September][2026]` and
`[2026]年[9]月` both come out right with no conditional in the template.

This is why there are no separate `#month` / `#year` slots, and why `format('MMMM YYYY')`
would have been wrong: it hardcodes the English order for every locale.

The literal spans carry `whitespace-pre` (flex would collapse English's separating space) and
the buttons carry minimal horizontal padding, so 年 and 月 sit flush against their numbers.

### The month panel's year label reads the Visible Date

Not `focusedYear`. `focusedYear` is roving-focus state for the *year panel*; `pageBy` moves
the Visible Date without touching it, so a label bound to it goes stale and the month
panel's own paging buttons look like they do nothing — the grid's disabled states update
underneath a label that does not.

## `locale` is resolved, not defaulted

`base/` contains no other `useI18n` — `Select` takes user-facing text as props with English
defaults (`clearLabel: 'Clear selection'`), so that a base component works outside the app.
Calendar keeps that for its `labels` object, but **not** for `locale`, which is resolved from
`useI18n()` when present and falls back to `'en'`.

`locale` is a different kind of thing from a label. It is a *formatting context*, not a string
to display: it drives weekday names, month names and the header's year/month ordering at once.
There is exactly one correct value app-wide, and it changes at runtime with the language
switcher. Most importantly the failure is **silent and invisible to the people writing the
code**: an English-reading developer who forgets `:locale` sees a perfectly correct calendar,
while a Japanese user sees "September 2026" and `S M T W T F S`. Nobody catches that in review.

The fallback is guarded with `try`/`catch` so a bare `mount()` without the i18n plugin still
works — which the specs rely on.

## `weekStartsOn` is hardcoded to 0, not derived

Deriving it from `locale` is the principled answer, and it was measured rather than assumed:

- `Intl.Locale.prototype.getWeekInfo()` **is not available** in this runtime, so deriving needs
  a hand-maintained locale→weekday map or a polyfill — new machinery with staleness risk.
- The payoff today is **zero**. Neither dayjs locale declares a `weekStart`, so `en` and `ja`
  both start Sunday; derivation would return `0` in every case the app can reach.

Revisit it when a Monday-start locale is actually added. Until then the prop is the escape
hatch.

## Fixed weeks

`fixedWeeks` defaults to `true`: always 6 rows. The natural count is 4–6 (4 only for a non-leap
February starting exactly on the week-start day).

Paging is a rapid, repeated gesture. With natural rows the next/prev buttons and everything
below the grid move vertically between clicks, so the button you are aiming at shifts out from
under the cursor — the same class of problem as the hover-scroll jitter `Select` fixes. It also
means the future `DatePicker` popup would resize and floating-ui reposition on every page.

A boolean defaulting `true` is an awkward shape — the off switch is `:fixed-weeks="false"`,
unreachable by attribute syntax. That wart is paid at the rare call site that wants natural
rows. Defaulting `false` pays it at *every* call site, as a grid that jumps until someone
files a bug.

## Outside Days are selectable

Dimming already says "another month"; a cell you can see and can't click is more frustrating
than one that does something mildly surprising. `fixedWeeks: true` puts up to eleven of them
on screen, so this matters.

**Outside and Disabled must not look alike.** Both default to "dim" in most designs, but they
behave oppositely — one is fully clickable, the other inert. Two states that look identical
and respond differently is worse than either looking wrong. So: Outside is normal colour at
reduced opacity and **keeps its hover tint**; Disabled is a different muted colour with **no
hover response**. The hover response is the discriminator, learned in one gesture. Nuxt UI
renders both as `text-muted`; that is the collision, and diverging from it is deliberate.

### "Visible" means "in the month being drawn"

Selecting an Outside Day pages the grid to that day's month (single mode). Under the literal
reading — *visible* meaning *painted somewhere on the grid* — clicking `1` in September's
trailing row would leave you on September with your brand-new selection rendered **dimmed**,
so the thing you just chose looks disabled. Hence the other reading.

Multiple mode follows nothing, so there the Outside Day is simply added and the grid stays
put. That is the right behaviour: paging-free accumulation across a month boundary is what
that row is good for.

## Visible Date ownership

Internal by default; `v-model:visibleDate` is an opt-in override.

`controlled` is derived from **the prop**, not from a `defineModel` ref. A `defineModel`
fallback becomes defined the first time we page, which would silently switch the follow rule
off after one click.

The follow rule is: single mode only, only when the new value is not already in the Visible
Month, and never when the parent owns it. **The single/multiple asymmetry is deliberate** and
will look like something to simplify: in multiple mode the user is deliberately accumulating
dates across months, and a grid that yanked itself back on every click would make that nearly
unusable.

## Week numbers

ISO 8601, labelled by **the ISO week of the row's Thursday**.

With `weekStartsOn: 0` a displayed row straddles two ISO weeks, because ISO weeks run
Monday–Sunday. Concretely, in September 2026's first row:

```
Sun Aug 30 2026   ISO W35   ← first cell
Thu Sep 03 2026   ISO W36
Sat Sep 05 2026   ISO W36   ← last cell
```

The cell holds one number. The Thursday rule is not an arbitrary tiebreak — it is the ISO
definition itself (a week belongs to the year containing its Thursday), reused to settle a
question ISO does not answer. It picks the week holding six of the row's seven days, and is
correct unchanged for every `weekStartsOn`: with a Monday start the row *is* a whole ISO week
and its Thursday is simply inside it.

Locale week numbering was rejected. Its numbers always match its rows — it has none of the
inconsistency below — but if someone turns this column on, "W36" needs to mean what it means
in the spreadsheet they are cross-referencing. Internally consistent and externally wrong is
the worse trade; the column exists precisely to talk to the outside world.

**The accepted cost, so nobody "fixes" it:** with `weekStartsOn: 0`, the first cell of a row is
not in the week the row is labelled with. Click Sun Aug 30 in a row marked W36 and you have
selected a day ISO calls W35.

The cell is `role="rowheader"` and is **not focusable or clickable**. A `gridcell` there would
give every row a phantom eighth day for arrow keys to walk into and screen readers to announce
as selectable. Week-click-selects-the-week is out of scope — it cannot be added without
revisiting range mode anyway.

## Cell structure

```html
<td role="gridcell" :aria-selected="isSelected">
  <button type="button" :disabled="isDisabled" :aria-disabled="isUnavailable"
          :tabindex="isTabbable ? 0 : -1" aria-label="14 September 2026, selected"
          data-selected data-today data-outside data-unavailable>14</button>
</td>
```

A focusable `<td>` with no inner element was the first draft. It loses because the design puts
a **circle inset within the cell**, and a focusable `td` draws its focus ring around the whole
rectangle. react-aria and Nuxt UI both use an inner element for the same reason.

`aria-selected` is hoisted to the `td` because it is **invalid on `role="button"`**; both those
libraries do the same. Since focus sits on the child, the state is *also* appended to the
button's `aria-label` rather than trusting the `td`'s attribute to be announced.

Unlike those libraries this is a **native `<button>`, not `<div role="button">`**, because it
maps the disabled/unavailable split straight onto platform primitives:

| | mechanism | effect |
| --- | --- | --- |
| Disabled Day | native `disabled` | unfocusable, unclickable — free |
| Unavailable Day | `aria-disabled="true"` | focusable, announced — free |

With a `div` both are hand-maintained and the failure is silent. It also restores
`SelectControl`'s convention — native attribute for `disabled`, `aria-` for the softer state —
which a focusable `td` would have forced us to break.

**Every cell's accessible name is the full date**, not "14". Announcing a bare number is the
single most common calendar a11y failure.

Explicit `role="row"` / `columnheader` / `rowheader` are required: `role="grid"` on the
`<table>` overrides native table semantics, and the implicit roles are stripped. A spec covers
this — it is invisible in the rendered DOM.

## Disabled vs Unavailable

Not a styling distinction. Adopted from react-aria / reka-ui, where:

- **Disabled** — outside the picture entirely. Not selectable, **not reachable by keyboard**.
- **Unavailable** — a real, relevant date you can't have. Not selectable, **but focusable and
  announced**.

The split earns its keep on the screen reader. Arrowing across a month and hearing *"September
15, unavailable"* on a fully-booked day is information. Hearing it for every date past
`maxDate` is noise. The strikethrough matches: you strike through something that is *there*
and crossed out.

Precedence is **disabled wins** — neither is selectable, so the only question is whether the
keyboard stops there, and "not reachable" is the stronger claim.

Selected + Unavailable exists (ADR-0007 forbids stripping invalid values) and renders as ring
*and* strikethrough. The signals are independent, so they compose without a special case.

## Movement, and why the scan is bounded

Arrows page across month boundaries. This breaks `Select`'s "clamp, don't wrap" rule
deliberately: a calendar's arrows navigate a *continuous* timeline that happens to be drawn a
month at a time, and clamping at the month edge would leave keyboard users unable to reach any
date outside it.

That combination is dangerous. `base/select/DESIGN.md` already warns *"arrow keys must not
loop looking for an enabled option"*; here the scan is unbounded in principle, because there
is no end of list to stop at. `ArrowRight` on Sep 30 with `maxDate = Sep 30` would walk
forward forever.

Two bounds, both needed:

1. **Movement never crosses `minDate`/`maxDate`**, which stops the scan at the ends.
2. **`MAX_SKIP_SCAN_DAYS` (62) caps it within the bounds.** If nothing is found, focus stays.

`moveFocusBy` reapplies the *same* delta rather than stepping by one day, so `↑`/`↓` keep
their column when skipping disabled weeks.

`CalendarKeyboard.spec.ts` mounts a calendar with `isDateDisabled: () => true` purely to prove
a keypress terminates.

## Moving real DOM focus

The roving tabindex is only half the job: `tabindex="0"` says where focus *should* be, and
something has to actually put it there. That turns out to be the part with all the teeth, and
three separate bugs lived here before there were tests asserting `document.activeElement`.
**Assert real focus, not the attribute** — the attribute was correct in every one of them.

`focusRequest` is a counter bumped only by keyboard handlers, so paging driven by the model or
by the parent never yanks focus. But a watcher on it is not enough: **the target cell often
does not exist yet when the request is made.** `PageDown` from 15 Sep lands on 15 Oct, which
September's grid never drew; `Escape` out of a panel re-creates the entire grid through
`v-if`. In both cases every candidate cell mounts *after* the request, so a plain watcher
never fires and focus falls to `<body>`.

So cells also try to take focus on **mount**, which needs `focusRequest` to behave as a
one-shot **token** rather than a level:

- On first render no request has been made, so the Calendar does not steal focus.
- Paging with the mouse mounts new cells without bumping the counter, so focus stays on the
  nav button being clicked.

**The claim happens last, after the cell has checked it can actually focus.** This ordering is
load-bearing and looks redundant. The mount callback is deferred by `nextTick`, so it can run
*after* its own cell has been unmounted — the outgoing cell of a month page does exactly that,
and it still reports the `isTabbable` it had before the page. Claiming there burns the token
and leaves the incoming cell unable to focus at all, which is the original bug wearing a
disguise. Hence the `isConnected` check before `claimFocusRequest()`.

`isTabbable` is also read *after* `nextTick`, so the guard sees the current render's props
rather than the previous ones.

### Panels are entry points too

Both guards the day grid has — the claim token and bounds-checked seeding — were written
when a panel could only be reached by a user action. `period` makes a panel the *initial*
view, and neither guard came across; both had to be extended:

- **Mount-time focus is claim-gated.** The panels' focus watcher was `{ immediate: true }`,
  which meant an inline `<Calendar period="quarter">` took the page's focus the moment it
  rendered — the playground, which shows one calendar per period, jumped focus into the
  last one on load. They now use the same one-shot token as `CalendarCell`.
- **The initial roving index is seeded, not assumed.** `focusedMonth` and friends were
  initialised straight from the Visible Date. `setView` ran them through `seedFocusedMonth`,
  but nothing else did — so `<Calendar period="month" :min-date="…">` could put its only
  `tabindex="0"` on a disabled cell, with no grid-level fallback because that only fires
  when *every* cell is disabled. Seeding now lives in `seedFocusFor`, called from `setView`,
  from the initial refs, and from the `period` watcher.

The pattern worth remembering: **every way into a view needs the same treatment**, and
adding a prop that changes which view opens is a new way in.

### Handing focus to a popover wrapper

`Calendar` exposes one method, `focus()`, which moves focus to the roving cell. It is the
only thing on `defineExpose`, and it exists because the two obvious alternatives are both
wrong:

- **Focus on mount.** Wrong for the inline case — the schedule sidebar renders a Calendar on
  page load, and a grid that grabs focus when it renders scrolls the page to itself.
- **Leave it to `Dropdown.focusOnOpen`.** It fires on `ArrowDown` and focuses the *first
  focusable element* in the popover, which for a Calendar is the header's « button. Opening
  with the mouse left focus on the field entirely.

So the wrapper asks and the Calendar answers: `DatePicker` watches its open state and calls
`focus()`. One `ArrowDown` now opens the popover *and* lands on the selected day; arrows
navigate from there, and `Escape` restores focus to the field.

### When nothing can take focus

`isTabbable` requires `!isDisabled`, because a natively disabled button cannot hold focus —
marking one `tabindex="0"` would produce a grid with no reachable entry point at all. When
nothing in a view can take focus, **the view's own grid element becomes the tab stop**.

This applies to all three views, and the panels need it at least as much as the day grid: a
panel's `Escape` handler lives on the grid div itself, and the header's paging buttons are in
a sibling subtree, so their `Escape` never reaches it. Without the fallback, a month or year
panel where everything is out of bounds has no keyboard route back to the day view. Never
while `disabled`, which must skip the Calendar entirely.

The panels also seed their focus to the nearest *enabled* cell — `setView`, `selectYear` and
`pageYearsBy` — rather than to the Visible Date's own month or the page's first year, either
of which is routinely out of bounds.

### Year paging asks about a direction, not a neighbour

`canPagePrevYears` / `canPageNextYears` test whether any selectable year lies that way at all.
Two weaker tests were wrong:

- **The adjacent page's boundary year.** With `minDate` in 2030 and the grid on 2026, the next
  page (2028–2039) holds every selectable year — but its first year, 2028, is before the
  bound, so the button went dead and the valid years were unreachable. Worse, the 2016–2027
  page has no enabled cell either, so the year view had *no enabled control anywhere* and the
  Calendar was stuck in it for mouse and keyboard alike.
- **The adjacent page's contents.** Fixes that case, but still strands a range several pages
  away, because every page in between is empty and each one blocks the next.

Only the direction test lets the user travel across empty pages to the range. `minDate` a
few decades out is not an exotic input.

## Three deliberate divergences from Select's keymap

1. **`Space` is unconditional.** Select makes it conditional on `!searchable` because Space
   must type a space in a search field. There is no text field here, so the exception has no
   reason to exist.
2. **`PageUp`/`PageDown` is a month, not a flat 10.** Select chose a flat 10 for determinism
   because a list has no natural page. A calendar does.
3. **`Home`/`End` is the displayed row, not the whole grid.** APG specifies the week for
   calendars.

Seven tab stops (`«` `‹` month year `›` `»` + one cell) is more than `Select` would accept —
it gives its clear button `tabindex="-1"` to avoid stop proliferation. These are the
Calendar's *primary* controls, not incidental affordances, and a keyboard user who wants to
skip them has `PageUp`/`PageDown` and `Shift`+ them covering every nav button without leaving
the grid. Hiding a redundant control from `Tab` is fine; hiding primary ones is the mistake.

## Views swap in place

Clicking the month or year label replaces the grid's contents. It is not a popover, although
the design was described as one.

A popover would drag `Dropdown` back inside a control, against the decision above, and
re-open the double-toggle bug `base/select/DESIGN.md` documents — where Dropdown's merged
click handler and the control's own handler fight, **only under a real mouse**, because a
genuine gesture leaves the JS stack empty for a microtask checkpoint while `el.click()` does
not. The tests would pass.

It would also give `Escape` two meanings inside the future `DatePicker` — close the panel or
close the picker — needing stopPropagation choreography between two Dropdowns. In place,
`Escape` returns to the day view, one layer, no negotiation.

Focus is trivial: same container, the roving tabindex just retargets.

### The body is pinned in both axes

A month panel is 4 rows and 3 columns against the day grid's 6 and 7, so an unpinned box jumps
in *both* directions on drill-down. One custom property drives all of it:

```css
.calendar { --calendar-cell: 2.5rem; }
```

giving the day grid's column width, `min-width: calc(7 * var(--calendar-cell) + week column)`
and `min-height: calc(rows * var(--calendar-cell) + 1.25rem)`.

**The height pin derives from the grid's actual row count, not a hardcoded 6.** An earlier
draft tied pinning to `fixedWeeks`, which conflated two different jobs: `fixedWeeks` keeps the
day grid a constant height *while paging months*, whereas the pin keeps the body constant
*across a view swap*. They are independent — with `fixedWeeks: false` the grid varies by
month, and a panel would still have jumped. Deriving from `rowCount` makes every combination
coherent: the panels always match the grid they replaced, whatever it currently is.

`autoHeight` opts out of the pin altogether, accepting the drill-down jump. It is a separate
prop rather than more `fixedWeeks` overloading, for exactly the reason above.

### One token, or it does not fit anywhere

`--calendar-cell` drives the column width, the day button, the nav button, the panel row
height, the pinned box and the type scale. Every one of those was hardcoded at first, and
each hardcoded value was a latent bug the moment someone narrowed the token — which the
README explicitly invites. Fitting the calendar into the schedule sidebar found three in a
row: the day button kept its `size-8` and overflowed a 34px column, the header's four nav
buttons kept theirs and pushed the month label out of the box (silently, because the sidebar
clips horizontally), and `text-sm` on the root beat the consumer's `text-xs` on specificity
so the type never shrank at all.

The lesson is the one the token was for: **a documented knob that only moves some of the
dependent values is worse than no knob**, because the failure is a layout that looks nearly
right. If a dimension is not written as a function of `--calendar-cell`, it is a bug waiting
for the next narrow container.

Type is `calc(var(--calendar-cell) * 0.35)` rather than a fixed size, which lands on exactly
14px at the default 2.5rem cell and exactly 12px at the width a 272px sidebar allows. It is a
token and not a utility class because a scoped `.calendar` rule outranks a `text-xs` class on
the same element — the obvious consumer override loses, and loses quietly.

### Why not `transform: scale()`

The PrimeVue `DatePicker` this replaces was fitted to the sidebar with `scale-72` plus a
counter-scale on its header, because nothing about its size was addressable. Scaling is the
wrong tool even when it is available: it shrinks the fonts and the hit targets along with the
box, blurs the focus ring, and leaves the element's layout size unchanged, so the container
still reserves the unscaled footprint. Deriving from the token gives crisp type at a
deliberate size, hit targets that stay proportional, and a real layout box.

### Why the day grid has explicit column widths

`w-full` on the table was wrong, and wrong in a way this codebase has already been bitten by.
`.calendar` is `inline-block`, and **a percentage width is ignored when sizing a shrink-to-fit
box** — so the browser used the table's intrinsic width and it stretched to fill the page.
This is the same rule as `base/select/DESIGN.md`'s note on `size="1"`, from the opposite
direction. The fix is real widths on the header cells, giving the table a true max-content
width equal to the pinned `min-width`.

## Selected and Active must not look alike

`base/select/DESIGN.md` records the same failure in a list: `.list-select-item` painted
selected, active and hovered the same colour, so you could not tell what you had chosen. A day
cell is worse, because the obvious focus treatment — a solid primary ring — is *exactly* what
Selected looks like.

They are separated on three axes at once:

| | weight | opacity | position |
| --- | --- | --- | --- |
| Selected | 1px | full | on the circle's edge |
| Active | 2px + 6px blur | 60% | detached by a 3px gap |

The gap is load-bearing, not decoration: a cell that is both selected and focused must show
both rings, and drawn flush they merge into one thick band that just reads as emphatic.

Dashed was considered and rejected. At 32px a dashed 2px ring resolves into four or five stubs
that read as a rendering artefact, and dashed borders already mean "drop target" or "empty
placeholder" elsewhere in most systems. A translucent blurred halo says "transient" without
borrowing another idiom.

Cell geometry moved from `size-9`/`m-0.5` to `size-8`/`m-1` to make room: the halo extends 5px
past the circle, which collided with the neighbouring button at the tighter spacing.

### Why it is a pseudo-element, not an `outline`

`outline-primary/55` **resolves to white.** `--color-primary` is a `light-dark()` value, and
Tailwind's alpha modifier compiles to a `color-mix()` that cannot decompose it, so the fallback
lands on white. Nothing errors; the ring simply renders as a crisp white circle that looks
entirely deliberate. It was caught by reading `getComputedStyle().outlineColor`, not by looking
at it.

A `::after` with plain `opacity` works on any colour function, and it lets the `box-shadow`
glow fade with the ring instead of needing its own alpha. Anything restyling focus here must
avoid the alpha modifier on any `light-dark()` token.

## Only the terminal view commits

Picking a month or year moves the Visible Date and drills down — year → month → day — without
touching `v-model`. That was once the whole rule ("panels navigate, never commit"); `period`
sharpens it to **only the view matching `period` commits**, which says the same thing at the
default `period: 'date'` because the day grid is the terminal view.

That deferral paid off as hoped. Because the view state and each panel's disabled logic
already lived in the composable as separate concerns, `period` landed as a terminal-view flag
rather than a rewrite. The four questions it was blocked on — what `isDateDisabled` means for
a month, how bounds clip a partially in-range month, what `mode: 'multiple'` means at a
coarse unit, and whether a committed month is its 1st or its last — are answered below and in
[ADR-0008](../../../../docs/adr/0008-calendar-period-value-is-the-period-start.md).

Arrows inside a panel **clamp at the page edge** rather than paging. `PageUp`/`PageDown` and
the nav buttons move between pages. Simple and predictable; the alternative needs cross-page
focus bookkeeping for no clear gain.

## Periods

`period` chooses the unit one selection covers: `'date' | 'month' | 'quarter' | 'year'`,
defaulting to `date`.

It is **not** called `granularity`. In react-aria that name means time precision —
`day | hour | minute | second` — and `DateRangePicker` already has a `showTime` prop, so the
name has to stay free for the meaning the ecosystem expects. `period` is also the word this
codebase already uses: `DateRangePicker`'s `periodType`, and the `filter.day/month/quarter/year`
keys. `view` was unavailable outright — it is Calendar's internal navigation state.

### The value is `startOf(period)`

One rule, and it is the old rule generalised: the Calendar already emitted local midnight,
which *is* `startOf('day')`. So `date` is not a special case, and **`period` becomes the unit
of every comparison** — selection, the today marker, and the bounds.

The consequence worth knowing is that the emitted value can be *earlier* than a literal
`minDate`: with `minDate` on 15 June, June is selectable and emits 1 June.
[ADR-0008](../../../../docs/adr/0008-calendar-period-value-is-the-period-start.md) records
why that beats clamping the value, and `startOfPeriod` / `endOfPeriod` are exported so
consumers can floor their own bounds to match.

### Which views exist

| `period` | opens on / commits | above it |
| --- | --- | --- |
| `date` | day grid | month panel → year panel |
| `month` | month panel | year panel |
| `quarter` | quarter panel | year panel |
| `year` | year panel | — |

**Quarter is not a step in the `date` chain.** It sits between year and month in the
hierarchy, but picking a day still goes year → month → day; inserting a quarter stop would
make the common case a four-step drill for no benefit. The quarter panel exists only when
`period: 'quarter'`, reached from the year panel.

`Escape` returns to the terminal view, and **from** the terminal view it bubbles — there is
nothing to step back to, and a wrapping `Dropdown` owns it. At `period: 'date'` that is
exactly the behaviour the day grid always had.

### Two panel roles, two vocabularies

Panel cells carried one state, `isCurrent`, styled `font-semibold text-primary` — which is
*precisely* the day grid's Today treatment. Harmless while panels only navigated; a collision
the moment a panel commits and needs Selected and Today as well.

The resolution is that the two never co-occur:

| role | signals |
| --- | --- |
| **navigational** | Current — the period the view below is parked on |
| **terminal** | Selected · Today · Disabled · Unavailable |

`isCurrent` is *meaningless* on a terminal panel: at `period: 'month'` the panel shows the
twelve months of a year and the Visible Date sits somewhere inside it, but which month it
points at is arbitrary because nothing below consumes it. So terminal panels never set it,
and bold-primary can serve Current and Today without ambiguity. No third look had to be
invented for a 40px cell, and the "month you came from" highlight is preserved byte-for-byte
where it means something.

### Predicates describe the unit being selected

`isDateDisabled` and `isDateUnavailable` keep their names and their single `Date` argument;
they receive **the Date that identifies the period**, which at the default `period` is simply
the day. Renaming them to `isPeriodDisabled` was considered and rejected: the default case is
overwhelmingly dates, where the current name is exactly right and matches the react-aria
vocabulary the disabled/unavailable split came from.

They apply **only to the terminal unit**. A navigational month panel ignores them, because a
day-level predicate cannot speak for a whole month — letting it try would disable months
according to whatever their 1st happens to be.

The matching trap, which the README warns about rather than the code preventing: a day-level
predicate becomes near-meaningless at a coarse period. `d => d.getDay() === 0` asks whether
Q*n* happens to *start* on a Sunday. It looks like it works.

### What goes quiet

`fixedWeeks`, `showWeekNumbers` and `weekStartsOn` configure the day grid exclusively, so at a
coarse period they are silently inert. A runtime warning would be noise for something
obviously dead, and making them type-level unavailable means turning three props into
conditional types — which is the machinery ADR-0003 exists to warn about, for no real gain.

`--calendar-cell` still applies, so the pinned body keeps the day grid's height at every
period. That is what stops the box resizing when you drill from a 4-row quarter panel up to a
12-year one.

### `visibleDate`, not `visibleMonth`

The paging unit is a month at `period: 'date'`, a year at `month` and `quarter`, and twelve
years at `year`. A prop named for one of the four would be false in the other three, so it is
`visibleDate` — "the Date the calendar is scrolled to" — normalised to the start of whatever
unit the calendar pages by.

### What `period` replaced

The quarter picker now composes `Dropdown` + `MaskedInput` + `<Calendar period="quarter">`.
`QuarterPicker.vue` previously drove it as a PrimeVue `DatePicker` through a
`MutationObserver`: hiding the month view, splicing a hand-built quarter row into
PrimeVue's DOM, and "selecting" a quarter by synthesising a click on the month cell three
places along. That was coupled to PrimeVue's internal class names, so an upgrade could
have broken it silently.

The migration is what surfaced the `Escape` propagation bug above, and it fixed a live i18n
defect: the old component computed `datepicker.quarter_no` and then rendered a hardcoded
`Q{{ n }}`, so Japanese users saw "Q1" while 第1四半期 was built and discarded. Routing the
names through `labels.quarters` is what makes them render.

`DateRangePicker` followed: `app/components/DatePicker.vue` generalises the same
composition across all four periods, so the quarter special-case disappeared and PrimeVue's
`DatePicker` is gone from both components. `QuarterPicker.vue` is deleted: its call sites
use `<DatePicker period="quarter">`, and its tests live in `DatePicker.quarter.spec.ts`.
`<DatePicker period="quarter">`.

Two things that migration exposed, neither visible from the Calendar alone:

- **The masked field caps the year, and the model follows it.** `MaskedInput` syncs its
  parsed value back through `v-model:typed`, so a year range of 1900–2099 did not merely
  mis-display `DateRangePicker`'s "no end date" sentinel of 9999 — it rewrote the model to
  2099, which would have stopped `isUnlimited` recognising it on the next load. The old
  quarter-only mask had the same cap and got away with it because every other period was
  PrimeVue, which has no year cap.
- **Clamping had to go.** The old `QuarterPicker` rewrote its model when a bound moved past
  it; PrimeVue did not. Unifying the branches meant choosing, and ADR-0007 already argued
  the picker is the wrong place for it.

## Year pages tile on 12

`start = floor(year / 12) * 12`. Today's page is `2016 – 2027`.

The design mock read `2010 - 2021` — twelve years anchored to a decade, which does not tile:
paging by 10 makes 2020 and 2021 appear on two consecutive pages, and paging by 12 abandons the
anchor after the first page. It was confirmed as placeholder content.

Tiling gives three properties worth keeping: every year on exactly one page, `‹` then `›`
returning to the identical page, and a header label always literally true of its contents. No
page is ever decade-aligned — boundaries land on 2004, 2016, 2028.

## Selection semantics

- **Single mode: re-clicking the selected day is a no-op**, unless `deselectable`. In the
  future `DatePicker`, clicking the highlighted date is a natural "yes, that one, close now"
  gesture, and silently emptying the field instead is destructive. Clearing is an affordance,
  and affordances belong to the wrapper — the same reasoning that gives `Select` a clear button
  rather than overloading option clicks. The cost: an inline Calendar with no wrapper and no
  `deselectable` cannot be cleared by the user at all.
- **Multiple mode emits chronological order, always.** Insertion order sounds friendlier but
  breaks dirty-checking and equality invisibly: two identical *sets* produce different
  `JSON.stringify` output. Nobody has ever wanted the click order of dates.
- **`[]`, never `null`, for an empty multiple selection.** A nullable array makes every
  consumer write `value?.length ?? 0`.
- **`null`, not `undefined`, for an empty single selection.** This disagrees with
  `DateRangePicker` and `DatePicker`, which use `Date | undefined`, and matches `Select`'s
  `V | null`. The newer convention wins: those two are slated for replacement, and propagating
  the old spelling into the new library is the wrong direction. `undefined` is accepted on the
  way in.

## Today is ambient

Read once at setup from `new Date()`. It is deliberately **not a prop**: half the visual
vocabulary keys off it, and a consumer-supplied `today` that disagrees with reality is a
capability nobody has asked for. Specs pin it with `vi.setSystemTime`.

`vi.useFakeTimers()` must be called as `{ toFake: ['Date'] }`. Faking `setTimeout` and
`queueMicrotask` as well stalls Nuxt's async bootstrap and Vue's `nextTick`, and the whole
spec file times out with no useful error.

## Performance

`isDateDisabled` and `isDateUnavailable` are consumer functions called ~42 times per grid
build. There is no separate memo — **the `weeks` computed is the memo**, re-running only when
the month, the bounds, the predicates or the selection change.

## Out of scope

- **`range` mode** — `mode` widens to `'range'` without breaking call sites (ADR-0006). It
  needs tentative-range hover preview, two-anchor state and third-click semantics.
- **Time of day.** `granularity` is reserved for it, in react-aria's sense (`day`/`hour`/`minute`/`second`) — which is why the selection-unit prop is called `period` and not that.
- **Multiple months side by side** — compose two Calendars with `v-model:visibleDate`.
- **`#heading` slot** — superseded by the built-in month/year panels. Adding a slot later is
  backwards compatible if a call site ever needs to replace them.
- **API compatibility with PrimeVue.**
