# Calendar

An inline month grid for picking one date or several. Not an input and not a popup — see
[DESIGN.md](./DESIGN.md) for why, and for every decision behind the behaviour below.

```vue
<script setup lang="ts">
const date = ref<Date | null>(null)
</script>

<template>
  <Calendar v-model="date" />
</template>
```

## Value

`v-model` carries **`Date` at local midnight**, in the browser's local timezone.

`mode` narrows it:

| `mode` | `v-model` | empty |
| --- | --- | --- |
| `'single'` (default) | `Date \| null` | `null` |
| `'multiple'` | `Date[]`, always chronological | `[]` |

```vue
<Calendar v-model="dates" mode="multiple" />
```

> [!IMPORTANT]
> The Calendar is **not timezone-configurable**. Picking 26 Sep gives you
> `2026-09-26T00:00:00` *local*; `.toISOString()` on that returns the 25th in JST. Serialize
> with `formatDateTime` from `app/utils/date.ts`.

All date comparison — selection, `minDate`/`maxDate`, toggling off — happens at **day
granularity**, so a value carrying a time still matches its day. The flip side is that
`dates.includes(someDate)` will not work on the emitted array; compare with
`isSameDay` from [`utils.ts`](./utils.ts).

## Props

| prop | type | default | |
| --- | --- | --- | --- |
| `mode` | `'single' \| 'multiple'` | `'single'` | narrows `v-model` |
| `visibleMonth` | `Date` | — | `v-model:visibleMonth`; see below |
| `locale` | `string` | app i18n locale, else `'en'` | BCP 47 |
| `weekStartsOn` | `0`–`6` | `0` (Sunday) | |
| `fixedWeeks` | `boolean` | `true` | always draw 6 rows |
| `autoHeight` | `boolean` | `false` | let the body shrink to the current view |
| `showWeekNumbers` | `boolean` | `false` | ISO week column |
| `deselectable` | `boolean` | `false` | single mode only |
| `disabled` | `boolean` | `false` | whole calendar |
| `minDate` / `maxDate` | `Date` | — | inclusive, day granularity |
| `isDateDisabled` | `(date: Date) => boolean` | — | unreachable |
| `isDateUnavailable` | `(date: Date) => boolean` | — | navigable, struck through |
| `labels` | `Partial<CalendarLabels>` | English | merged with `defu` |
| `id` | `string` | `useId()` | |

Emits `update:modelValue` and `update:visibleMonth`. There is no `defineExpose`.

### `isDateDisabled` vs `isDateUnavailable`

Both prevent selection. They differ in whether the date is *reachable*:

```vue
<Calendar
  v-model="date"
  :is-date-disabled="(d) => d < seasonStart"
  :is-date-unavailable="(d) => fullyBookedDays.has(d.getTime())"
/>
```

| | keyboard | screen reader | style |
| --- | --- | --- | --- |
| **disabled** | skipped entirely | not announced | muted, no hover |
| **unavailable** | focusable | "…, unavailable" | struck through |

Use *disabled* for dates outside what you offer at all, and *unavailable* for real dates
someone can't have — a closed holiday, a booked-out day. If both return `true`, disabled wins.

> [!NOTE]
> Calendar **never rewrites `v-model`** to enforce validity. Move `minDate` past an
> already-selected date and it stays selected, rendered selected-and-disabled. Clamping is
> your schema's job. See [ADR-0007](../../../../docs/adr/0007-calendar-never-mutates-its-model.md).

### The Visible Month

Omit `visibleMonth` and Calendar owns it: seeded from the first selected date, else today,
and it follows the model when a date outside the current month arrives — **in single mode
only**, since multiple mode means the user is paging deliberately.

Pass `v-model:visibleMonth` and you own it. Following is then off entirely.

```vue
<!-- two calendars kept one month apart -->
<Calendar v-model="from" v-model:visible-month="left" />

<Calendar v-model="to" :visible-month="right" @update:visible-month="left = addMonths($event, -1)" />
```

