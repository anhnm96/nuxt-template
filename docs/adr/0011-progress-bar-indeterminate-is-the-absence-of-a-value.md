---
status: accepted
---

# ProgressBar is Indeterminate when it has no value

`ProgressBar` has no `indeterminate` prop. A bar is Indeterminate when `value` is absent:

```html
<ProgressBar :value="percent" />   <!-- determinate -->
<ProgressBar />                    <!-- indeterminate -->
```

This records why, because the missing prop is the first thing a reader will look for.

## Considered options

- **A flag beside the value** — `value: number` plus `indeterminate?: boolean`. Explicit at
  the call site, and what PrimeVue does with its `mode` prop, which is where this repo's
  current consumer learned the shape. It admits the combination `:value="40" indeterminate`,
  which has no meaning, so one of the two has to be documented as winning.
- **A discriminated union** — `{ indeterminate: true } | { value: number }`. Watertight at the
  type level, and poor in a template: Vue props do not discriminate, so a consumer whose value
  is `number | undefined` has to branch into two elements to satisfy it.
- **The absence of the value** — chosen. One prop, and the contradictory state cannot be
  written down.

The platform already means this. `<progress max="100">` with no `value` attribute *is* the
indeterminate state, and ARIA matches it: an indeterminate `role="progressbar"` omits
`aria-valuenow` rather than reporting a placeholder. The common sequence — a request that is
unmeasured until `Content-Length` arrives — becomes one assignment instead of two props
flipped in the right order.

## The hazard this creates

Indeterminate becomes a state you can enter by accident. `const percent = ref<number>()`
animates until the first value lands, and `<ProgressBar />` with no props animates forever.
Under the rejected flag, each of those would have been a quiet empty bar.

This was accepted rather than mitigated. The accidental state is the *honest* one — a bar with
no number to draw is correctly saying it has no number — and it is visible the first time
anyone looks at the screen, where the rejected option's invalid combination is visible only in
review.

Two rules keep the accident legible:

1. **A value of 0 is not Indeterminate.** A known zero draws an empty Track and announces 0.
   The two states look different on screen and sound different to a reader, which is what lets
   someone tell an unmeasured task from one that has not started.
2. **An out-of-range or unusable value never silently becomes Indeterminate.** `NaN`, a
   negative value and a `max` of 0 are all drawn as 0 with `data-out-of-range` set and a
   warning in dev. Falling back to the animation would hide a consumer's broken arithmetic
   behind a bar that looks busy.

## Cost of reversal

Adding an `indeterminate` prop later is additive and cheap. Removing the meaning of an absent
`value` is not: every consumer binding a `number | undefined` would change behaviour silently,
from an animated bar to an empty one, with nothing failing to announce it.
