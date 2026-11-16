# Listbox

The option list that [Select](../select/README.md) and
[Autocomplete](../autocomplete/README.md) show in their popup: Groups, Options, the empty
state and the first-load state. It is a view. It holds no selection, handles no key and never
takes DOM focus; a **host** supplies all three.

Use `Select` or `Autocomplete` in an application. Use `Listbox` only to build another host
over [`useOptionList`](../../../composables/useOptionList.ts).

This file is how to **use** it. For why it is built this way — props for what it draws and a
context for the live state, the Virtual List, who scrolls — see [DESIGN.md](./DESIGN.md).
Terms in Title Case are defined in [CONTEXT.md](../../../../CONTEXT.md).

```vue
<script setup lang="ts">
import { provideListbox } from '~/components/base/listbox/context'

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
const listboxId = `${id}-listbox`
const query = ref('')
const selected = ref<string[]>([])

const list = useOptionList<Fruit>({
  items,
  accessors: { itemLabel: 'name', itemValue: 'id' },
  id,
  query,
  selectedValues: selected,
  componentName: 'FruitFilter',
})
const { groups, visibleOptions, activeOption, activeDescendantId, nav } = list

// A click on an Option calls the second argument.
provideListbox(list, (option) => {
  selected.value = [option.value]
})

function onKeydown(event: KeyboardEvent) {
  if (nav.handleKeydown(event)) return
  if (event.key !== 'Enter' || !activeOption.value) return
  event.preventDefault()
  selected.value = [activeOption.value.value]
}
</script>

<template>
  <input
    v-model="query"
    role="combobox"
    aria-label="Fruit"
    aria-expanded="true"
    aria-autocomplete="list"
    :aria-controls="listboxId"
    :aria-activedescendant="activeDescendantId"
    @keydown="onKeydown"
  >
  <Listbox
    :id="listboxId"
    :state="visibleOptions.length ? 'options' : 'empty'"
    :groups="groups"
    :query="query"
    empty-text="No fruit"
  />
</template>
```

> **A host must call `provideListbox` first.** `Listbox` and its rows inject
> `ListboxContext`, and they throw when no ancestor provides it. `provideListbox` is in
> `context.ts` of this folder and is not auto-imported.

## The host contract

`Listbox` takes what it draws as props and reads the live state from the context. The host
keeps the rest.

| The host does | How |
| --- | --- |
| Builds the list | `useOptionList`. Pass its `groups` to the `groups` prop. |
| Provides the live state | `provideListbox(list, onOptionSelect, virtual?)`. `list` is the return value of `useOptionList`. |
| Decides what a click does | `onOptionSelect(option)`. Replace, toggle or commit, and close the popup if there is one. `Listbox` does not call it for a disabled Option. |
| Handles the keys | `nav.handleKeydown(event)` on the element that has focus. `Listbox` has no key handler. |
| Names the Active Option | `aria-activedescendant` on the element that has focus, from `activeDescendantId`. |
| Chooses the state | The `state` prop. See the next section. |

`Listbox` gives `useOptionList` the function that scrolls an Option into view. Keyboard
movement through `nav` or `navigate` then scrolls the list. Pointer hover moves the Active
Option and does not scroll.

One `provideListbox` call serves one `Listbox`. The list keeps one scroll function, so a second
`Listbox` below the same provider replaces the function of the first.

## State

`state` is one of three values. `Listbox` does not compute it, because hosts mean different
things by a first load.

| `state` | What renders |
| --- | --- |
| `'loading'` | The `#loading` slot, or a spinner. **No element has the listbox `id`.** |
| `'options'` | `groups`. |
| `'empty'` | The listbox with the `#empty` slot, or `emptyText`. |

Give `loading` priority over `empty`: a first load has no result to report yet. While `state`
is `loading`, remove `aria-controls` and `aria-activedescendant` from the control, because the
id that they name is not in the document.

## Virtual list

The third argument of `provideListbox` is a getter for the host's `virtual` value. A value that
is not falsy makes the list a Virtual List: only the Options in view and a few on each side are
in the document.

```ts
provideListbox(list, onOptionSelect, () => props.virtual)
```

| Value | Height of an Option | Height of a Group label |
| --- | --- | --- |
| `true` | 32px | 28px |
| `{ optionHeight?, groupHeight? }` | The given height, or 32px | The given height, or 28px |

A Virtual List differs from a list that renders every Option in three ways:

- Every Option has one height and every Group label has one height. `Listbox` sets them
  inline. Content that is higher is cut.
- The list has the width of the trigger, with a 180px minimum. It does not follow the widest
  Label.
- A Group label has no space above it.

