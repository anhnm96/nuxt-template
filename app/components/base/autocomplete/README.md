# Autocomplete

A text input that offers Options as you type. The input is the control: it holds focus, carries
`role="combobox"`, and shows either the Label of the chosen Option or whatever you typed.

```vue
<script setup lang="ts">
import Autocomplete from '~/components/base/autocomplete/Autocomplete.vue'

const countries = [{ code: 'jp', name: 'Japan' }, { code: 'fr', name: 'France' }]
const country = ref<string | null>(null)
</script>

<template>
  <Autocomplete
    v-model="country"
    :items="countries"
    item-label="name"
    item-value="code"
  />
</template>
```

Terms in Title Case are defined in [CONTEXT.md](../../../../CONTEXT.md). For why the component
is built this way, see [DESIGN.md](./DESIGN.md).

## Two models

An Autocomplete carries a Value **and** a Query, and they never narrow each other's type.

| model | type | holds |
| --- | --- | --- |
| `v-model` | `Value \| null` | the chosen Option's Value |
| `v-model:query` | `string` | the input's visible text |

They are kept consistent by one invariant: **`modelValue` is non-null only while `query` is
exactly the Label of the selected Option.** Editing the text after choosing clears the Value, so
the two can never disagree about what the field holds.

That makes reading the field unambiguous:

```vue
<script setup lang="ts">
import Autocomplete from '~/components/base/autocomplete/Autocomplete.vue'

const cities = [{ id: 'tyo', name: 'Tokyo' }]
const city = ref<string | null>(null)
const cityQuery = ref('')

// Constrained: read `modelValue`, and ignore the Query entirely.
// Freeform: never both are set, so this is always the value.
const resolved = computed(() => city.value ?? cityQuery.value)
</script>

<template>
  <Autocomplete
    v-model="city"
    v-model:query="cityQuery"
    freeform
    :items="cities"
    item-label="name"
    item-value="id"
  />
  <p>{{ resolved }}</p>
</template>
```

Binding `query` is optional. Bind it when you run a server search, or when `freeform` means the
typed text is the value.

## Freeform

Without `freeform`, the field only ever holds an Option. Leaving it with text that matches
nothing restores whatever was last chosen.

With `freeform`, text that matches nothing survives, and the consumer reads
`modelValue ?? query`. Nothing is added to `items`, and no Option is created — `freeform` only
decides whether unmatched text is kept. The example above is a Freeform field.

## Leaving the field

Blur, `Tab` and a second `Escape` all run the same rule, on a Query that no longer matches the
model:

| state when you leave | constrained | `freeform` |
| --- | --- | --- |
| the text matches the chosen Option | nothing happens | nothing happens |
| the text matches nothing, and is not empty | the last chosen Option is restored | the text is kept |
| the text is empty | the field is cleared | the field is cleared |

An empty field is always treated as a deliberate clear, which is what makes select-all plus
`Delete` a working keyboard path to emptying the field.

A Value whose Item has not arrived yet is restored too, without a Label — the field goes back
to looking empty, and picks up its Label as soon as `items` can supply one.

**Setting `v-model` to `null` yourself empties the field.** The Query goes with it, and nothing
is left for the component to restore — so a form reset stays reset, and a dependent field that
swaps `items` and clears its value together cannot resurrect a choice from the old list.

Losing focus also closes the popup, and focus is left wherever you moved it — the field never
takes it back.

## Filtering

The list narrows only while `modelValue` is `null`. A non-null Value means the text is the
Label of what you chose, not a search — so clicking into a filled field shows **every** Option
and the field stays browsable. Opening a filled field also selects its text, so typing replaces
the Label instead of appending to it.

- `filterFn` — how a Label is matched. Defaults to a case-insensitive substring.
- `externalFilter` — you narrow `items` yourself; render them untouched.
- `minQueryLength` — below this many characters the popup offers no Options and shows
  `minQueryText` instead. `0` (the default) keeps the field browsable from the chevron.

## Async

