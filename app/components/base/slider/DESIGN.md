# Slider — design

Why this component is built the way it is. For how to *use* it — props, slots, keyboard,
a11y — see [README.md](./README.md).

Terms in Title Case are defined in [CONTEXT.md](../../../../CONTEXT.md). The architectural
decision lives in
[ADR-0010](../../../../docs/adr/0010-slider-thumbs-cross-and-the-model-is-sorted.md).

## Purpose

Replace the previous `base/Slider.vue`, which had one consumer — the brightness popover in
`konva/EditImage.vue` — and had drifted out of step with it. That consumer was passing
`expand-on-hover` and filling `#left` and `#right` slots that the component no longer had, so
the popover was rendering a bare bar with neither icons nor hover growth.

That single consumer still sets most of the ceiling: `-100..100`, a Fill that should grow from
the centre, no Thumb, and a repaint cost per update that made the old code carry a
`throttle(…, 10)` on everyone's behalf. Range was added because a price filter is known work,
not speculation.

## Hand-rolled, not `<input type="range">`

[CONTEXT.md](../../../../CONTEXT.md) already says this library is hand-rolled, so this is the
house default rather than a decision. It is still worth naming what native could not have
done: two Thumbs, a Fill growing from an Origin, a Thumb hidden without losing focus, and a
press that does not jump. Three of the four are load-bearing here.

The cost is that the keymap, every ARIA attribute, the Tab stop and the disabled rules are
ours, which is what `Slider.spec.ts` exists to hold still.

The gesture itself is **not** ours. [usePointerDrag](../../../composables/usePointerDrag.ts)
already had pointer capture, `pointercancel` handling, pointerId matching and scope-dispose
cleanup. The old Slider hand-rolled a `window.addEventListener` pair with none of them, so a
`pointercancel` left the listener attached and the component stuck in its panning state.

One rule sits on top of it: **only the primary pointer drives the Slider.** A second finger
landing mid-drag used to reassign the Driven Thumb and the drag origin underneath the first,
which then carried on dragging a Thumb it never touched.

The guard keys on `event.isPrimary` rather than on "a drag is already registered", and the
difference matters. A drag whose `pointerup` never arrives — the window loses focus while the
button is down — leaves that registered state set with nothing to clear it, so rejecting on it
makes the first lost `pointerup` the last press the Slider ever answers. `isPrimary` is a
property of the event, so a fresh press always gets through; it then calls `drag.stop()` to
release the stale gesture, because `usePointerDrag.start()` is a no-op while one is registered
and the new press would otherwise jump without ever tracking.

## The Thumbs cross, and the model is sorted

The whole of this is in
[ADR-0010](../../../../docs/adr/0010-slider-thumbs-cross-and-the-model-is-sorted.md). The part
to know before editing this file: **a Driven Thumb is never reconciled from the model**, where
driven means dragged *or* holding DOM focus.

The focus half looks redundant and is not. A consumer bound with `:model-value` + `@change`
does not update the model until the gesture ends, and the keyboard has no gesture end — so
without the focus clause, every arrow press would move the Thumb and the next reactive tick
would snap it back to the stale value.

## The ends of the Track are always reachable

Native snaps from `min` in `step` units and lets `max` fall off the grid: `<input type="range"
min="0" max="999" step="50">` cannot produce 999.

Here `min` and `max` join the grid as candidates and the nearest wins, so both ends are always
selectable and only the final step is short. A component that quietly refuses to emit one of
the consumer's own declared bounds is more surprising than an uneven last step — and in range
mode an upper Thumb that cannot reach the top of the range reads as broken.

This is a deliberate divergence from native. It is cheap to reverse, which is why it is a note
here rather than an ADR.

It also sets how snapped values are rounded. Because the grid is *offset* by `min` and the
ends are grid candidates, a legitimate value can carry more decimals than `step` does — so the
rounding precision is taken from `step`, `min` **and** `max` together, and the result is
clamped once more afterwards. Taking it from `step` alone turned `max: 10.5` into 11, which the
Slider then emitted: a value outside its own bounds. `Slider.spec.ts` covers the fractional
cases, because every grid in the original tests started at an integer `min` and none of them
could see it.

## `thumb: false` still has a Thumb

The prop means "not drawn at rest". The element keeps `role="slider"`, its Tab stop and its
keyboard, because it is the only thing carrying `aria-valuenow` and, in range mode, the only
way to address one of the two values.

Two consequences, both deliberate:

- **Keyboard focus draws it anyway.** A focused control with no visible indicator fails WCAG
  2.4.7. A ring around the Track would satisfy the letter of that and fail the point: in range
  mode it looks identical whichever Thumb is focused, so a keyboard user cannot tell which
  value the arrow keys are about to change.
- **It gets no hit area** (`pointer-events: none`), so every press lands on the Track. That is
  what makes the iOS feel work, and it is why `focusThumb` passes `focusVisible: false` —
  Chromium forces `:focus-visible` on a script-driven `focus()`, which would otherwise reveal
  the Thumb on a plain mouse press. `Radio.vue` documents the same trap for the same reason.

## No throttle

The old code throttled `pointermove` at 10ms for EditImage's benefit. Browsers already coalesce
`pointermove` to roughly one event per frame, so that throttle was close to a no-op at 60Hz,
*not* a no-op at 120Hz — where it dropped every other frame — and it made the value lag the
finger at release either way.

The cadence is now native's: `update:modelValue` throughout, `change` once per gesture. An
expensive consumer binds `@change` and makes the trade-off at the call site that knows what it
costs. EditImage does exactly that, and its Konva filter now runs once per drag.

`change` compares against the value the gesture started from and stays silent when nothing
moved. That is not tidiness: emitting it unconditionally meant a key held at `max` fired one
`change` per repeat, each re-running EditImage's full-image filter — the exact cost `change`
exists to avoid.

## Deliberately not built

Each of these is absent because no consumer wants it yet, and a capability with no consumer
has nothing keeping it honest:

- **Vertical orientation.** A second axis through every coordinate calculation.
- **A `#thumb` slot** and the value bubble it would carry. Easy to add; impossible to remove
  once something depends on its scope.
- **`minGap`** between two Thumbs.
- **Tick rendering.** The default slot plus `percentOf` covers it with markup the consumer
  owns.
- **`largeStep` as a prop.** Derived as a tenth of the span, which is only wrong for a
  consumer who needs exactly-N presses.
- **`readonly`.** Native ignores it on a range input, so the web has no established meaning
  for it here.
