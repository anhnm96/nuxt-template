# Switch

An on/off control whose change takes effect at once — show a form, enable notifications,
turn a filter on.

Do not use it for something a form submits later. That is a checkbox: it states an intention,
it can be required, and it can be one of a set. See [Checkbox.vue](../../Checkbox.vue).

Terms in Title Case are defined in [CONTEXT.md](../../../../CONTEXT.md). For why the component
is built this way, see [DESIGN.md](./DESIGN.md).

## Shape

```
base/switch/
  Switch.vue   role="switch" on the root, which is also the Track, plus a Thumb and an optional Readout
```

One file. A Switch has two states and no arithmetic.

## Basic

```html
<Switch v-model="enabled" aria-label="Email notifications" />
```

`v-model` is a `boolean` and defaults to `false`.

## The accessible name

**Supply one.** There is no `label` prop, and there cannot be a useful one:

- The root is a `<button>`, and a `<label>` element cannot name a button.
- `role="switch"` takes its name from the author, never from its content, so the Readout
  cannot name it either.

So `aria-label` or `aria-labelledby` is the only way, and both reach the root through ordinary
attribute fallthrough. The component warns in dev when neither is present — an empty string
counts as absent, because a reader ignores `aria-label=""`.

When the name is already on screen, point at it rather than repeating it:

```html
<p :id="`${id}-notifications`">Email notifications</p>
<Switch v-model="enabled" :aria-labelledby="`${id}-notifications`" />
```

## The Readout

Off by default. `readout` draws one string per state inside the Track:

```html
<Switch v-model="enabled" :readout="{ checked: 'ON', unchecked: 'OFF' }" aria-label="Notifications" />
```

Both strings are always in the layout, one of them transparent, so the Switch is as wide as
the longer of the two and does not resize when toggled.

**A screen reader never hears this.** `role="switch"` makes its children presentational. The
Readout is decoration beside the Thumb; the state is announced through `aria-checked`, which
a reader reports by itself.

## Props

| Prop | Type | Default | |
| --- | --- | --- | --- |
| `modelValue` | `boolean` | `false` | `v-model` |
| `readout` | `{ checked: string, unchecked: string }` | | Drawn inside the Track, never announced |
| `disabled` | `boolean` | `false` | Sets the native attribute, so it also leaves the tab order |

There is no `change` event. `update:modelValue` fires at the same moment with the same
payload — unlike the Slider, where `change` means "the gesture ended" and is genuinely a
different moment.

## Styling

```html
<Switch v-model="on" style="--switch-height: 2rem" aria-label="Big" />
```

| Property | Default | |
| --- | --- | --- |
| `--switch-height` | `1.5rem` | Drives the four derived properties below |
| `--switch-padding` | `0.25rem` | The inset between the Thumb and the Track's edge |
| `--switch-thumb-size` | `height − 2 × padding` | |
| `--switch-min-width` | `height × 1.8` | A floor; a Readout pushes it wider |
| `--switch-readout-size` | `height × 0.42` | The Readout's font size |
| `--switch-track-color` | slate-500 / slate-600 | The Track, unchecked |
| `--switch-track-color-checked` | `var(--color-primary)` | The Track, checked |
| `--switch-foreground` | `var(--color-white)` | The Thumb and the Readout, unchecked |
| `--switch-foreground-checked` | `var(--color-surface)` | The Thumb and the Readout, checked |

Setting `--switch-height` alone keeps everything in proportion. Override a derived property
to break the ratio.

The two colour pairs move together: set a Track colour and set the foreground that goes on
it. `--switch-foreground-checked` defaults to `var(--color-surface)` because that is what
`.btn-primary` puts on the same background. A Track colour dark enough for white wants
`--switch-foreground-checked: var(--color-white)` back again.

**Check the contrast when you change a Track colour.** Against the configured primary the
defaults measure 7.6:1 and 10:1 in dark mode, and 4.8:1 and **2.2:1** in light — that last one
is the primary itself, which `.btn-primary` renders white text on for the same number. The
Switch follows the button rather than going its own way; if it matters for a particular
Switch, one declaration fixes it:

```html
<Switch v-model="on" style="--switch-foreground-checked: var(--color-slate-900)" aria-label="Legible" />
```

The Thumb and the Readout share one foreground. Where they genuinely need to differ, the
`data-slot` hooks take a rule of their own.

The width is not a custom property: the root is a `<button>`, so `class="w-24"` or
`style="width: 12rem"` reaches it directly.

**Styling hooks:** `data-slot="switch"`, `"switch-thumb"`, `"switch-readout"`, plus
`[aria-checked='true']` and `:disabled` on the root.

## Accessibility

- `role="switch"` on the root with `aria-checked`. **The stylesheet selects on the same
  attribute**, so what is drawn and what is announced cannot drift apart.
- `type="button"`, so a Switch inside a form does not submit it.
- `disabled` uses the native attribute, which also removes the Switch from the tab order. A
  Switch that must stay reachable while inert is not supported.
- There is no RTL override, because nothing in the component names a physical direction. The
  Thumb travels along `inset-inline-start`.
