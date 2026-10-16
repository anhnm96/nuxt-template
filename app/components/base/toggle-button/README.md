# ToggleButton

A [`Button`](../button/README.md) that stays on. It reports its state in `aria-pressed`, so a
reader announces "Bold, toggle button, pressed" — one fixed name, plus whether the thing is
already done. Every Button prop, event and class works here unchanged.

This file is how to **use** it. For why it is built this way — the state's owner, the name
rules and the stylesheet's hook — see [DESIGN.md](./DESIGN.md). For why it is a separate
pattern from a button that renames itself, see
[ADR 0013](../../../../docs/adr/0013-toggle-button-reports-state-through-aria-pressed.md).

```vue
<template>
  <ToggleButton v-model="bold" class="btn-text btn-icon" icon="i-fluent:text-bold-16-filled" aria-label="Bold" />
</template>
```

> The name must not change with the state. `aria-pressed` already announces the state, so a
> label that flips from "Mute" to "Unmute" says it twice and contradicts itself. The component
> warns in dev when the name moves. A button that *should* rename itself is a plain
> [`Button`](../button/README.md) with a computed label.

## Who owns the state

Bind `v-model` and the button owns its state:

```vue
<template>
  <ToggleButton v-model="showGrid" label="Grid" />
</template>
```

Bind `model-value` **and** the listener, and the consumer owns it. The button then draws only
what the consumer gives it, so a command that is refused leaves the button unpressed:

```vue
<template>
  <ToggleButton
    :model-value="editor?.isActive('bold')"
    aria-label="Bold"
    @update:model-value="editor?.chain().focus().toggleBold().run()"
  />
</template>
```

That second form is what [`Tiptap.vue`](../../tiptap/Tiptap.vue) uses. A source
that answers `undefined` — an editor that has not mounted — is read as unpressed, and the
attribute is still rendered.

## Naming

An icon-only toggle has no accessible name of its own. Supply one of `label`, `aria-label` or
`aria-labelledby`; the component warns in dev when none of the three arrives, and a `<Tooltip>`
inside the button does **not** count, because it describes the button rather than naming it and
exists only while it is open.

## Props

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `modelValue` | `boolean` | `false` | Whether the button is pressed. `null` and `undefined` read as unpressed. |
| …Button's props | | | `label`, `icon`, `trailingIcon`, `loading`, `loadingMsg` and `contentClass` pass straight through. See [Button](../button/README.md#props). |

## Events

| Event | Payload | When |
| --- | --- | --- |
| `update:modelValue` | `boolean` | The user asks for the opposite of the current state. |
| `click` | `MouseEvent` | The user clicks, while the button is neither loading nor `aria-disabled="true"`. |

## Slots

| Slot | Props | Content |
| --- | --- | --- |
| `default` | — | Replaces the label and both icons, exactly as Button's does. Leave it empty to keep them. |

## Accessibility

The root is Button's native `<button>` with `type="button"`, so the role, focus and
Enter/Space activation come from the platform.

`aria-pressed` is always rendered, including while the button is disabled — a disabled toggle
still has a state, and dropping the attribute would announce a plain button.

Mark a toggle unavailable with `aria-disabled="true"` to keep it focusable, or with `disabled`
to take it out of the tab order. Both block the click, so neither can change the state.

## Styling

Pressed is drawn by `[aria-pressed="true"]` in
[`button.css`](../../../assets/css/components/button.css), not by a class, so the state a reader
hears and the state on screen come from the same attribute.

| On a… | Pressed looks like |
| --- | --- |
| ghost variant (`btn-text`, `btn-outline`, plain `btn`) | fills with its own accent — `btn-text-error` fills red, `btn-text` fills muted — at the step the theme label needs |
| solid variant (`btn-primary` and friends) | deepens to the shade it holds while active, and the label turns white |
| `btn-neutral` | moves two steps toward the middle, because unpressed it already holds the extreme step, and keeps a rim of that step as the border |

Hover and active still answer while pressed, because pressing again turns it off. Every pressed pair
measures 4.69 or better in both themes, and hover and active raise it further; the tables are
under [The pressed fill moves with the theme](./DESIGN.md#the-pressed-fill-moves-with-the-theme).

## Gotchas

**A `<Tooltip>` child is not a name.** It sets `aria-describedby` and renders only while open.
Icon-only toggles need `aria-label` as well.

**One-way binding is optimistic.** Bind `model-value` without `@update:model-value` and the
button falls back to its own state on the first click, which then disagrees with the value you
passed. Bind both, or bind `v-model`.

**An exclusive row is not this component.** Where exactly one of a set is on — a tool picker, a
view switcher — the set has a single value, and each member reporting `aria-pressed`
misdescribes it. Use a radio group or a [Tab](../../tab/Tab.vue).

**`aria-pressed="mixed"` is not supported.** The model is a boolean.
