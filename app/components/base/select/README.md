# Select

An accessible select. One component covers both single and multiple selection — `multiple`
narrows `v-model` to `V[]` or `V | null`.

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

`itemValue` and `itemChildren` need their function form typed — `:item-value="(g: Game) => g.id"`.
An implicit `g` is a compile error there, since those two props are where the type is inferred.
Every other accessor takes a bare arrow. Key accessors (`item-value="id"`) infer fine
everywhere.

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

## Virtual list

`virtual` renders only the Options in view and a few on each side. The document then holds
some tens of Options, whatever the length of the list. Use it for a list of some thousand
Options.

```vue
<template>
  <Select v-model="value" virtual :items="items" item-label="name" item-value="id" />
</template>
```

The keyboard, Groups and selection do not change. Four things do:

- **Every Option has one height**, and every Group label has one height: 32px and 28px by
  default. 32px is the height of a one-line Option without `virtual`. Content that is higher
  is cut.
  For a higher Option, pass the height: `:virtual="{ optionHeight: 48 }"`. `groupHeight` does
  the same for the label. A height must be a number more than 0; leave the key out for the
  default. Options of different heights cannot be in one virtual list.
- **The list does not follow the width of its Labels.** It has the width of the trigger, and
  at least 180px. The default content of an Option cuts a long Label with an ellipsis; content
  from the `#option` slot is cut without one. For a wider list, set a width on
  `[data-slot="listbox"]`.
- **Only the rendering changes.** The component still reads every Item, and the default filter
  still compares every Label on each keystroke. The design target is about 10,000 Options.
  For more, filter on the server with `externalFilter`.
- **Each Option carries `aria-posinset` and `aria-setsize`**, counted within its Group, because
  a screen reader cannot count Options that are not in the document.

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

**Server-side search.** `externalFilter` tells the Select not to narrow `items` itself. The
component emits nothing for the query, so the `#search` slot is the only way to reach it. The
slot hands you the ref, and you re-declare the field and its ARIA wiring:

```vue
<template>
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
</template>
```

## API

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `items` | `I[]` | `[]` | Options when flat; Groups when `itemChildren` is set. Declared required, but an omitted `items` draws an empty list rather than failing. |
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
| `separator` | `string` | `', '` | Joins the labels the trigger shows under `multiple`. |
| `virtual` | `boolean \| { optionHeight?: number, groupHeight?: number }` | `false` | Renders only the Options in view. See [Virtual list](#virtual-list). |

| Event | Payload | When |
| --- | --- | --- |
| `update:modelValue` | `V[]` or `V \| null` | An Option is selected or deselected, or the selection is cleared. |

There is no event for the Search Query. See [Gotchas](#gotchas).

| Slot | Props | Replaces |
| --- | --- | --- |
| `value` | `modelValue`, `option`, `options`, `unresolvedCount` | The trigger's label. `option` is `options[0] ?? null`. |
| `option` | `option`, `selected`, `active` | One row's content. |
| `group` | `group` | A group heading. |
| `search` | `query`, `listboxId`, `activeDescendantId` | The search field. `query` is the ref; bind `query.value` yourself. |
| `empty` | `query` | The no-results message. |
| `loading` | — | The spinner shown while blocked. |

The `#search` slot has no `onKeydown` prop on purpose — the container already handles keydown,
and binding it to your field too would handle every key twice.

```vue
<template>
  <Select v-model="id" :items="games" item-label="name" item-value="id">
    <template #value="{ option, modelValue }">
      <span v-if="option" class="truncate">{{ option.label }}</span>
      <span v-else class="text-error">unknown: {{ modelValue }}</span>
    </template>
  </Select>
</template>
```

| Exposed | Signature | What it does |
| --- | --- | --- |
| `toggleShow` | `(value?: boolean) => void` | Opens or closes the popup. Omit the argument to toggle. |

`class` and `style` land on the control box; every other attribute (`aria-*`, `data-*`,
listeners) lands on the focusable trigger.

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

Supply a label through `id` and a `<Label :for>`:

```html
<Label for="team">Team</Label>
<Select id="team" v-model="teamId" :items="teams" item-label="name" item-value="id" />
```

## Styling

Colour, border, focus ring, invalid and disabled states come from the shared field surface in
`assets/css/components/input.css` — a Select matches `.inputtext` in both themes without
redeclaring a token. Layout lives in `assets/css/components/select.css`.

Stable hooks for overrides: `data-slot="select-control"`, `select-trigger`, `select-popup`,
`select-search`, `listbox`, `option-group`, `group-label`, `option`, `clear`.

## Gotchas

- **Omitting `itemValue` requires `itemKey`.** Without it the whole Item becomes the Key, so a
  Value restored from JSON never matches. A development build warns once per `items` rebuild.
- **`multiple` must stay `M & boolean` in the source.** A bare `M` compiles to `type: null`,
  Vue skips Boolean casting, and `<Select multiple>` silently becomes single-select. Guarded by
  `pages/playground/select-types.vue` and `SelectModes.spec.ts` — don't delete either.
- **`Tab` closes without committing.** Moving focus is not choosing.
- **There is no `update:search` emit.** `externalFilter` exists, but the Search Query is
  reachable only through the `#search` slot, which means re-declaring the field and its ARIA
  wiring to read a string.
