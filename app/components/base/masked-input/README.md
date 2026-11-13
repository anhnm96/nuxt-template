# MaskedInput

A text field that formats its entry as the user types: a phone number, an amount, a date. It
wraps an [imask](https://imask.js.org) mask around a plain `<input>`.

Terms in Title Case are defined in [CONTEXT.md](../../../../CONTEXT.md#masked-input). For why
the binding works this way, see
[ADR-0015](../../../../docs/adr/0015-masked-input-binds-one-reading.md).

```vue
<script setup lang="ts">
const PHONE = { mask: '+{1} (000) 000-0000' }
const phone = ref('')
</script>

<template>
  <MaskedInput v-model="phone" :mask-options="PHONE" aria-label="Phone" />
</template>
```

Type `5551234567`: the field shows `+1 (555) 123-4567`, and `phone` is `'15551234567'`.

## Props

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `maskOptions` | `FactoryOpts` from `imask` | required | The mask. The component reads it one time, at mount. |
| `bound` | `'unmasked' \| 'masked' \| 'typed'` | `'unmasked'` | The reading that `v-model` carries. The component reads it one time, at mount. |
| `modelValue` | `string`, or the Typed Value under `bound="typed"` | — | `v-model`. |

Other attributes go to the `<input>`: `id`, `placeholder`, `aria-label`, `disabled`, `class`.

## Events

| Event | Payload | When |
| --- | --- | --- |
| `update:modelValue` | The Bound Value | The Bound Value changes, or the mask corrects a value that the consumer wrote. |
| `accept` | `{ masked, unmasked, typed }` | The text in the field changes. |

## Exposed

| Member | Type | What it is |
| --- | --- | --- |
| `masked` | `Readonly<Ref<string>>` | The Masked Value. |
| `unmasked` | `Readonly<Ref<string>>` | The Unmasked Value. |
| `typed` | `ShallowReadonly<Ref<…>>` | The Typed Value, or `null` when the field is empty. |
| `instance` | `ShallowRef<InputMask \| null>` | The imask instance while the field is mounted. |

## Choosing `bound`

`v-model` carries one reading of the entry, the Bound Value. The other two are read-only:
read them from `accept` or from a template ref.

| `bound` | `v-model` holds | For `+1 (555) 123-4567` |
| --- | --- | --- |
| `'unmasked'` | The Unmasked Value | `'15551234567'` |
| `'masked'` | The Masked Value, as the field shows it | `'+1 (555) 123-4567'` |
| `'typed'` | The Typed Value: a `number` for `Number`, a `Date` for `Date` | — |

The type of `v-model` follows `bound`. A `string` ref on `bound="typed"` with a `Number` mask
is a type error.

```vue
<script setup lang="ts">
const AMOUNT = { mask: Number, min: 0, max: 5000, thousandsSeparator: ',' } as const
const amount = ref<number | null>(1200)
</script>

<template>
  <MaskedInput v-model="amount" bound="typed" :mask-options="AMOUNT" aria-label="Amount" />
</template>
```

## The Typed Value

Under `bound="typed"`:

- **An empty field writes `null`.** The model type is `TypedValue | null`.
- **A Partial Entry does not write.** While the user types `15.01.20`, the model keeps the last
  complete value. It changes again at the next complete entry.
- **Blur reverts a Partial Entry.** The field shows the model again, so the field and the
  model agree. A Partial Entry on a field with no Typed Value clears the field.

Under `bound="unmasked"` and `bound="masked"`, every change writes, and blur keeps a Partial
Entry.

## A corrected write

When the consumer writes a value that the mask changes, the changed value returns to the model.
With `max: 100`, a write of `150` shows `100` and sets the model to `100`.

A value that the field shows unchanged is not a correction. A date mask shows no time, so a
written `Date` keeps its time of day.

## Gotchas

- **The mask is read one time, at mount.** A later change to `maskOptions` or `bound` does
  nothing. To change the mask, change the component's `:key`, which mounts a new field.
- **A mask narrower than its data rewrites the data.** The corrected write applies to the
  initial value too. A `max: 2099` date mask turns a stored year 9999 into 2099.
- **Some imask types are not registered.** The field supports `Date`, `Number`, `MaskedRange`,
  `MaskedEnum`, a pattern string, a `RegExp`, a function and a dynamic array. Another type fails
  with "Masked class is not found". Add its `imask/masked/*` import in
  `composables/useMask.ts`.
- **Under `bound="typed"`, the model and `typed` hold the same object.** `shallowReadonly`
  does not protect a `Date` inside it. A change in place, such as `setDate`, changes the model
  without an update, and the field keeps the old text. Assign a new `Date` to the model.

## Without the component

[`useMask`](../../../composables/useMask.ts) puts the same mask and binding on an `<input>`
that you render. Use it when the input has its own markup or behaviour, such as
[TimePicker](../time-picker/README.md).
The composable attaches the mask when the element appears, also under `v-if`.

Worked examples are in `pages/playground/masked-input.vue`. The narrowing of `v-model` is probed
in `pages/playground/masked-input-types.vue`.