The `VirtualProp` type is exported from `useVirtualRows.ts` of this folder, for the prop of the
host. The Select README shows the same mode from the consumer's side, in
[Virtual list](../select/README.md#virtual-list).

## API

### Listbox

#### Props

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `id` | `string` | — *(required)* | The id of the listbox element. The control names it in `aria-controls`. |
| `state` | `'loading' \| 'options' \| 'empty'` | — *(required)* | What renders. See [State](#state). |
| `groups` | `ListGroup<any>[]` | — *(required)* | The Groups to draw while `state` is `options`. A Group with an empty `label` renders its Options with no heading. |
| `labelledBy` | `string` | — | The id of the element that labels the listbox. |
| `multiselectable` | `boolean` | `false` | Sets `aria-multiselectable`. It does not change what a click does. |
| `emptyText` | `string` | — | The text of the empty state. It has no default, so the empty state is blank without it or the `#empty` slot. |
| `query` | `string` | — | Passed to the `#empty` slot. |

`Listbox` has no events. A click on an Option calls `onOptionSelect` from the context.

#### Slots

| Slot | Props | Content |
| --- | --- | --- |
| `loading` | — | Replaces the spinner while `state` is `loading`. |
| `group` | `group: ListGroup` | The content of a Group label. Default: `group.label`. |
| `option` | `option: ListOption`, `selected: boolean`, `active: boolean` | The content of an Option, beside the tick. Default: the Label in one line, cut with an ellipsis. |
| `empty` | `query: string` | Replaces `emptyText`. `query` is an empty string when the prop is not set. |

### ListboxOption

`Listbox` renders one for each Option. A host does not use it directly. Its `#default` slot is
the `#option` slot of `Listbox`.

### provideListbox

```ts
function provideListbox(
  list: Pick<ListboxContext, 'activeKey' | 'isSelected' | 'setActiveIndex' | 'setScrollToIndex'>,
  onOptionSelect: (option: ListOption<any>) => void,
  virtual?: () => VirtualProp | undefined,
): void
```

## Pointer

| Input | Result |
| --- | --- |
| Pointer moves over an Option | The Option becomes the Active Option. The list does not scroll. A disabled Option does not become active. |
| Press on an Option | Focus stays where it is; `mousedown` is cancelled. |
| Click on an Option | Calls `onOptionSelect(option)`. A disabled Option does nothing. |

There is no Keyboard section, because the host owns the keys.

## Accessibility

- The list is `role="listbox"` with `aria-labelledby` from `labelledBy`, and
  `aria-multiselectable` when `multiselectable` is set.
- Nothing in the list takes focus. Focus stays on the host's control, which names the Active
  Option with `aria-activedescendant`. Each Option has the `id` that `useOptionList` gives it.
- An Option is `role="option"` with `aria-selected`, and `aria-disabled` when it is disabled.
  The tick is `aria-hidden`; `aria-selected` has the same meaning.
- A Group with a label is `role="group"`, named by its label through `aria-labelledby`. A
  Group with an empty label has no role.
- In a Virtual List each Option has `aria-posinset` and `aria-setsize`, counted within its
  Group, because a screen reader counts only the Options in the document.
- The empty state is inside the listbox, with `role="presentation"`.
- Screen readers are not tested.

## Styling

The styles are in `app/assets/css/components/select.css`. The class names say `select` for
both hosts; DESIGN.md has the reason.

| Hook | Element |
| --- | --- |
| `data-slot="listbox"`, `.select-list` | The list: `max-height: 16rem`, scrolls vertically. Has `data-virtual` in a Virtual List. |
| `data-slot="option-group"` | The wrapper of a Group that has a label. |
| `data-slot="group-label"`, `.select-group-label` | The Group label: `position: sticky`. |
| `data-slot="option"`, `.select-option` | An Option. Has `data-active` while it is the Active Option and `data-disabled` while it is disabled. |
| `.select-option-check` | The slot of the tick. It keeps its width when the Option is not selected, so a selection does not move the Label. |

`--trigger-width` sets the minimum width of the list, and the width of a Virtual List.
`Popover` sets it; without it the minimum is 180px. The maximum width is `25rem`.

Attributes on `<Listbox>` land on the listbox element, or on the loading wrapper while
`state` is `loading`.

## Gotchas

- **The tint is Active and the tick is Selected.** They are independent, so an Option can
  have both.
- **The `option` slot is not typed by the Item.** `groups` is `ListGroup<any>[]`, so
  `option.item` is `any`. A host that forwards the slot gives it the type.
- **`multiselectable` is only an attribute.** The host's `onOptionSelect` and
  `selectedValues` decide whether a click replaces or toggles.
- **A press on an Option does not move focus.** That keeps focus on the host's control. It
  also means that a focusable element in the `option` slot does not take focus from a mouse
  press.
- **Without `virtual`, every Option is in the document.** A list of thousands of Options is
  slow to open; use the Virtual List.
