---
status: accepted
---

# Calendar never writes to its model to enforce validity

Only a user's click or keypress changes `Calendar`'s `v-model`. When `minDate`, `maxDate`,
`isDateDisabled` or `isDateUnavailable` change such that an already-selected date becomes
invalid, Calendar **renders it as selected-and-disabled and emits nothing**.

This contradicts live behaviour in this repo: `QuarterPicker.vue` has `watch` handlers on
`minDate` and `maxDate` that reassign `modelValue` to the clamped quarter. That pattern is
deliberately not carried forward.

## Why

1. **A controlled component that emits changes nobody asked for is a trap.** The parent set
   `minDate` and got back an `update:modelValue` it never requested. Inside vee-validate that
   marks the field dirty and can fire validation against a value the user never touched.
2. **It can loop.** A parent deriving `minDate` from `modelValue` — entirely reasonable for a
   start/end pair, and roughly what `DateRangePicker` does — gets model → bounds → corrected
   model → bounds. `QuarterPicker` is one `watch` away from this today.
3. **Clamping is a guess.** If 14 Sep falls out of range, the user might want the 20th, or
   nothing, or to be told. Calendar cannot know, and silently substituting *a different date
   the user never chose* is worse than showing a conflict. The value came from somewhere — a
   saved search, a server, a URL — and Calendar is not the authority on it.
4. It matches how `Select` already handles the analogous case: an **Unresolved Value** is
   *rendered*, not deleted.

Validation belongs to the schema. valibot is already in the stack.

## Consequences

- **The grid can show a cell that is selected and disabled at once.** That needs a deliberate
  visual treatment rather than two styles colliding by CSS source order: the ring stays, drawn
  in the muted colour, so the selection is still visible and visibly unavailable. Nothing else
  in the vocabulary looks like that.
- Selected + Unavailable likewise composes — ring *and* strikethrough.
- **A form can hold a value Calendar will not fix.** That is the point, and it is the schema's
  job to reject it. Consumers migrating from `QuarterPicker` must not assume clamping still
  happens.
- Because incoming values are never rewritten, an emitted `Date[]` can hold **mixed
  precision**: local midnights we created alongside timestamps the parent supplied. All
  comparison is day-granular, so nothing breaks — but `dates.includes(someDate)` returns
  `false`, and the first person to write it will be confused. `isSameDay` from
  `base/calendar/utils.ts` is the correct comparison.
- `Calendar.spec.ts` asserts that moving `minDate` past a selected date emits nothing and
  renders it selected-and-disabled. That test is the guard against someone reinstating a
  clamping `watch` out of sympathy with `QuarterPicker`.

## Scope

This is about *validity*. Calendar still owns and emits `visibleMonth`, and still follows the
model into a new month in single mode — that is view state, not the user's data.
