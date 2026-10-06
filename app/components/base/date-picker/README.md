# DatePicker

A date input: a masked text field with a [Calendar](../calendar/README.md) in a popover. One
component for all four periods — day, month, quarter and year — selected with `period`.

This file is how to **use** it. For why it is built this way — why the popover does not take
focus, why the mask is rebuilt rather than reconfigured — see [DESIGN.md](./DESIGN.md).

```vue
<script setup lang="ts">
const due = ref<Date>()
</script>

<template>
  <DatePicker v-model="due" period="date" placeholder="Due date" />
</template>
```

The model is the **first day of the period**: `period="quarter"` emits 1 July for Q3, never
30 September. `Calendar` emits the same value. See
[ADR-0008](../../../../docs/adr/0008-calendar-period-value-is-the-period-start.md).

## Props

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `modelValue` | `Date \| undefined` | — | `v-model`. The first day of the period. |
| `period` | `'date' \| 'month' \| 'quarter' \| 'year'` | `'date'` | The unit the user picks, and the shape of the mask. |
| `minDate` | `Date` | — | Earliest selectable date. Compared at day granularity. |
| `maxDate` | `Date` | — | Latest selectable date. Compared at day granularity. |
| `placeholder` | `string` | — | Shown while the field is empty. |
| `disabled` | `boolean` | `false` | The field is disabled and the popover never opens. |
| `separator` | `string` | `'.'` | Between the parts of the typed value, and the literal in the mask. |

There are no slots and no exposed methods.

## What the field accepts

| `period` | Typed as | Model |
| --- | --- | --- |
| `date` | `2026.09.14` | 14 September 2026, local midnight |
| `month` | `2026.09` | 1 September 2026 |
| `quarter` | `2026.Q3` | 1 July 2026 |
| `year` | `2026` | 1 January 2026 |

Years run from 1900 to 9999. A model value outside that range displays clamped to the
nearest end — year 500 displays as `1900.09.14`, with the month and day intact — and the
clamp stays in the field; it is not written back to the model.

An impossible date is rejected rather than rolled over, so `2026.02.31` leaves the model
untouched instead of becoming 3 March.

## Keyboard

| Key | In the field |
| --- | --- |
| `ArrowDown` / `ArrowUp` | Opens the popover and moves focus to the selected day |
| `Escape` | Closes the popover, focus stays in the field |
| `Tab` | While focus is in the field, moves on normally. Once focus is in the grid, it cycles the popover. |

Everything else is the Calendar's: see its [keyboard section](../calendar/README.md).

## Accessibility

The field is a `role="combobox"` with `aria-haspopup="grid"`, `aria-expanded`, and
`aria-controls` pointing at the Calendar while the popover is open. Opening does **not** move
focus — the field stays the primary control, and an explicit arrow key enters the grid.

## Gotchas

- **The mask is read once per mount.** Changing `period` or `separator` remounts the field,
  which is deliberate; changing `minDate`/`maxDate` does not reach the mask at all. Bounds are
  enforced by the Calendar (which disables the cells) and by your schema, not by the field.
- **An out-of-range value is kept and shown**, not corrected. A model value outside
  `minDate`/`maxDate` renders in the field and as a disabled-but-selected Calendar cell. See
  [ADR-0007](../../../../docs/adr/0007-calendar-never-mutates-its-model.md).
- **No time support.** `Calendar` has none, and a `showTime` prop here would do nothing.
- **`separator` is not locale-aware.** It is one character for the whole field. A locale that
  wants `2026/09/14` has to pass it.
