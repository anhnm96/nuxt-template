# Button

A `<button>` that carries the `btn` class, an optional label and up to two icons, and a loading
state that covers its own content. It adds no variant prop: appearance comes from the `btn-*`
classes in [`app/assets/css/components/button.css`](../../../assets/css/components/button.css),
which a plain `<button class="btn btn-primary">` can use just as well. Reach for this component
when you want the loading state, the icon slots or the `aria-disabled` guard.

This file is how to **use** it. For why it is built this way — the click guard's contract with
the stylesheet, the live region, the icon margins and the two icon props — see
[DESIGN.md](./DESIGN.md).

```vue
<template>
  <Button class="btn-primary" label="Save" icon="ph:check" @click="save" />
</template>
```

> The root element is a `<button>` with `type="button"`, so it never submits a surrounding
> form by accident. Pass `type="submit"` to override it.

## Icons

`icon` renders before the label, `trailingIcon` after it. Both take either an icon name or an
option object, and a button may carry both at once.

```vue
<template>
  <Button
    class="btn-outline"
    label="Download"
    icon="file-icons:microsoft-excel"
    :trailing-icon="{ name: 'mingcute:download-2-line', class: 'text-xl' }"
    @click="download"
  />
</template>
```

An icon beside a label opens a gap towards the label and takes one step off the padding on its
own side, because the glyph carries its own whitespace. An icon with no label gets neither, so
an icon-only button stays symmetric. All four margins are logical, so they follow `dir`.

The option object takes `name`, `size` and `class`. With no `size`, the icon takes its size
from the surrounding font.

## Loading

`loading` covers the content with a spinner, blocks pointer input, marks the button
`aria-busy`, and drops any click before it reaches your handler.

```vue
<template>
  <Button class="btn-primary" label="Save" :loading="saving" @click="save" />
</template>
```

While loading, the label is hidden from the accessibility tree and `loadingMsg` becomes the
button's accessible name. Set `loadingMsg` to describe the work in progress; it defaults to
`'processing, wait...'`.

Loading does not stop keyboard focus, and it does not set `aria-disabled`. The button keeps its
full-strength colours rather than dimming.

## Props

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `label` | `string` | — | Text between the two icons. Ignored when you fill the default slot. |
| `icon` | `IconOption \| string` | — | Icon before the label. |
| `trailingIcon` | `IconOption \| string` | — | Icon after the label, for an affordance such as a disclosure chevron. |
| `loading` | `boolean` | `false` | Covers the content with a spinner and swallows clicks. |
| `loadingMsg` | `string` | `'processing, wait...'` | Announced while loading, and the accessible name for that period. |
| `contentClass` | `string \| string[]` | — | Classes for the element that wraps the label and icons. |

`IconOption` is `{ name: string, size?: string | number, class?: string | string[] }`.

## Events

| Event | Payload | When |
| --- | --- | --- |
| `click` | `MouseEvent` | The user clicks the button while it is neither loading nor `aria-disabled="true"`. The component passes the native event through, so `@click.stop` and `@click.prevent` work. |

## Slots

| Slot | Props | Content |
| --- | --- | --- |
| `default` | — | Replaces the label **and both icons**. The loading spinner still applies. |

## Accessibility

The root is a native `<button>`, so it keeps the button role, focus and Enter/Space activation
without extra code.

Mark a button unavailable with `aria-disabled="true"` rather than `disabled` when it must stay
focusable; the component drops the click and the stylesheet dims it. Native `disabled` also
works and stops the event in the browser.

A button with no label and no slot text has no accessible name. Give an icon-only button an
`aria-label`.

## Styling

Pass a `btn-*` class from the stylesheet. The component contributes only `btn` and the loading
layout, so every class below composes with it.

| Group | Classes |
| --- | --- |
| Solid | `btn-primary`, `btn-info`, `btn-success`, `btn-warn`, `btn-error`, `btn-neutral` |
| Text | `btn-text`, `btn-text-primary`, `btn-text-info`, `btn-text-success`, `btn-text-warn`, `btn-text-error` |
| Outline | `btn-outline`, `btn-outline-primary`, `btn-outline-info`, `btn-outline-success`, `btn-outline-warn`, `btn-outline-error` |
| Other | `btn-link`, `btn-static` |
| Size | `btn-sm`, `btn-lg`, `btn-xl`, `btn-icon` |

A button that stays on — a toolbar toggle — is
[ToggleButton](../toggle-button/README.md). It draws its pressed state from
`[aria-pressed="true"]` rather than from a class, so it composes with every variant above.

`btn-icon` is for an icon-only button; it makes the padding square and drops the label padding.

A press scales the button to `0.96` and releases over 150ms. `btn-static` turns that off for a
button where the movement would distract, such as one that repeats quickly. A disabled button
never scales, and neither does any button under `prefers-reduced-motion: reduce`.

A size class always wins over a variant class, in either order.

## Gotchas

**The default slot replaces the icons too.** `label`, `icon` and `trailingIcon` are the slot's
fallback content, so filling the slot discards all three.

**Icons in the slot get different spacing.** Prop icons sit 8px from the label; children you
put in the slot get the 4px `gap-1` only, and no padding trim. Use the props where you can.

**The label shifts when an icon appears on an over-wide button.** On a button wider than its
content — `min-w-20`, `w-full`, a grid cell — the button centres its content, so adding an icon
moves the label by half the icon's footprint. An auto-width button does not move.
`justify-start` holds the label still for a *trailing* icon; for a leading icon it doubles the
movement, because the icon then sits between the leading padding and the label.

**Only `aria-disabled="true"` counts.** A bare `aria-disabled`, which renders as `""`, leaves
the button live, because that is also what the stylesheet dims on.