## Slots

### `#day`

Replaces a cell's contents. The cell, its button, focus and ARIA stay ours.

```vue
<Calendar v-model="date">
  <template #day="{ day }">
    {{ day.dayOfMonth }}
    <span v-if="hasEvent(day.date)" class="event-dot" />
  </template>
</Calendar>
```

`day` is a [`CalendarDay`](./useCalendar.ts): `date`, `dayOfMonth`, `isSelected`, `isToday`,
`isOutside`, `isDisabled`, `isUnavailable`, `isTabbable`, `label`.

### `#weekday`

Replaces a column header. Defaults to the `Intl` narrow name — useful because English narrow
names are ambiguous (`S M T W T F S` has two `T`s).

```vue
<Calendar v-model="date">
  <template #weekday="{ short }">
    {{ short }}
  </template>
</Calendar>
```

Receives `{ date, narrow, short, long }`. The long name is always rendered for screen
readers regardless of what you put here.

## Keyboard

Focus is a roving tabindex: exactly one cell is in the tab order.

**Day grid**

| key | |
| --- | --- |
| `←` `→` | ∓1 day, paging the month at the edges |
| `↑` `↓` | ∓7 days |
| `Home` / `End` | first / last day of the **displayed row** |
| `PageUp` / `PageDown` | ∓1 month |
| `Shift` + `PageUp` / `PageDown` | ∓1 year |
| `Enter` / `Space` | select |

Movement skips disabled days and never crosses `minDate`/`maxDate`. `Escape` is not handled
here — it bubbles, so a wrapper can use it.

**Month and year panels**: arrows move within the page and clamp at its edges;
`PageUp`/`PageDown` changes page; `Enter` drills down (year → month → day); `Escape` returns
to the day grid. Panels only navigate — **picking a month or year never changes `v-model`**.

## Sizing

The body's width is always pinned, and its height is pinned to the day grid's row count, so
drilling into the month or year panel never changes the box.

| | height |
| --- | --- |
| default | pinned to 6 rows |
| `:fixed-weeks="false"` | pinned to the visible month's natural 4–6 rows |
| `auto-height` | not pinned — shrinks to whatever view is showing |

`auto-height` accepts a jump on drill-down: a month panel is 4 rows against the grid's 6.

**Every dimension derives from one token**, so the calendar fits a container it was not
designed for without `transform: scale()`:

```css
.calendar {
  --calendar-cell: 2.5rem;                            /* column, button, row height, box */
  --calendar-cell-gap: 0.5rem;                        /* space between adjacent buttons */
  --calendar-font-size: calc(var(--calendar-cell) * 0.35);
}
```

To fit a fixed-width container, divide the space available:

```vue
<!-- a 272px sidebar with a 2rem gutter -->
<Calendar
  v-model="date"
  :style="{ '--calendar-cell': 'calc((272px - 2rem) / 7)' }"
  class="w-full p-0"
/>
```

Type scales with the grid by default — the ratio lands on 14px at the default cell and 12px
at the width above. Override `--calendar-font-size` to break that link.

> [!WARNING]
> Do not size the text with a utility class on the root. A scoped `.calendar` rule outranks
> `text-xs` on the same element, so it silently loses. Set the token.

## Styling

Every state is a `data-*` attribute on the cell button, so variants compose:

`data-selected` · `data-today` · `data-outside` · `data-unavailable` · `:disabled`

Focus is drawn on a `::after` pseudo-element, not an `outline`.

> [!WARNING]
> Do not restyle focus with Tailwind's alpha modifier — `outline-primary/55` and friends
> resolve to **white**, because `--color-primary` is a `light-dark()` value that `color-mix`
> cannot decompose. It fails silently and looks deliberate. Use `opacity` instead.

## Not supported

`range` mode, month/year *pickers* (`granularity`), multiple months side by side,
clicking a week number to select the week, and overriding "today". Range and granularity are
planned extensions that will not break this API; see DESIGN.md.
