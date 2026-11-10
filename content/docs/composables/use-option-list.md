# useOptionList

The option-list model shared by [Select](/docs/components/select) and [Autocomplete](/docs/components/autocomplete). It turns Items into Options, narrows them by a Query, clusters them into Groups and navigates them as Visible Options. Terms in Title Case are defined in the [glossary](/docs/reference/glossary).

It owns the model and nothing else. The host owns the Query, decides when the popup opens, decides what a key means and decides what selecting does. That is why `query` and `skipFilter` are inputs here and not policy. [ADR-0012](/docs/reference/adr/0012-autocomplete-is-separate-from-select) records the split.

## Usage

This example renders an inline listbox. The host owns selection. The composable tracks
which option is active while DOM focus stays on the listbox.

```vue
<script setup lang="ts">
interface Fruit {
  id: string
  name: string
}

const items: Fruit[] = [
  { id: 'apple', name: 'Apple' },
  { id: 'pear', name: 'Pear' },
]
const id = useId()
const selected = ref<string[]>([])
const { visibleOptions, activeOption, activeDescendantId, isSelected, nav, setActiveIndex }
  = useOptionList<Fruit>({
    items,
    itemLabel: 'name',
    itemValue: 'id',
    id,
    selectedValues: selected,
    componentName: 'FruitPicker',
  })

function onKeydown(event: KeyboardEvent) {
  if (nav.handleKeydown(event)) return
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  if (activeOption.value) selected.value = [activeOption.value.value]
}

function selectAt(index: number) {
  const option = visibleOptions.value[index]
  if (!option) return
  setActiveIndex(index)
  selected.value = [option.value]
}
</script>

<template>
  <ul
    :id="id"
    role="listbox"
    tabindex="0"
    aria-label="Fruit"
    :aria-activedescendant="activeDescendantId"
    @keydown="onKeydown"
  >
    <li
      v-for="(option, index) in visibleOptions"
      :id="option.id"
      :key="option.key"
      role="option"
      :aria-selected="isSelected(option)"
      :class="{ 'font-bold': option.id === activeDescendantId }"
      @click="selectAt(index)"
    >
      {{ option.label }}
    </li>
  </ul>
</template>
```

Use each option's generated `id` on its element. The listbox uses
`activeDescendantId` to point to that element as the active option changes.

## Signature

```ts
function useOptionList<T>(options: UseOptionListOptions<T>): UseOptionListReturn<T>
```

### Options

| Option | Type | What it does |
| --- | --- | --- |
| `items` | `MaybeRefOrGetter<any[]>` | Raw `items`: Options when flat, Groups when `itemChildren` is set. |
| `itemChildren` | `OptionAccessor<any, T[]>` | Reads a Group's Options. Its presence puts the list in nested mode. |
| `itemLabel` | `OptionAccessor<T, string>` | The Label. Defaults to the Item itself. |
| `itemValue` | `OptionAccessor<T, any>` | What the model emits. Omit it and the whole Item is the Value. |
| `itemKey` | `OptionAccessor<T, Key>` | Identity. Defaults to `itemValue`. |
| `itemDisabled` | `OptionAccessor<T, boolean>` | Which Options cannot be picked. |
| `itemGroup` | `OptionAccessor<any, string>` | The Group label, read from an element of `items`: the Option itself when flat, the Group when nested. |
| `id` | `MaybeRefOrGetter<string>` | Base id for the control. Option ids derive from it. |
| `query` | `MaybeRefOrGetter<string>` | The text Options are matched against. Owned by the host. |
| `filterFn` | `MaybeRefOrGetter<((item: T, query: string) => boolean) \| undefined>` | Tests the original item against the query. Defaults to a case-insensitive substring match. |
| `skipFilter` | `MaybeRefOrGetter<boolean \| undefined>` | Render every Option untouched, whatever the Query holds. |
| `selectedValues` | `MaybeRefOrGetter<unknown[]>` | The selected Values: zero or one for a single select, many for a multiple. |
| `loop` | `MaybeRefOrGetter<boolean \| undefined>` | Arrow keys come round at the ends. Default `false`. |
| `typeahead` | `MaybeRefOrGetter<boolean \| undefined>` | Printable characters jump the cursor. Default `false`: leave it off wherever a text field owns the keys. |
| `componentName` | `string` | Names the host in development warnings, for example `'Select'`. |

An `OptionAccessor<T, R>` is either a key of `T` or a function `(item: T) => R`.

### Return value

| Name | What it is |
| --- | --- |
| `allOptions` | Every Option, flattened from either input shape. |
| `matchedOptions` | The Options that match the Query. |
| `groups` | The matched Options in first-appearance Groups. Ungrouped Options form a Group with an empty label. |
| `visibleOptions` | The Options in visual order. This is what every keyboard behaviour navigates, never `items`. |
| `activeKey`, `activeIndex`, `activeOption`, `activeDescendantId` | The Active Option, tracked by Key. |
| `keyOfValue(value)` | Resolves a Value to a Key. |
| `selectedKeys`, `isSelected(option)` | Selection, matched on Key. |
| `setActiveIndex(index)` | Moves the Active Option without scrolling. Pointer hover uses this. |
| `navigate(index)` | Moves the Active Option and scrolls it into view. Keyboard movement uses this. |
| `scrollActiveIntoView()` | Reveals the Active Option. |
| `nav` | The [useListNavigation](/docs/composables/use-list-navigation) instance over `visibleOptions`. |

## Behaviour

- **Key, not Value.** Matching always uses the Key. Two structurally equal Values from different sources are not reference-equal. When `itemKey` is omitted the Key equals the Value, so a Value resolves to a Key without any Items loaded.
- **The Active Option is tracked by Key,** not by index. Filtering reorders indices, and a Key keeps pointing at the same Option.
- **Option ids follow position,** as `${id}-opt-${index}`, never the Key. Keys are arbitrary: sanitising `'a b'` and `'a_b'` into a DOM id would collide, and a whole-Item Key stringifies to `[object Object]`. Duplicate ids break `aria-activedescendant` without any visible sign.
- **Groups keep first-appearance order.** A Group takes the position of its first member. Clustered data is unchanged, and nested input and pre-clustered flat input give the same output. A Group whose Options are all filtered out disappears.
- **Only keyboard movement scrolls.** If hover scrolled too, `block: 'nearest'` would shift the list under the pointer, the next `mousemove` would land on a different row, and a click would select the wrong one.

## Notes

- In development, an object Key logs one warning: `itemKey` is required when `itemValue` is omitted.
- Key accessors such as `item-value="gameId"` infer their types in every mode. The accessors that are type parameters, `itemChildren` and `itemValue`, need a typed function form such as `(g: Game) => g.gameId`. An implicit parameter reports TS7006. The playground pages `select-types` and `autocomplete-types` guard this.
- The `nav` instance receives `visibleOptions` directly, because a `ListOption` already carries `disabled` and `label`.
