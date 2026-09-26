# Tooltip

A floating description of the element it is written inside — its **Anchor**. Floating UI
handles placement, and the tooltip is teleported to `body` so no overflow ancestor clips it.
With `interactive` it becomes an **Interactive Tooltip**: a preview that can hold buttons and
that a touch Tap opens instead of activating the Anchor. The terms are defined in
[CONTEXT.md](../../../../CONTEXT.md).

This file is how to **use** it. For why it is built this way — one component for both modes,
how a Tap is told apart from a drag, why the Anchor's click is cancelled — see
[DESIGN.md](./DESIGN.md).

```vue
<template>
  <button class="btn btn-primary">
    Save
    <Tooltip placement="bottom">
      Saves a draft. Nothing is sent.
    </Tooltip>
  </button>
</template>
```

> **Client only.** The file is `Tooltip.client.vue`, so it renders nothing during SSR. The
> Anchor is found on mount, so it has to exist by then.

## Props

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `target` | `true \| string \| HTMLElement` | `true` | The Anchor. `true` is the parent element, a string is a CSS selector, or pass the element. |
| `attachTo` | `string` | `'body'` | Teleport destination. An empty string renders in place. |
| `placement` | `'top' \| 'bottom' \| 'left' \| 'right'` | `'top'` | Preferred side. Flips and shifts to stay on screen. |
| `animate` | `string` | `'popover'` | Vue transition name. |
| `delay` | `number` | `200` | Hover/focus show delay, in ms. Skipped when another tooltip is already showing (except for a touch press). A Tap and `v-model` open immediately. |
| `hideDelay` | `number` | `0` | Delay before hiding, in ms. Re-entering the Anchor in that window cancels the hide. |
| `offset` | `number` | `8` | Gap between the Anchor and the tooltip, in px. |
| `disabled` | `boolean` | `false` | Never opens, and closes if open — e.g. while the Anchor is dragged. |
| `followCursor` | `boolean \| 'x' \| 'y'` | — | Position against the cursor. `true` floats freely (and cannot be hovered); `'x'`/`'y'` slide along one axis, pinned to the Anchor's edge. Ignored when `interactive`. |
| `interactive` | `boolean` | `false` | Make it an Interactive Tooltip. See below. |
| `modelValue` | `boolean` | — | Open state. See below. |

Attributes you put on `<Tooltip>` — `class`, `style` and the rest — land on the tooltip
surface (`.tooltip`), not on a wrapper.

## Open state

Uncontrolled by default. `v-model` works **alongside** the Anchor's listeners, not instead
of them: setting it `true` opens the tooltip immediately, and hovering off the Anchor still
closes it. `update:modelValue` emits `true` on open and emits `false` only once the leave
transition has finished.

There is no manual-only mode.

## Slots

| Slot | Props | Content |
| --- | --- | --- |
| `default` | `hide: () => void` | The tooltip's content. Call `hide` from an action inside an Interactive Tooltip. |

## Interactive Tooltip

```vue
<script setup lang="ts">
const emit = defineEmits<{ edit: [], remove: [] }>()
</script>

<template>
  <button class="event" @click="emit('edit')">
    Standup
    <Tooltip v-slot="{ hide }" interactive>
      <p>09:30 – 09:45</p>
      <button class="btn btn-text" @click="hide(); emit('remove')">
        Delete
      </button>
    </Tooltip>
  </button>
</template>
```

| Input | Plain tooltip | `interactive` |
| --- | --- | --- |
| Mouse hover / focus | Opens after `delay`; can be hovered into | Same |
| Mouse click on the Anchor | Activates the Anchor, closes the tooltip | Same |
| Touch: quick tap | Nothing shows; the Anchor activates | **Opens at once; the Anchor does *not* activate** |
| Touch: press and hold | Shows while held, hides on release | Treated as a Tap once released |
| Touch: drag from the Anchor | Hides | Opens nothing (and closes an open one); the Anchor's own drag handling is untouched |
| Second Tap on the Anchor | — | Closes; the Anchor still does not activate |
| Press outside | — | Closes, **and** the press still does whatever it would have done |
| Escape | Closes | Closes |

A Tap is a touch released less than `TAP_SLOP_PX` (4px, from `useTouchPress.ts`) from
where it started, however long it was held.

## Accessibility

- **Plain tooltip:** the surface is `role="tooltip"`, and the Anchor gets
  `aria-describedby` pointing at it while it is open. It never takes focus.
- **Interactive Tooltip:** no `role` and no `aria-describedby` — it is a preview, not a
  description. **It is mouse and touch only.** Keyboard focus on the Anchor shows it, but
  Tab moves on to the next element, and the tooltip closes on blur. Every action inside it
  must also be reachable through the Anchor (for example, the edit dialog the Anchor opens).

## Styling

Global styles live in this component's `<style>` block:

| Class | What |
| --- | --- |
| `.tooltip-container` | The positioned element: `z-index: 9000`, `max-width: 95vw`, `max-height: 65vh`, `white-space: pre-line`, `overflow-wrap: break-word`. |
| `.tooltip-follow-cursor` | On the container instead of `hit-area` while `followCursor` is `true`: `pointer-events: none`, which is why that variant cannot be hovered. |
| `.tooltip` | The surface: padding. Carries your attributes. |
| `.tooltip-dark` | The surface theme: background, border, radius, shadow. Always applied. |
| `.arrow` | The SVG arrow; its fill and stroke follow `.tooltip-dark`. |

The container also carries `hit-area`, a shared utility from
`app/assets/css/components/hit-area.css`. The component sets one `--hit-area-*` variable
to `-offset`, bridging the gap so the pointer can travel from the Anchor into the tooltip
without crossing dead space.

## Gotchas

- **Escape is taken by the tooltip.** While one is open, its `keydown` handler calls
  `stopImmediatePropagation`, so an Escape handler registered later on `document` (a dialog,
  say) doesn't see that press.
- **Wheel scrolling does not close an Interactive Tooltip.** It repositions with the Anchor.
  Only a press closes it.
- **A `target` selector is resolved once**, on mount and whenever `target` changes. An
  element rendered later is not found, and the tooltip logs a `console.error`.
- **`followCursor` on touch** takes the position of the initial press only. Tracking follows
  `mousemove`.
