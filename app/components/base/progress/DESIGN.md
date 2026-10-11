# ProgressBar — design

Why this component is built the way it is. For how to *use* it — props, the slot, styling —
see [README.md](./README.md).

Terms in Title Case are defined in [CONTEXT.md](../../../../CONTEXT.md). The architectural
decision lives in
[ADR-0011](../../../../docs/adr/0011-progress-bar-indeterminate-is-the-absence-of-a-value.md).

## Purpose

Replace PrimeVue's `ProgressBar` in `tiptap/InsertImageToolbar.vue`, the one consumer that
shows progress in this repo. PrimeVue is being dropped, and that consumer had already outgrown
it: it turned `showValue` off and hand-rolled a readout beside the bar, because PrimeVue draws
the label inside the Fill and that bar is 4px tall.

The migration also fixed a bug nobody had noticed. The readout next to the bar was the string
`99%`, hardcoded, beside a Fill that was correctly animating to the real percentage. Nobody
uploading a file has ever seen a true number there.

## A task, not a measurement

ARIA splits what looks like one widget into `role="progressbar"` — how far a task has got —
and `role="meter"` — a measurement inside a known range. They render identically and behave
differently: a meter can go down, never ends, and cannot be indeterminate.

This is a progressbar. A battery or disk-usage bar is a separate component, and the reason to
keep them apart is the reason the Slider's `README` gives for not being a progress bar: a
component that means two things carries two sets of rules, and nothing keeps either honest.

## A sibling of the Slider, not a relative

The Slider and this share a visual idea and no code. The overlap measured out at about ten
lines of CSS — a rounded, clipped, full-width rectangle with an absolutely-positioned child —
and everything around those ten lines differs.

A Slider's Track is a coordinate space: it exists so a press can be mapped to a value, which
is why that component holds a ref to it and reads `getBoundingClientRect()`. Here it is a
rectangle, and nothing measures it. A Slider's Fill spans Origin → Thumb or Thumb → Thumb;
this one always starts at the start.

So the two share **vocabulary**: Track, Fill, the `--*-track-height` / `--*-track-color` /
`--*-fill-color` triple, and the `data-slot` hooks. Anyone who has styled one can style the
other without reading anything. Extracting a shared primitive would have coupled two
components whose next changes point in opposite directions — `minGap` and tick slots there,
indeterminate animation here.

## No `label` prop

The Slider has one. This does not, and the difference is not an oversight: `role="slider"`
sits on the Thumb, which attribute fallthrough cannot reach, and in range mode there are two
of them to name. Here the role is on the root, which is exactly where `useAttrs` lands, so
`aria-label` and `aria-labelledby` arrive by themselves. A prop that re-implements an
attribute already arriving is a prop that can disagree with it.

What the prop was also buying is a prompt to think about the name at all. That is recovered
with a dev warning when neither attribute is present, because an unnamed progressbar is
announced as a bare "busy".

## The Readout is drawn, never announced

`role="progressbar"` is one of the roles ARIA marks **children presentational** — the same
rule that applies to `button` and `slider`. Text rendered inside the element is dropped from
the accessibility tree.

So the Readout and `formatValue` are two expressions of one fact, and a consumer who wants
both has to write both. That is not a leak to fix; it is the role's contract, and the
alternative — mirroring slot content into an `aria-describedby` node — would announce the same
number twice.

It is drawn inside the Fill, which means it is clipped at low values and absent while
indeterminate. That trade-off is why it is opt-in: `showReadout` off is the default, and the
one consumer that has an opinion keeps its readout beside the bar instead.

The Track's height is floored at `1lh` when `showReadout` is set, so the combination
"4px bar, readout on" makes the bar grow rather than clipping the text to nothing. The floor
keys on the prop and not on the Readout, so a bar does not change height when its value goes
away.

## Indeterminate is a segment, not a pulse

The whole of the "why no `indeterminate` prop" question is in
[ADR-0011](../../../../docs/adr/0011-progress-bar-indeterminate-is-the-absence-of-a-value.md).
What that ADR does not cover is the animation.

A segment of partial width crossing the Track was chosen over a full-width Fill that pulses or
stripes, because both full-width versions are indistinguishable from a finished task. That is
the one misreading that matters when the task has not started.

`prefers-reduced-motion: reduce` is answered differently here than everywhere else in this
repo. [accordion.css](../../../assets/css/components/accordion.css) and
[Switch.vue](../../../components/switch/Switch.vue) both answer it with `transition: none`,
and that answer does not transfer: a Switch that snaps still reports its state, while an
indeterminate bar with no animation is a motionless stripe reporting nothing. The vestibular
trigger is the translation, so the segment stops travelling and pulses its opacity in place.
It stays at partial width, so it still cannot be read as complete.

## A broken `max` is not repaired

Native `<progress>` falls back to `max="1"` when the attribute is missing or invalid. This
does not: an unusable `max` draws 0, sets `data-out-of-range`, omits `aria-valuemax` and warns
once in dev.

The reason is the failure mode. A silently repaired `max` of 0 produces a bar pinned at 100%,
which is identical to a finished task — the state a consumer is least likely to notice is a
bug. The console is the only place it can be caught early. The warning fires once per *kind* of
fault rather than once per instance: values arrive one per upload chunk, so a warning per
chunk is noise, while a single latch would let a `max` that breaks later go unreported
behind a stale message about a value that has since been fixed.

Clamping itself is not optional here, and this is where the component parts company with
[ADR-0007](../../../../docs/adr/0007-calendar-never-mutates-its-model.md) and the Slider's
"rendered, never corrected" rule. Those components own a model they can decline to write to.
Progress flows one way, so there is no model to leave alone — only a Fill that cannot be 150%
wide and an `aria-valuenow` that ARIA forbids from leaving the declared range.

## Dev-only code, and why it is testable

The warnings are guarded by `import.meta.dev || import.meta.env.DEV`. The second half is not
redundancy: `import.meta.dev` is `false` under vitest, where `import.meta.env.DEV` is the true
one. Both are compile-time literals, so a production build still drops the block, and the
warnings stay covered by `ProgressBar.spec.ts` instead of being code nobody ever runs.

## Deliberately not built

Each of these is absent because no consumer wants it, and a capability with no consumer has
nothing keeping it honest:

- **`data-complete` and a `complete` event.** The consumer set the value; it knows.
- **A buffer or secondary value**, the video-player band behind the Fill.
- **Striped or segmented variants.**
- **A `severity` prop.** `--progress-fill-color` takes any colour, including the ones an enum
  would not have.
- **Never animating backwards.** The only backwards case would be a reset, and the one
  consumer resets in the same statement that unmounts the bar, so the reverse transition never
  renders. It is a `watch` and a data attribute away if a bar is ever reused across runs.
- **RTL.** The configured locales are `en` and `ja`. Logical properties are used where they
  cost nothing, but the indeterminate slide is not mirrored and nothing tests it.
