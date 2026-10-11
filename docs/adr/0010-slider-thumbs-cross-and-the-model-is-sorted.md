---
status: accepted
---

# Slider's Thumbs cross freely, and the model is their sorted projection

A range `Slider` has two Thumbs that may pass through each other. Neither is "the lower one".
Each owns a position, and `v-model` emits the pair **sorted**, so `modelValue[0] <=
modelValue[1]` holds at all times.

The alternative — clamping each Thumb at the other — was the first proposal and was rejected
on feel. This records what the reversal costs, because the cost is a rule that looks like a
bug.

## Considered options

- **Clamp.** Dragging the lower Thumb into the upper one stops it dead. `[0]` is always the
  smaller value because the Thumbs can never reorder. Simple, and the one state worth naming
  is the tie: once both sit on the same value a press has to pick one, and a nearest-Thumb
  rule traps the pair at a bound forever. Breaking the tie by press *direction* rather than
  distance fixes that.
- **Swap by identity.** The Thumbs trade roles mid-gesture: the element under the cursor stops
  being the lower Thumb and becomes the upper. Requires transferring DOM focus mid-drag, and
  on the keyboard it moves focus between elements on a single arrow press, which a screen
  reader announces.
- **Swap by projection** — chosen. Thumb identity never changes; only the order of their
  values does. The model is derived by sorting. Focus never moves, and the pointer and
  keyboard paths are identical because nothing special happens when the values cross.

Clamping is defensible and was argued for. Swap-by-projection was chosen because a Thumb that
sticks under the finger reads as a broken control, while the sorted invariant — the thing
clamping was protecting — survives the projection intact.

## The hazard this creates

The model is a *projection*, so mapping it back is lossy. Thumb A at 900 and Thumb B at 800
emit `[800, 900]`. Read that back index-for-index and A snaps to 800 while B snaps to 900 —
the Thumbs teleport through each other, under the finger, mid-drag.

Two rules prevent it, and both are load-bearing:

1. **Reconciliation maps by order, not by index.** The sorted model is assigned to the Thumbs
   ranked by their current positions, so an echo of what was just emitted moves nothing.
2. **A Driven Thumb is not reconciled at all.** "Driven" means dragged *or* holding DOM focus.
   The second half is not redundant: a consumer bound with `:model-value` + `@change`
   deliberately does not update the model until the gesture ends, so every reactive tick would
   otherwise snap the Thumb back to a stale value. The keyboard has no gesture end, which is
   why focus — not just dragging — counts as driven.

## Consequences

- **`aria-valuemin` and `aria-valuemax` on each Thumb are the full `min`/`max`**, not bounded
  by the sibling Thumb. The APG's dual-slider example constrains them, which is correct under
  clamping and would be a false claim here: the Thumbs genuinely can cross.
- **Accessible names follow order, not identity.** The Thumb holding the smaller value is
  announced as the minimum, whichever element that is, so a name changes mid-interaction after
  a cross. An announcement that is briefly unstable beats one that is confidently wrong.
- **A tie on a track press is harmless.** With both Thumbs on one value the press goes to the
  first. Under clamping that choice could strand the pair at a bound; here the other Thumb can
  always be dragged straight through.
- **`Slider.spec.ts` carries the regression guard.** The teleport is invisible in the rendered
  markup — the component looks correct right up until a parent echoes the model during a drag.
  The `Driven Thumb` block is the only thing standing between that rule and a silent
  regression.
