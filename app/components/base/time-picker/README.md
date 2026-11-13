# TimePicker

A time-of-day field: a masked `HH:MM` input with an hour column and a minute column in a
popover. The user types the time, or picks it from the columns.

Terms in Title Case are defined in [CONTEXT.md](../../../../CONTEXT.md). The field is a
[MaskedInput](../masked-input/README.md)-style mask through `useMask`, and the popover is a
[Popover](../popover/README.md).

```vue
<script setup lang="ts">
const start = ref('')
</script>

<template>
  <TimePicker v-model="start" aria-label="Start time" />
</template>
```

## Props

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `modelValue` | `string` | `''` | `v-model`. A complete 24-hour `HH:mm`, or `''` for no time. |
| `hourStep` | `number` | `1` | The interval between the hours in the hour column. |
| `minuteStep` | `number` | `1` | The interval between the minutes in the minute column. |
| `hoursLabel` | `string` | `'Hours'` | The accessible name of the hour column. |
| `minutesLabel` | `string` | `'Minutes'` | The accessible name of the minute column. |

Other attributes go to the `<input>`, not to the root: `id`, `aria-label`, `disabled`, `class`.

## Events

| Event | Payload | When |
| --- | --- | --- |
| `update:modelValue` | `string` | The field holds a new complete time, or the user clears it. |

## Exposed

| Member | Type | What it is |
| --- | --- | --- |
| `masked` | `Readonly<Ref<string>>` | The Masked Value, with placeholders: `09:MM`. |
| `typed` | `ShallowReadonly<Ref<…>>` | The Typed Value of the mask. |
| `instance` | `ShallowRef<InputMask \| null>` | The imask instance while the field is mounted. |

## The model

`v-model` carries a complete `HH:mm` or `''`, and nothing between them.

- **A Partial Entry stays in the field.** Pick hour `09`: the field shows `09:MM`, and the model
  does not change. Pick a minute, and the model becomes `09:30`.
- **Blur pads the entry.** `09:3M` becomes `09:03` when the field loses focus or the popover
  closes. An empty hour becomes `00`. A field with no digits stays empty.
- **A minute picked with an empty hour gives hour `00`.** imask fills the empty hour, and the
  filled value reaches the model. See
  [ADR-0015](../../../../docs/adr/0015-masked-input-binds-one-reading.md).
- **The mask corrects a written value.** Write only `HH:mm` or `''`. The mask treats other
  text as typed input.

## Keyboard

Focus stays in the field. The columns never take focus, also when you click an option.

| Key | In the field |
| --- | --- |
| `ArrowDown` / `ArrowUp` | Opens the popover if it is closed. Steps the active column to the next or previous option, and wraps at each end. From an empty column, `ArrowDown` selects the first option and `ArrowUp` the last. |
| `ArrowLeft` / `ArrowRight` / `Home` / `End` | Move the caret. The column on the caret's side of the colon becomes active. |
| `Tab` / `Shift+Tab` | While the popover is open, moves to the minute column or back to the hour column, and keeps focus in the field. From the last column in that direction, closes the popover and moves focus on. While the popover is closed, moves focus on as usual. |
| `Escape` | Closes the popover. |

A click on the field opens the popover and never closes it, so the click can place the caret.
`Escape` or a click outside closes it. A click on an option sets that column, keeps the popover
open and selects that segment of the field. The next keystroke then replaces it.

## Accessibility

The field is a `role="combobox"` with `aria-haspopup="listbox"` and `aria-expanded`. Focus
stays in the field, so the field names the moving option with `aria-activedescendant`: the
selected option of the active column, while the popover is open. A column with no selection
names no option. `aria-controls` names both columns while the popover is open.

Each column is a `role="listbox"` named by `hoursLabel` or `minutesLabel`. Its options are
`role="option"` with `aria-selected`, and they are out of the `Tab` order.

Supply the field's own name with `aria-label`, or with a `<label>` whose `for` matches the
`id` you pass. Pass `hoursLabel` and `minutesLabel` in the language of the page.

## Styling

| Hook | Element |
| --- | --- |
| `[data-slot="time-picker"]` | The root of the Popover. |
| `[data-slot="time-picker-popover"]` | The popover surface. |
| `[data-selected]` | The selected option in each column. |
| `[data-focus]` | Each option in the active column. |

## Gotchas

- **The steps filter the columns, not the field.** With `minute-step="15"`, the minute column
  shows 00, 15, 30 and 45, but the user can still type `07`.
- **The steps are read one time, at setup.** A later change to `hourStep` or `minuteStep` does
  not rebuild the columns.
- **24-hour time only.** There is no AM/PM mode and no seconds.

Worked examples are in `pages/playground/time-picker.vue`.
