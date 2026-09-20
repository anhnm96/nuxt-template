# Select

An accessible, hand-rolled select. One component covers both single and multiple selection —
`multiple` narrows `v-model` to `V[]` or `V | null`. Replaces PrimeVue's `Select` and
`MultiSelect`.

This file is how to **use** it. For why it is built this way — the invariants, the traps, the
reasoning — see [DESIGN.md](./DESIGN.md). Shared vocabulary (Item, Option, Key, Value, Visible
Options, Blocked) lives in the repo's [CONTEXT.md](../../../../CONTEXT.md).

```vue
<Select
  v-model="teamId"
  :items="teams"
  item-label="teamName"
  item-value="teamId"
  class="w-70"
/>
```

## Props

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `items` | `I[]` | — | Options when flat; Groups when `itemChildren` is set. Required. |
| `itemLabel` | `keyof I \| (item) => string` | the Item itself | What's rendered, and what Search and Typeahead match against. |
| `itemValue` | `keyof I \| (item) => V` | the whole Item | What `v-model` emits. Omit it and the Item itself is the Value — then `itemKey` is required. |
| `itemKey` | `keyof I \| (item) => Key` | `itemValue` | Stable identity. The common primitive case needs no Key at all. |
| `itemDisabled` | `keyof I \| (item) => boolean` | — | Which Options can't be picked. |
| `itemGroup` | `keyof I \| (item) => string` | — | Group heading. Read from the Option when flat, from the Group when nested. |
| `itemChildren` | `keyof I \| (item) => O[]` | — | Reads a Group's Options. Passing it switches `items` from Options to Groups. |
| `multiple` | `boolean` | `false` | Several Options selectable; narrows `v-model` to an array. |
| `id` | `string` | `useId()` | Pair with `<Label :for>`. |
| `placeholder` | `string` | `'Select an option'` / `'Select options'` | Shown when nothing resolves. |
| `searchable` | `boolean` | `false` | Renders the search field. Independent of who filters. |
| `searchPlaceholder` | `string` | `'Search…'` | |
| `filterFn` | `(item, query) => boolean` | case-insensitive substring | How a Label is matched. |
| `externalFilter` | `boolean` | `false` | The parent narrows `items` itself (server-side search); render them untouched. |
| `emptyText` | `string` | `'No results'` | |
| `clearable` | `boolean` | `false` | Shows the clear button; enables `Delete`/`Backspace`. |
| `clearLabel` | `string` | `'Clear selection'` | Accessible name for the clear button. |
| `loading` | `boolean` | `false` | The list isn't authoritative yet. Does **not** disable the control. |
| `disabled` | `boolean` | `false` | |
| `invalid` | `boolean` | `false` | Error styling + `aria-invalid`. Pass your own validation state. |
| `required` | `boolean` | `false` | Presentational — sets `aria-required`. |
| `separator` | `string` | `', '` | Joins labels in the default `multiple` display. |
| `dropdownProps` | `DropdownProps` | — | Forwarded to the underlying `Dropdown` (placement, offset, …). |

`class` and `style` land on the control box; every other attribute (`aria-*`, `data-*`,
listeners) lands on the focusable trigger.

Exposed: `toggleShow(value?: boolean)` via template ref.

## v-model

The model type follows `multiple` and `itemValue`:

```vue
<!-- string | null -->
<Select v-model="id" :items="games" item-label="name" item-value="id" />

<!-- string[] -->
<Select v-model="ids" multiple :items="games" item-label="name" item-value="id" />

<!-- Game | null — itemKey required, since the Value is the whole object -->
<Select v-model="game" :items="games" item-label="name" item-key="id" />
```

There is no `default`, so an uncontrolled Select starts genuinely empty.

A **function** accessor needs its parameter typed — `:item-value="(g: Game) => g.id"`. An
implicit `g` can't be contextually typed and silently falls back to whole-Item mode. Key
accessors (`item-value="id"`) infer fine.

## Grouping

Two input shapes produce identical output. Flat rows with a group key:

```vue
<Select :items="rows" item-label="name" item-value="id" item-group="category" />
```

Or nested groups, consumed directly — no flattening at the call site:

```vue
<Select
  :items="categories"
  item-children="games"
  item-group="title"
  item-label="name"
  item-value="id"
/>
```

With `itemChildren`, every other `item*` accessor keys off the **children**, not the Group.
Groups appear in first-appearance order, so already-clustered data is never reordered. A Group
whose Options all filter out disappears entirely.

## Slots

| Slot | Props | Replaces |
| --- | --- | --- |
| `value` | `modelValue`, `option`, `options`, `unresolvedCount` | The trigger's label. `option` is `options[0] ?? null`. |
| `option` | `option`, `selected`, `active` | One row's content. |
| `group` | `group` | A group heading. |
| `search` | `query`, `listboxId`, `activeDescendantId` | The search field. Bind `query` yourself. |
| `empty` | `query` | The no-results message. |
| `loading` | — | The spinner shown while blocked. |

The `#search` slot has no `onKeydown` prop on purpose — the container already handles keydown,
and binding it to your field too would handle every key twice.

```vue
<Select v-model="id" :items="games" item-label="name" item-value="id">
  <template #value="{ option, modelValue }">
    <span v-if="option" class="truncate">{{ option.label }}</span>
    <span v-else class="text-error">unknown: {{ modelValue }}</span>
  </template>
</Select>
```

## Keyboard

**Closed**

| Key | Does |
| --- | --- |
| `ArrowDown` / `ArrowUp` | Open, highlighting the selection (or first / last) |
| `Alt`+`ArrowDown` | Open without highlighting anything |
| `Enter` / `Space` | Open |
| `Delete` / `Backspace` | Clear, when `clearable` and something is selected |
| any printable char | Open and jump to it (or seed the search when `searchable`) |

