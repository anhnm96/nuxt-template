# useMask

Puts an [imask](https://imask.js.org) mask on an `<input>` that you render, and binds one reading of the entry to a ref. [MaskedInput](../../../app/components/base/masked-input/README.md) is this composable with a plain `<input>`. Use the composable when the input has its own markup or behaviour.

Used by `MaskedInput` and `TimePicker`.

## Usage

```vue
<script setup lang="ts">
const phone = ref('')
const phoneInput = useTemplateRef('phoneInput')

const { masked } = useMask(phoneInput, { mask: '+{1} (000) 000-0000' }, { bound: 'unmasked', model: phone })
</script>

<template>
  <input ref="phoneInput" type="text" aria-label="Phone">
  <p>{{ masked }}</p>
</template>
```

## Signature

```ts
function useMask<Opts extends FactoryOpts, B extends MaskReading>(
  el: MaybeRefOrGetter<HTMLInputElement | null | undefined>,
  options: Opts,
  binding: { bound: B, model: Ref<MaskBoundValue<Opts, B> | undefined> },
  onAccept?: (readings: MaskReadings<Opts>) => void,
): {
  instance: ShallowRef<InputMask<Opts> | null>
  masked: Readonly<Ref<string>>
  unmasked: Readonly<Ref<string>>
  typed: ShallowReadonly<Ref<MaskTypedValue<Opts> | null>>
}
```

| Parameter | What it does |
| --- | --- |
| `el` | The input. A template ref, a ref or a getter. |
| `options` | The imask options. The composable reads them one time. |
| `binding.bound` | The reading that `model` carries: `'unmasked'`, `'masked'` or `'typed'`. See [Choosing `bound`](../../../app/components/base/masked-input/README.md#choosing-bound). |
| `binding.model` | The Bound Value. The composable reads it and writes it. |
| `onAccept` | Called with all three readings each time the text in the field changes. |

`MaskReading`, `MaskBoundValue`, `MaskReadings` and `MaskTypedValue` are exported from the same file.

## Behaviour

- **The mask follows the element.** The composable attaches the mask when `el` resolves to an element, also when the element appears later under `v-if`. It attaches a new mask when the element changes, and destroys the mask when the element goes or the scope is disposed.
- **The model sets the initial text.** At attach, the composable writes `model` into the mask. An empty model writes nothing back.
- **The binding is the one in [MaskedInput](../../../app/components/base/masked-input/README.md#the-typed-value):** `null` for an empty field under `bound: 'typed'`, no write during a Partial Entry, a revert on blur, and a corrected write that returns to `model`.

## Notes

- **`options` and `bound` are read one time.** To change the mask, render a new element, for example with a `:key`.
- **Do not write `instance.value.typedValue`.** Its setter calls the mask's `format` with `null` while the field is empty or partial. Write `model` instead.
- **Writing `instance.value.value` is user input.** The mask corrects the text, and the result reaches `model` through the normal path. `TimePicker` writes its column picks this way.
- **Call it from `setup`.** It registers `onScopeDispose`, which needs a running component or effect scope.
