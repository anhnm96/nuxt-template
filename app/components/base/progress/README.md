# ProgressBar

A bar reporting how far a task has got. Use it for an upload, an import, a multi-step job —
anything that starts, runs and ends.

Do not use it for a measurement inside a known range. A battery level, a disk quota or a
password-strength score is a *meter*: it can go down, it never finishes, and "indeterminate"
means nothing for it. That is a different component, and it does not exist yet.

Terms in Title Case are defined in [CONTEXT.md](../../../../CONTEXT.md). For why the component
is built this way, see [DESIGN.md](./DESIGN.md).

```html
<ProgressBar :value="percent" aria-label="Uploading image" />
```

`value` runs from 0 to `max`, and `max` defaults to 100 — so a percentage needs nothing else.
A consumer holding domain numbers passes them intact instead:

```html
<ProgressBar :value="done" :max="total" aria-label="Files uploaded" />
```

> **Supply an accessible name.** There is no `label` prop; `role="progressbar"` sits on the
> root, so `aria-label` and `aria-labelledby` reach it through ordinary attribute fallthrough.
> An unnamed bar is announced as a bare "busy", and a development build warns when neither is
> present. An empty string counts as absent, because a reader ignores `aria-label=""`.

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
arrives, the bar is indeterminate.

## The Readout

Off by default. `showReadout` draws the percentage *inside* the Fill:

```html
<ProgressBar :value="percent" show-readout aria-label="Upload" />
```

The default slot replaces the text, and gets the numbers to build your own:

```html
<ProgressBar :value="done" :max="total" show-readout aria-label="Files">
  <template #default="{ value, max }">{{ value }} / {{ max }}</template>
</ProgressBar>
```

Three things follow from where the Readout sits:

- **It is clipped until the Fill is wide enough.** At 0% there is nothing to see. A readout
  that must be visible from the start belongs beside the bar, in your own layout.
- **The Track grows to `1lh`** so the text has room, overriding a smaller
  `--progress-track-height`. Setting `show-readout` on a 4px bar makes the bar taller rather
  than making the text invisible.
- **Nothing is drawn while indeterminate** — the segment is moving, and nobody reads a
  travelling word.

## Out of range

A value outside `0..max` is clamped for the Fill and for `aria-valuenow`, the root gets
`data-out-of-range`, and a development build warns once per kind of fault. The same path
handles `NaN`.

A `max` that is not a finite number above 0 draws 0. It is **not** replaced with a default,
because a silently repaired `max` is how wrong arithmetic ships.

## API

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `value` | `number` | — | How far the task has got. Omit it for Indeterminate. |
| `max` | `number` | `100` | The Progress at complete. |
| `showReadout` | `boolean` | `false` | Draws the Readout inside the Fill. |
| `formatValue` | `(value: number, max: number) => string` | — | Produces `aria-valuetext`. |

No events, and no model: Progress flows one way.

| Slot | Props | Content |
| --- | --- | --- |
| `default` | `value`, `max`, `percent` | The Readout's content. Defaults to the rounded percentage. |

All three slot props are numbers, never `undefined`: the slot renders only when there is a
value. It is gated by `showReadout`, so a slot without that prop renders nothing.

`formatValue` receives the **clamped** value, which is why it exists rather than a
hand-written `aria-valuetext` on the call site: the two would disagree whenever a value is out
of range.

## Accessibility

- `role="progressbar"` on the root, with `aria-valuemin="0"`, `aria-valuemax` and
  `aria-valuenow`. `formatValue` adds `aria-valuetext`.
- **Indeterminate omits `aria-valuenow` entirely.** It does not send 0, which would announce
  "0 percent" — a claim about a task nobody is measuring.
- `aria-valuemax` is omitted when `max` is unusable, so a reader falls back to the ARIA
  default rather than hearing a nonsense bound.
- **A screen reader never hears the Readout.** `role="progressbar"` makes its children
  presentational, so slot content is dropped from the accessibility tree. Say it again through
  `formatValue`.
- The bar is not a live region. Readers announce `progressbar` updates on their own terms, and
  a polite live region here would read every percentage out loud.

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
`"progress-readout"`, plus `data-indeterminate` and `data-out-of-range` on the root and
`data-readout` on the Track.

A worked example is in `pages/playground/progress-bar.vue`.