The popup always opens, even with nothing loaded — the keystroke that starts a request is the
one that should show the popup. While `loading` and no Items have arrived, the popup shows a
spinner; after that the list stays live and the chevron shows the spinner instead.

**Debouncing is yours, not the component's.** `query` is a model rather than an event, so
delaying it would make the visible text and the value disagree on a timer.

```vue
<script setup lang="ts">
const query = ref('')
const items = ref<City[]>([])
const loading = ref(false)

watchDebounced(query, async (value) => {
  if (value.trim().length < 2) return
  loading.value = true
  items.value = await searchCities(value)
  loading.value = false
}, { debounce: 300 })
</script>

<template>
  <Autocomplete
    v-model="city"
    v-model:query="query"
    external-filter
    :loading="loading"
    :items="items"
    :min-query-length="2"
    item-label="name"
    item-value="id"
  />
</template>
```

## Grouping

Pass `itemGroup` to cluster a flat list, or `itemChildren` when `items` already holds Groups —
in which case every other `item*` accessor keys off the children.

```html
<Autocomplete
  v-model="value"
  :items="categories"
  :item-children="(c: Category) => c.games"
  item-label="name"
  :item-value="(g: Game) => g.id"
  item-group="title"
/>
```

Groups appear in first-appearance order, so clustered input is never reordered. A Group whose
Options are all filtered out disappears. Navigation never sees Groups.

## API

### Props

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `items` | `I[]` | `[]` | Options when flat; Groups when `itemChildren` is set |
| `itemChildren` | `keyof I \| ((item: I) => Child[])` | — | Reads a Group's Options. Passing it switches `items` from Options to Groups |
| `itemLabel` | `keyof T \| ((item: T) => string)` | the Item itself | Rendered, matched against, and echoed into the input |
| `itemValue` | `keyof T \| ((item: T) => V)` | the whole Item | What `v-model` emits |
| `itemKey` | `keyof T \| ((item: T) => Key)` | `itemValue` | Identity. Required when `itemValue` is omitted |
| `itemDisabled` | `keyof T \| ((item: T) => boolean)` | `false` | Marks an Option unselectable |
| `itemGroup` | `keyof I \| ((item: I) => string)` | — | The Group label |
| `id` | `string` | generated | Set on the input |
| `placeholder` | `string` | `'Search…'` | |
| `freeform` | `boolean` | `false` | A Query that matches nothing survives and stands as the value |
| `autoHighlight` | `boolean` | `!freeform` | Typing highlights the first Option whose Label *starts with* the Query, so `Enter` commits it |
| `filterFn` | `(item: T, query: string) => boolean` | substring | How a Label is matched |
| `externalFilter` | `boolean` | `false` | You narrow `items`; render them untouched |
| `minQueryLength` | `number` | `0` | Below this, no Options are offered |
| `minQueryText` | `string` | `'Type at least N characters'` | Shown below the threshold |
| `emptyText` | `string` | `'No results'` | Shown when a search matched nothing |
| `clearable` | `boolean` | `false` | Renders the clear button |
| `clearLabel` | `string` | `'Clear selection'` | Accessible name for the clear button |
| `toggleLabel` | `string` | `'Show options'` | Accessible name for the chevron |
| `loading` | `boolean` | `false` | The list is not yet authoritative. Does not disable the control |
| `disabled` | `boolean` | `false` | |
| `invalid` | `boolean` | `false` | |
| `required` | `boolean` | `false` | |
| `dropdownProps` | `DropdownProps` | — | Forwarded to the underlying [`Dropdown`](../dropdown/README.md) |

### Models

| Model | Type | Default |
| --- | --- | --- |
| `v-model` | `Value \| null` | `undefined` |
| `v-model:query` | `string` | `''` |

### Slots

| Slot | Props | Content |
| --- | --- | --- |
| `option` | `{ option, selected, active }` | One row of the list |
| `group` | `{ group }` | A Group heading |
| `empty` | `{ query }` | Shown when a search matched nothing |
| `min-query` | `{ minQueryLength }` | Shown below the threshold |
| `loading` | — | Shown while loading with nothing to list |

### Exposed

