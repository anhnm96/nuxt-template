# ProgressBar

A bar reporting how far a task has got. Use it for an upload, an import, a multi-step job —
anything that starts, runs and ends.

Do not use it for a measurement inside a known range. A battery level, a disk quota or a
password-strength score is a *meter*: it can go down, it never finishes, and "indeterminate"
means nothing for it. That is a different component, and it does not exist yet.

Terms in Title Case are defined in [CONTEXT.md](../../../../CONTEXT.md). For why the component
is built this way, see [DESIGN.md](./DESIGN.md). The architectural decision lives in
[ADR-0011](../../../../docs/adr/0011-progress-bar-indeterminate-is-the-absence-of-a-value.md).

## Shape

```
base/progress/
  ProgressBar.vue   role="progressbar" on the root, a Track, a Fill, an optional Readout
```

One file, and no model: Progress flows one way. There are no events.

## Basic

```html
<ProgressBar :value="percent" aria-label="Uploading image" />
```

`value` runs from 0 to `max`, and `max` defaults to 100 — so a percentage needs nothing else.
A consumer holding domain numbers passes them intact instead:

```html
<ProgressBar :value="done" :max="total" aria-label="Files uploaded" />
```

## Indeterminate

**Omit `value`.** There is no `indeterminate` prop:

```html
<ProgressBar aria-label="Loading" />
```

A segment slides across the Track on a loop. Under `prefers-reduced-motion: reduce` it stops
travelling and pulses in place instead — removing the animation entirely would leave a
motionless stripe reporting nothing.

**A value of 0 is not indeterminate.** A known zero draws an empty Track and announces 0. Mind
the difference when binding a `ref<number>()` that starts undefined: until the first value
arrives, the bar is indeterminate. See
[ADR-0011](../../../../docs/adr/0011-progress-bar-indeterminate-is-the-absence-of-a-value.md).

## The Readout

Off by default. `showReadout` draws the percentage *inside* the Fill:

```html
<ProgressBar :value="percent" show-readout aria-label="Upload" />
```

Two things follow from where it sits:

- **It is clipped until the Fill is wide enough.** At 0% there is nothing to see. That is the
  cost of drawing it inside the Fill; a readout that must be visible from the start belongs
  beside the bar, in your own layout.
- **The Track grows to `1lh`** so the text has room, overriding a smaller
  `--progress-track-height`. Setting `show-readout` on a 4px bar makes the bar taller rather
  than making the text invisible.

Nothing is drawn while indeterminate — the segment is moving, and nobody reads a travelling
word.

## Slot

| Slot | Props | |
| --- | --- | --- |
| `default` | `value`, `max`, `percent` | The Readout's content |

All three are numbers, never `undefined`: the slot renders only when there is a value. It is
gated by `showReadout`, so a slot without that prop renders nothing.

```html
<ProgressBar :value="done" :max="total" show-readout aria-label="Files">
  <template #default="{ value, max }">{{ value }} / {{ max }}</template>
</ProgressBar>
```

**A screen reader never hears this.** `role="progressbar"` makes its children presentational,
so slot content is dropped from the accessibility tree. Say it again through `formatValue`.

## Props

| Prop | Type | Default | |
| --- | --- | --- | --- |
| `value` | `number` | | Omit for Indeterminate |
| `max` | `number` | `100` | The Progress at complete |
| `showReadout` | `boolean` | `false` | Draws the Readout inside the Fill |
| `formatValue` | `(value: number, max: number) => string` | | Produces `aria-valuetext` |

There is no `label` prop. `role="progressbar"` sits on the root, so `aria-label` and
`aria-labelledby` reach it through ordinary attribute fallthrough — unlike the Slider, whose
role sits on a Thumb the call site cannot address. Supply one: an unnamed progress bar is
announced as a bare "busy", and the component warns in dev when neither is present — an
empty string counts as absent, because a reader ignores `aria-label=""`.

`formatValue` receives the **clamped** value, which is the reason it exists rather than a
hand-written `aria-valuetext`: the two would disagree whenever a value is out of range.

## Out of range

A value outside `0..max` is clamped for the Fill and for `aria-valuenow`, the root gets
`data-out-of-range`, and dev gets one warning per kind of fault. The same path handles `NaN`, and a `max` that
is not a finite positive number draws 0 — it is **not** replaced with a default, because a
silently repaired `max` is how wrong arithmetic ships.

## Styling

```html
<ProgressBar :value="percent" style="--progress-track-height: 0.25rem" />
```

| Property | Default | |
| --- | --- | --- |
| `--progress-track-height` | `0.5rem` | Floored at `1lh` when `showReadout` is set |
| `--progress-track-color` | `surface-inverted` at 20% | The unfilled Track |
| `--progress-fill-color` | `var(--color-primary)` | The Fill |
| `--progress-readout-color` | `var(--color-surface)` | The Readout's text |

There is no `severity` prop. Colour is the consumer's, which makes the failure case one line:

```html
<ProgressBar :value="percent" :style="{ '--progress-fill-color': failed ? 'var(--color-error)' : undefined }" />
```

**Styling hooks:** `data-slot="progress"`, `"progress-track"`, `"progress-fill"`,
`"progress-readout"`, plus `data-indeterminate` and `data-out-of-range` on the root.

## Accessibility

- `role="progressbar"` on the root, with `aria-valuemin="0"`, `aria-valuemax` and
  `aria-valuenow`. `formatValue` adds `aria-valuetext`.
- **Indeterminate omits `aria-valuenow` entirely.** It does not send 0, which would announce
  "0 percent" — a claim about a task nobody is measuring.
- `aria-valuemax` is omitted when `max` is unusable, so a reader falls back to the ARIA
  default rather than hearing a nonsense bound.
- The bar is not a live region. Readers announce `progressbar` updates on their own terms, and
  a polite live region here would read every percentage out loud.
