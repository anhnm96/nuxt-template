---
status: accepted
---

# A Calendar period is encoded as its first day, and bounds are read at period granularity

`Calendar` gained a `period` prop — `'date' | 'month' | 'quarter' | 'year'`. A single `Date`
cannot say "Q3 2026" on its own, so how a period is encoded is a decision, not a detail. Two
rules settle it:

1. **The value is always `startOf(period)` at local midnight.**
2. **`period` is the unit of every comparison** — selection, the today marker, and
   `minDate`/`maxDate`.

## Why

Rule 1 is not new behaviour, it is the existing behaviour generalised. The Calendar already
emitted local midnight, which *is* `startOf('day')`, so `date` stops being a special case and
the whole component keeps one sentence for what a value means.

Rule 2 follows from it. If a value identifies a period, then a stored `2026-08-15` with
`period: 'quarter'` must render Q3 as selected — anything else would force us to rewrite the
consumer's value, which [ADR-0007](0007-calendar-never-mutates-its-model.md) forbids.
Extending the same comparison to the bounds is what makes a partially in-range period
selectable: with `minDate` on 15 June, June is pickable, because at month granularity the
bound *is* June.

## The consequence, stated plainly

**The emitted value can be earlier than a literal `minDate`.** Pick June under
`minDate = 2026-06-15` and the model receives `2026-06-01`. A valibot `minValue(minDate)`
on that value will reject a selection the Calendar presented as legal.

`startOfPeriod` and `endOfPeriod` are exported from `base/calendar/utils.ts` so a consumer can
floor its own bound to match — `minValue(startOfPeriod(minDate, period))` — and so the range
components have a sanctioned way to expand a stored value into an end bound.

## Alternatives rejected

**Clamp to `max(minDate, startOf(period))`.** Keeps June selectable *and* keeps the value
inside the bound, and it is one line. Rejected because it writes a transient UI constraint
into stored data: the record says the 15th not because anything happened on the 15th, but
because that was the bound on the day someone clicked, and six months later nothing
distinguishes it from a genuine mid-month date. It also makes the same gesture emit different
values depending on an unrelated prop, and it can only ever fire on the lower bound — an
in-bounds period always satisfies `start <= maxDate` — so the rule is asymmetric by
construction. A schema mismatch is loud the first time it is tested; clamped data never
announces itself.

**Containment: a period is selectable only if `startOf(period)` itself satisfies the bound.**
Guarantees the value never violates `minDate`. Rejected because June simply disappears, so
someone who can legitimately file something dated 20 June cannot pick the month it falls in.

**Emit `{ start, end }`.** Unambiguous, and it would make `shouldRoundToQuarterEnd`
unnecessary. Rejected because the single-`Date` model is what the component, the vee-validate
forms and the valibot schemas all rest on; a second date shape would grow a conversion layer
at every call site.

## What does not come across

`QuarterPicker`'s `shouldRoundToQuarterEnd` is deliberately absent. "Am I the end of a pair?"
is something only a *range* knows, and pushing it into the picker is what forces every picker
to carry a which-end flag. `DateRangePicker` will apply `endOfPeriod` to its end value
instead.

`QuarterPicker` also disables a quarter with `dateFromQuarter.isAfter(minDate)` — strict, and
against the quarter's *start* — so `minDate = 2026-07-01` disables Q3 2026. That is a bug, and
the floor-and-compare rule does not reproduce it.
