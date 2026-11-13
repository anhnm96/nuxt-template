---
status: accepted
---

# A Masked Input binds one reading, and a Partial Entry does not clear the Typed Value

A Masked Input carries three readings of one entry: the Masked Value, the Unmasked Value and
the Typed Value (see CONTEXT.md). The consumer writes exactly one of them, the Bound Value.
`MaskedInput` names it with `bound: 'unmasked' | 'masked' | 'typed'`, and it travels on a
single `v-model`. The other two readings are read-only; `accept` and `defineExpose` supply them.

The Typed Value changes only when the entry is empty (`null`) or complete (the parsed value).
A Partial Entry keeps the last complete value. Under `bound="typed"`, blur reverts a Partial
Entry to the Typed Value, so the field and the model agree again.

## Why

1. **Three writable models had no owner.** The old `useMask` let the consumer write all three,
   and each one pushed into the mask. When two arrived together, the order inside `initMask`
   decided the result. `DatePicker` bound `typed` and `masked` at the same time, and its
   initial text depended on that order. Each echo needed its own `$lastAccepted*` guard, and a
   guard that was not cleared could drop a later write. One Bound Value needs one comparison.
2. **Every consumer writes one reading already.** `DatePicker` and `EditImage` write the Typed
   Value; `ColorPallette` and `TimePicker` write a string. The extra bindings were seeds for
   the initial text, and the Bound Value supplies that.
3. **`null` on every Partial Entry makes the model flicker.** The user corrects one digit of a
   date, and the form sees `null` until the date is complete again. Keeping the last complete
   value avoids that. The blur revert closes the gap that this opens: without it, the field
   shows `2026.01.1_` while the form submits 15 January.

## Considered options

- **Three writable models with better echo guards.** Rejected; more surface to keep correct,
  and still no rule for two writes in the same tick.
- **Detect the bound model from `vnode.props`.** Rejected; fragile, and binding two models
  fails only at runtime.
- **Set the Typed Value to `null` on every Partial Entry.** Rejected for the flicker above.
- **Emit only on user input, so a write from the consumer never returns corrected.**
  Rejected. When the mask corrects a written value — clamps `150` to `100` — the corrected
  value reaches the model, so the field and the model agree. This differs from ADR-0007,
  where the Calendar never rewrites its model. A mask that is narrower than its data
  therefore rewrites the data; `DatePicker`'s mask accepts years up to 9999 for this reason
  (see `base/date-picker/DESIGN.md`).

## Consequences

- **`TimePicker` binds the Masked Value, not the Unmasked Value.** Its consumers store
  `HH:mm` strings, and its column writes replace fixed-width slices, which the Unmasked Value
  does not have. Its own `v-model` carries only a complete `HH:mm` or `''`: a Partial Entry
  such as `09:MM` stays inside the field, as a Partial Entry does under `bound="typed"`.
- **A correction is a change in what the field shows.** A date mask parses its text back as
  midnight, so an exact comparison would rewrite a written 23:59:59.999 to midnight.
  `DateRangePicker` writes the end of a day, and it then wrote the end of the day again, in a
  loop. The composable compares typed values with `typedValueEquals`, which compares their
  formatted text.
- **Picking a minute while the hour is empty gives `00`.** imask fills the placeholder hour,
  and the corrected value reaches the model.
- **The field and the Typed Value can disagree while the user types.** That is the intended
  state of a Partial Entry; it ends at the next complete entry, at an empty entry, or at blur.