| Member | Type | What it does |
| --- | --- | --- |
| `focus` | `() => void` | Focuses the input |
| `lastCommit` | `Option \| null` | What leaving the field would restore |

## Keyboard

The input is a text field first, so the text-editing keys keep their usual meaning.

**Closed**

| key | behaviour |
| --- | --- |
| printable | open, narrow the list, and highlight the first prefix match |
| `ArrowDown` | open; Active = Selected, else first |
| `ArrowUp` | open; Active = Selected, else last |
| `Alt`+`ArrowDown` | open, nothing Active |
| `Escape` | restore the last chosen Option, if the text was edited |
| `Home` `End` `Delete` `Backspace` | edit the text |

**Open**

| key | behaviour |
| --- | --- |
| `ArrowDown` / `ArrowUp` | ±1, clamped at the ends |
| `PageDown` / `PageUp` | ±10, clamped. The only keys that jump the list |
| `Enter` | commit the Active Option and close. With nothing Active the key passes through, so a form still submits |
| `Escape` | close the popup, leaving the text alone |
| `Tab` | close without committing |
| `Alt`+`ArrowUp` | close |
| `Home` `End` `Space` `Delete` `Backspace` | edit the text |

Two differences from [`Select`](../select/README.md) are deliberate:

- **`Home` and `End` move the caret.** An editable combobox cannot take them for the list.
- **`Delete` and `Backspace` do not clear the selection.** They edit text. Emptying the field
  clears it instead.

## Accessibility

- The input is the only combobox: `role="combobox"`, `aria-autocomplete="list"`,
  `aria-haspopup="listbox"`, `aria-expanded`. The role never moves elsewhere.
- The list is `role="listbox"`; rows are `role="option"` with `aria-selected`. Groups are
  `role="group"` labelled by their heading.
- Focus never leaves the input. The Active Option is reported with `aria-activedescendant`, so
  the list is navigable while typing continues.
- `aria-controls` and `aria-activedescendant` are set only while a listbox is actually
  rendered — not below `minQueryLength`, and not during the first load.
- **Name the input yourself.** A `<Label for="…">` paired with `id`, or `aria-label`; nothing
  is inferred.
- The clear button and the chevron are out of the Tab order, so a long form does not gain two
  stops per field. Both keep accessible names and stay reachable by a virtual cursor.

## Styling

The field reuses `.select-control` for its surface and the whole `.select-list` /
`.select-option` / `.select-group-label` stack for the popup, so it matches `.inputtext` and
`Select` in both themes. Only the Trigger has rules of its own, in
[`assets/css/components/autocomplete.css`](../../../assets/css/components/autocomplete.css).

`data-slot` hooks: `autocomplete-control`, `autocomplete-input`, `autocomplete-toggle`,
`clear`, `autocomplete-popup`, `autocomplete-list`, `option`, `option-group`, `group-label`.
Rows also carry `data-active` and `data-disabled`.

## Gotchas

- **Typing after choosing emits `null` before it emits anything else.** A `watch(modelValue)`
  that starts a request sees that `null` on every edit, including edits the user abandons. Guard
  on the value rather than on the change.
- **`freeform` with a label-only value loses the Key.** The typed text has no Item, so there is
  nothing to resolve it to. That is the trade `modelValue ?? query` makes.
- **A Value you set must be resolvable from `items`, or the field renders empty.** The Label
  comes from the Item and nowhere else, so a Value with no matching Item shows the placeholder
  and looks unset. When you restore a saved value, seed `items` with its Item — you need the
  Item to display it anyway. The Value itself is safe either way: leaving the field restores it
  rather than discarding it.
- **`itemKey` is required when `itemValue` is omitted.** Without it the whole Item becomes the
  Key, so a Value restored from JSON never resolves. The component warns once in dev.
- **No multiple selection.** One Option, or none.
- **No inline completion.** The input never fills in the rest of a match for you.
- **No "create new option" row.** In `freeform` the typed text is already the value, so there
  is nothing to create.
- **No virtualization.** Long lists render in full.
- A worked example of every mode is in `pages/playground/autocomplete.vue`.
