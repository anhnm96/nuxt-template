# useListboxOpen

The open protocol for a listbox popup: where the Active Option starts when the popup opens, and how it stays valid while the popup is open. Terms in Title Case are defined in the [glossary](/docs/reference/glossary).

It owns the mechanism and nothing else. The host decides whether the popup may open, where an open that no key drove lands, and what replaces an Active Option that the list no longer holds. [ADR-0012](/docs/reference/adr/0012-autocomplete-is-separate-from-select) records the split. It is also why [useOptionList](/docs/composables/use-option-list) does not take the open state.

Used by [Select](/docs/components/select) and [Autocomplete](/docs/components/autocomplete).

## Usage

This example opens a list from a button. `ArrowDown` opens it on the selected Option, or on the first Option. `ArrowUp` opens it on the selected Option, or on the last Option. A click writes `isOpen` directly, and the composable then positions the Active Option itself.

```vue
<script setup lang="ts">
interface Fruit {
  id: string
  name: string
}

const items: Fruit[] = [
  { id: 'apple', name: 'Apple' },
  { id: 'pear', name: 'Pear' },
  { id: 'plum', name: 'Plum' },
]
const id = useId()
const isOpen = ref(false)
const selected = ref<string[]>(['pear'])

const list = useOptionList<Fruit>({
  items,
  accessors: { itemLabel: 'name', itemValue: 'id' },
  id,
  selectedValues: selected,
  componentName: 'FruitPicker',
})

const { open, close } = useListboxOpen(list, {
  isOpen,
  canOpen: () => true,
  defaultPosition: 'selected-or-first',
  onActiveLost: () => list.navigate(list.nav.firstEnabled()),
})

function onKeydown(event: KeyboardEvent) {
  if (!isOpen.value) {
    if (event.key === 'ArrowDown') open('selected-or-first')
    else if (event.key === 'ArrowUp') open('selected-or-last')
    else return
    event.preventDefault()
    return
  }
  if (event.key === 'Escape') return close()
  list.nav.handleKeydown(event)
}
</script>

<template>
  <button
    type="button"
    aria-haspopup="listbox"
    :aria-expanded="isOpen"
    :aria-controls="isOpen ? id : undefined"
    :aria-activedescendant="list.activeDescendantId.value"
    @click="isOpen = !isOpen"
    @keydown="onKeydown"
  >
    Fruit
  </button>
  <ul v-if="isOpen" :id="id" role="listbox" aria-label="Fruit">
    <li
      v-for="option in list.visibleOptions.value"
      :id="option.id"
      :key="option.key"
      role="option"
      :aria-selected="list.isSelected(option)"
      :class="{ 'font-bold': option.id === list.activeDescendantId.value }"
    >
      {{ option.label }}
    </li>
  </ul>
</template>
```

## Signature

```ts
type OpenPosition = 'selected-or-first' | 'selected-or-last' | 'selected-or-none' | 'none'

function useListboxOpen<T>(
  list: UseOptionListReturn<T>,
  options: UseListboxOpenOptions,
): {
  open: (position?: OpenPosition) => boolean
  close: () => void
}
```

### Options

| Option | Type | What it does |
| --- | --- | --- |
| `isOpen` | `Ref<boolean>` | The open state. The host owns it, and anything else can write it. |
| `canOpen` | `() => boolean` | Whether the popup may open now. `open()` checks it. |
| `defaultPosition` | `'selected-or-first' \| 'selected-or-last' \| 'selected-or-none'` | The position for `open()` with no argument, and for an open that did not go through `open()`. |
| `onActiveLost` | `() => void` | Called while open, when the Visible Options change and no longer hold the Active Option. |
| `onClose` | `() => void` | Optional. Called after the popup closes and the Active Option is cleared. |

### Positions

| Position | Where the Active Option lands |
| --- | --- |
| `selected-or-first` | The selected Option. With no selection, the first enabled Option. |
| `selected-or-last` | The selected Option. With no selection, the last enabled Option. |
| `selected-or-none` | The selected Option. With no selection, nowhere. |
| `none` | Nowhere, also when an Option is selected. |

## Behaviour

- **`open()` returns whether the popup opened.** It returns `false` when `canOpen()` is `false`. Do not act on a refused open: for example, do not seed a Query from the key that asked for it.
- **An open that did not go through `open()` is positioned too.** A click that writes `isOpen`, or a consumer that binds it, lands on `defaultPosition`.
- **`open()` positions the Active Option one time.** The watcher on `isOpen` does not position it again, so an open with `none` stays on nothing.
- **A close clears the Active Option,** then calls `onClose`.
- **A changed list calls `onActiveLost` only when the Active Option is gone.** A list that still holds the Active Option does not move it.

## Notes

- `canOpen` gates `open()` only. A host that also lets a click write `isOpen` must give the same answer to whatever handles that click. [Select](/docs/components/select) passes its blocked state to its Popover as `disabled` for this reason.
- `selected-or-none` is for an editable field. After a mouse open with nothing selected, `Enter` then means "use my text" and does not commit the first Option.
- Call `useListboxOpen` after the code that `onActiveLost` needs. It registers its watchers when it runs.
