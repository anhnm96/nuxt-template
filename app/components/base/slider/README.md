# Slider

A horizontal control for setting a number, or a pair of numbers, by dragging or by keyboard.
Use it for a volume or brightness control, an opacity or zoom setting, or a min–max filter.

Do not use it to *show* a number nobody can change. That is a progress bar, and `thumb: false`
is not a way to build one — the Thumb keeps its Tab stop and its keyboard whatever it looks
like.

Terms in Title Case are defined in [CONTEXT.md](../../../../CONTEXT.md). For why the component
is built this way, see [DESIGN.md](./DESIGN.md). The architectural decision lives in
[ADR-0010](../../../../docs/adr/0010-slider-thumbs-cross-and-the-model-is-sorted.md).

## Shape

```
base/slider/
  Slider.vue      one role="slider" element per Thumb, usePointerDrag, the keymap
```

One file. There is no context, no child component and no composable: a Slider has no parts a
consumer composes, so there is nothing for a seam to separate.

## Basic

```html
<Slider v-model="volume" label="Volume" />
<Slider v-model="brightness" :min="-100" :origin="0" label="Brightness" />
```

`origin` is where the Fill grows from. It defaults to `min`, so a Fill normally starts at the
left edge; set it to `0` on a `-100..100` control and the Fill grows outward from the centre.

## Range

```html
<Slider
  v-model="price"
  range
  :max="1000"
  :step="50"
  label="Price"
  :format-value="(value) => `¥${value.toLocaleString()}`"
/>
```

`range` narrows `v-model` to `[number, number]`. **The two Thumbs pass through each other**,
and the emitted pair is always sorted, so `[low, high]` destructuring is safe. The accessible
names follow order rather than identity: after a cross, the Thumb you are holding is announced
as the maximum, because it is.

## iOS look

```html
<Slider v-model="volume" :thumb="false" track-press="ignore" style="--slider-track-height: 1.75rem" />
```

`thumb: false` means **no Thumb is drawn at rest**. It is still there, still focusable, and
keyboard focus draws it anyway — a focused control with no visible indicator fails WCAG 2.4.7.
Under the pointer it has no hit area, so every press lands on the Track.

## Expensive consumers

`update:modelValue` fires on every change during a drag. When each update costs something real
— a canvas filter, a network request — bind `@change` instead, which fires once per gesture:

```html
<Slider :model-value="brightness" :origin="0" :min="-100" @change="brightness = $event" />
```

The Thumb and your value then disagree during the drag, exactly as a native `input`/`change`
pair does. Anyone who needs a live readout *and* cheap rendering throttles on their own side.

## Props

| Prop | Type | Default | |
| --- | --- | --- | --- |
| `modelValue` | `number` \| `[number, number]` | `min` / `[min, max]` | Narrowed by `range` |
| `range` | `boolean` | `false` | Two Thumbs; narrows the model to a pair |
| `min` / `max` | `number` | `0` / `100` | |
| `step` | `number` | `1` | The grid. `0` is continuous |
| `origin` | `number` | `min` | The value the Fill grows from |
| `thumb` | `boolean` | `true` | Whether a Thumb is drawn *at rest* |
| `trackPress` | `'jump' \| 'ignore'` | `'jump'` | What a press on the Track does |
| `disabled` | `boolean` | `false` | Inert, and out of the Tab order |
| `label` | `string` | | The accessible name |
| `rangeLabels` | `[string, string]` | `['minimum', 'maximum']` | Composed with `label` in range mode |
| `formatValue` | `(value: number) => string` | | Produces `aria-valuetext` |

`min` and `max` are always reachable, even when `step` does not divide the span evenly — a
`0..999` Slider at `step: 50` can still emit 999. This diverges from native; see
[DESIGN.md](./DESIGN.md).

An out-of-range or off-grid incoming value is **rendered, never corrected**. The Slider emits
nothing until a user moves it.

## Events

| Event | Fires |
| --- | --- |
| `update:modelValue` | On every value change, continuously during a drag |
| `change` | Once when a gesture ends or a key commits — and only if the value moved |

A key held down at `max`, a tap that lands on the current value, and a drag released where it
began all emit nothing, matching native.

## Slot

| Slot | Props | |
| --- | --- | --- |
| `default` | `values`, `percentOf`, `disabled` | Ticks, labels, anything in the Track's coordinate space |

`percentOf(value)` returns a `'37.5%'` string ready for `left`. It sits outside the Track's
clip, so labels below the Track are not cut off:

```html
<Slider v-model="ticked" :max="1000" :step="100">
  <template #default="{ percentOf }">
    <span
      v-for="tick in [0, 500, 1000]"
      :key="tick"
      class="absolute top-full -translate-x-1/2"
      :style="{ left: percentOf(tick) }"
    >{{ tick }}</span>
  </template>
</Slider>
```

## Styling

Set the custom properties on the Slider or on any ancestor:

```html
<Slider v-model="value" style="--slider-track-height: 0.375rem; --slider-fill-color: var(--color-primary)" />
```

| Property | Default | |
| --- | --- | --- |
| `--slider-track-height` | `0.75rem` | Track thickness; the Thumb derives from it |
| `--slider-track-color` | `surface-inverted` at 20% | The unfilled Track |
| `--slider-fill-color` | `surface-inverted` | The Fill *and* the Thumb |
| `--slider-thumb-size` | `calc(var(--slider-track-height) * 1.5)` | Override to break the ratio |

**Styling hooks:** `data-slot="slider"`, `"slider-track"`, `"slider-fill"`, `"slider-thumb"`,
plus `data-disabled`, `data-dragging` and `data-out-of-range` on the root.

Utility classes cannot reach the Track, Fill or Thumb — they are internal markup, and a scoped
rule outranks a utility class on the same element anyway. The properties above are the
supported route; the `data-slot` hooks are the escape hatch.

## Keyboard

Every key acts on the focused Thumb, and all of them are ignored when `disabled`.

| Key | |
| --- | --- |
| `ArrowRight`, `ArrowUp` | Increase by `step` |
| `ArrowLeft`, `ArrowDown` | Decrease by `step` |
| `PageUp` / `PageDown` | Increase / decrease by a tenth of the span |
| `Home` / `End` | Go to `min` / `max` |

Up increases and down decreases, matching native `<input type="range">` and the APG. At
`step: 0` the arrows move by 1.

## Accessibility

- Each Thumb is a `role="slider"` with `aria-valuemin`, `aria-valuemax`, `aria-valuenow` and
  `aria-orientation`. `formatValue` adds `aria-valuetext`.
- In range mode **both Thumbs report the full `min`/`max`**, not each other's value, because
  they really can cross. See
  [ADR-0010](../../../../docs/adr/0010-slider-thumbs-cross-and-the-model-is-sorted.md).
- `disabled` keeps `aria-disabled` so a virtual cursor still finds the control, but drops the
  Tab stop — matching `disabled` everywhere else in this library.
- When the model holds a value outside the bounds, `aria-valuenow` reports the clamped value,
  because ARIA requires it to sit within the declared range. `data-out-of-range` marks the
  disagreement so a consumer can show it.