**Open**

| Key | Does |
| --- | --- |
| `ArrowDown` / `ArrowUp` | Move one row. Clamps at the ends — deliberately does not wrap |
| `Home` / `End` | First / last enabled Option |
| `PageUp` / `PageDown` | Move 10 |
| `Enter` | Select the active Option |
| `Space` | Select — unless `searchable`, where it types a space |
| `Tab` | Close **without** committing |
| `Escape` | Close |
| `Alt`+`ArrowUp` | Close |
| any printable char | Typeahead — unless `searchable`, where it types. Buffer clears after 500ms and wraps |

Disabled Options are skipped, never landed on.

## Accessibility

Focus never leaves the trigger while the list is open — the highlight moves via
`aria-activedescendant`, not DOM focus.

- **Not searchable**: the trigger is the `combobox`.
- **Searchable**: the search field is the `combobox` and owns `aria-activedescendant`; the
  trigger becomes a disclosure button. Focus moves into the field on open.
- **Groups** are `role="group"` labelled by an `aria-hidden` header, so the name is announced
  once rather than twice.
- **Clear button** is out of the Tab order (`tabindex="-1"`) so a form with nine filled
  Selects doesn't gain nine extra tab stops. It stays in the accessibility tree, and
  `Delete`/`Backspace` on the closed trigger is the keyboard path — advertised via
  `aria-keyshortcuts`.
- **Blocked** (loading with no Items yet): announced with `aria-disabled` + `aria-busy` and
  refuses to open, but stays focusable so a keyboard user can land on it and hear why.

Pair with a label the same way as every other control in this app:

```html
<Label for="team">Team</Label>
<Select id="team" v-model="teamId" :items="teams" item-label="name" item-value="id" />
```

## Loading and async

`loading` means "the list isn't authoritative yet" — it never disables the control.

- **No Items yet** → the Select is *Blocked*: it won't open, and the popup would be empty anyway.
- **Stale Items present** → it opens normally and keeps the list live rather than flickering it
  away. The trigger's chevron becomes a spinner; when `searchable`, a second one sits in the
  search field.
- **A Value that matches no Item** → while loading, the trigger dims (*resolving*); once loading
  ends it falls back to the placeholder, and `#value` lets you render the raw value if you know
  better. In `multiple`, resolved labels are joined and any unresolved ones are counted as `+N`
  so the trigger never under-reports the selection.

**Server-side search.** `externalFilter` tells the Select not to narrow `items` itself — but
the component emits nothing for the query, so the only way to reach it today is the `#search`
slot, which hands you the ref:

```vue
<Select
  v-model="id" searchable external-filter
  :items="results" :loading="pending"
  item-label="name" item-value="id"
>
  <template #search="{ query, listboxId, activeDescendantId }">
    <input
      v-model="query.value"
      type="text" role="combobox" aria-expanded="true" :size="1"
      aria-autocomplete="list" autocomplete="off"
      :aria-controls="listboxId" :aria-activedescendant="activeDescendantId"
      class="inputtext initial:py-1.5 initial:text-sm"
      @input="onSearch(query.value)"
    >
  </template>
</Select>
```

Note what that costs: you re-declare the field, including its ARIA wiring, to get at a string.
If more than one or two call sites need this, an `update:search` emit would be the better
answer — see [Gotchas](#gotchas).

## Styling

Colour, border, focus ring, invalid and disabled states come from the shared field surface in
`assets/css/components/input.css` — a Select matches `.inputtext` in both themes without
redeclaring a token. Layout lives in `assets/css/components/select.css`.

Stable hooks for overrides: `data-slot="select-control"`, `select-trigger`, `select-popup`,
`select-search`, `select-list`, `option-group`, `group-label`, `option`, `clear`.

## Migrating from PrimeVue

| PrimeVue | Select |
| --- | --- |
| `:options` | `:items` |
| `option-label` | `item-label` |
| `option-value` | `item-value` |
| `option-disabled` | `item-disabled` |
| `option-group-label` | `item-group` |
| `option-group-children` | `item-children` |
| `:filter` | `searchable` |
| `:show-clear` | `clearable` |
| `:label-id` | `:id` + `<Label :for>` |
| `:reset-filter-on-hide` | gone — the query always resets on close |

Check each call site rather than translating mechanically: PrimeVue's `Select` emits the whole
option object in some configurations, and this component's `itemValue`/`itemKey` split is
deliberate. See [DESIGN.md](./DESIGN.md) for the Key-vs-Value distinction.

> **Name clash while both exist.** This component registers globally as `<Select>`, and
> `nuxt.config.ts` also registers PrimeVue's under that name. The local one wins, so any
> not-yet-migrated call site passing `:options` will crash. Until PrimeVue is dropped, import
> explicitly at new call sites:
> `import Select from '~/components/base/select/Select.vue'`.

## Gotchas

- **Omitting `itemValue` requires `itemKey`.** Without it the whole Item becomes the Key, so a
  Value restored from JSON never matches. Dev builds warn.
- **`multiple` must stay `M & boolean` in the source.** A bare `M` compiles to `type: null`,
  Vue skips Boolean casting, and `<Select multiple>` silently becomes single-select. Guarded by
  `pages/test/select-types.vue` and `SelectModes.spec.ts` — don't delete either.
- **`Tab` closes without committing.** Moving focus is not choosing.
- **There is no `update:search` emit.** `externalFilter` exists, but the Search Query is only
  reachable through the `#search` slot, which means re-declaring the field and its ARIA wiring
  just to read a string. Fine for one call site, wrong shape for several — worth adding an emit
  before the async call sites land.
