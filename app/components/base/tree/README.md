# Tree

A hierarchy of Nodes that the user expands, collapses and selects from, with the ARIA tree
pattern. Use it to pick something inside a hierarchy: a file, a category, a department. For
site navigation, use nested links instead: a Tree is one tab stop, and links are not.

This file is how to **use** it. For why it is built this way (the focus model, the row as
the treeitem, and why it does not share the Select listbox) see [DESIGN.md](./DESIGN.md).
Terms in Title Case, such as Parent Node and Visible Node, are defined in
[CONTEXT.md](../../../../CONTEXT.md), section Tree.

```vue
<script setup lang="ts">
import Tree from '~/components/base/tree/Tree.vue'

const items = [
  { id: 'docs', label: 'Docs', children: [{ id: 'intro', label: 'Intro.md' }] },
  { id: 'readme', label: 'README.md' },
]
const selected = ref<string | null>(null)
</script>

<template>
  <Tree v-model="selected" :items="items" item-value="id" aria-label="Files" />
</template>
```

> Give every Tree an accessible name with `aria-label` or `aria-labelledby`. In development,
> the Tree warns when it has neither.

## Items and Nodes

`items` holds the root Items. The Tree reads each Item through the `item*` accessors, which
take a key of the Item or a function, as in `Select`:

| Accessor | Default | Reads |
| --- | --- | --- |
| `itemChildren` | `'children'` | The children. An array, even an empty one, makes a Parent Node. `null` or no field makes a Leaf Node. |
| `itemLabel` | `'label'` | The text of the row, and what Typeahead matches. |
| `itemValue` | the whole Item | What `v-model` holds. |
| `itemKey` | `itemValue` | The identity of the Node. |
| `itemDisabled` | `false` | Whether the Node is disabled. |

**Keys must be unique in the whole Tree, not only among siblings.** Two Parent Nodes that are
both called `2000s` need two Keys. A duplicate Key breaks the expansion and the selection of the
other Node with that Key. In development, the Tree warns about a duplicate Key.

`{ label: 'public', children: [] }` is a Parent Node with no children. It shows the toggle and
expands to nothing.

## Expansion

The Tree starts with every Parent Node collapsed. Bind `v-model:expanded` to hold the Keys of
the Expanded Parent Nodes yourself, for example to expand a Parent Node at the start or to keep
the state across routes:

```vue
<script setup lang="ts">
import Tree from '~/components/base/tree/Tree.vue'

const items = [{ id: 'src', label: 'src', children: [{ id: 'main', label: 'main.ts' }] }]
const expanded = ref<Key[]>(['src'])
</script>

<template>
  <Tree v-model:expanded="expanded" :items="items" item-key="id" aria-label="Files" />
</template>
```

The Tree writes a new array on each change. It never changes `expanded` by itself: a Selected
Node inside a collapsed Parent Node stays hidden.

## Selection

The model follows `multiple` and `itemValue`, as in `Select`:

| `multiple` | `itemValue` | `v-model` type |
| --- | --- | --- |
| off | omitted | `I \| null` |
| off | `'id'` | `I['id'] \| null` |
| on | omitted | `I[]` |
| on | `'id'` | `I['id'][]` |

- Enter, Space or a click selects. The arrow keys move the focus only, so a watcher on
  `v-model` does not run on each arrow key.
- A click on a Parent Node row selects it and toggles it. A click on the toggle only toggles.
- In `multiple`, each Node toggles on its own. Selecting a Parent Node does not select its
  children, and selecting all children does not select the parent.
- `:select-parents="false"` makes a picker of Leaf Nodes. A Parent Node then has no
  `aria-selected`, and Enter, Space and a click only expand or collapse it.
- A disabled Node cannot be selected. It stays focusable and expandable, and its children are
  not disabled with it. To disable a Parent Node and all its descendants, use an `itemDisabled`
  function that reads the ancestors of the Item.

**A Tree without `v-model` has no selection.** It is navigable and expandable, and no row has
`aria-selected`. Use it to browse a hierarchy. The Tree detects `v-model` by its binding, so
`:model-value` or `@update:model-value` alone also turns selection on.

## Props

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `items` | `I[]` | `[]` | The root Items. |
| `itemChildren` | `keyof I \| (item) => I[] \| null \| undefined` | `'children'` | See [Items and Nodes](#items-and-nodes). |
| `itemLabel` | `keyof I \| (item) => string` | `'label'` | See [Items and Nodes](#items-and-nodes). |
| `itemValue` | `keyof I \| (item) => V` | the whole Item | What `v-model` holds. See [Gotchas](#gotchas). |
| `itemKey` | `keyof I \| (item) => Key` | `itemValue` | Identity. See [Items and Nodes](#items-and-nodes). |
| `itemDisabled` | `keyof I \| (item) => boolean` | — | See [Selection](#selection). |
| `multiple` | `boolean` | `false` | Several Nodes can be selected, and `v-model` becomes an array. |
| `selectParents` | `boolean` | `true` | Parent Nodes can be selected. |
| `disabled` | `boolean` | `false` | Removes the Tree from the tab order and ignores every interaction. |
| `modelValue` | `V \| null`, or `V[]` with `multiple` | — | The selection. See [Selection](#selection). |
| `expanded` | `Key[]` | `[]` | The Keys of the Expanded Parent Nodes. |

## Events

| Event | Payload | When |
| --- | --- | --- |
| `update:modelValue` | `V \| null`, or `V[]` with `multiple` | A Node is selected, or deselected in `multiple`. |
| `update:expanded` | `Key[]` | A Parent Node expands or collapses. |

## Slots

Every slot receives the same props:

| Prop | Type | Meaning |
| --- | --- | --- |
| `item` | `I` | The Item. |
| `node` | `TreeNode<I>` | The Node: `key`, `value`, `label`, `level`, `parent`, `children`. |
| `level` | `number` | 1 for a root Node. |
| `expanded` | `boolean` | The Node is an Expanded Parent Node. |
| `selected` | `boolean` | The Node is a Selected Node. |
| `focused` | `boolean` | The Node has DOM focus. |
| `disabled` | `boolean` | The Node or the Tree is disabled. |

| Slot | Content |
| --- | --- |
| `item` | The whole row after the toggle. It replaces the three slots below. |
| `item-leading` | Before the label, for example an icon. Empty by default. |
| `item-label` | The label. Defaults to the Label. |
| `item-trailing` | At the end of the row, for example a count. |

The toggle is not part of any slot, so a custom row keeps its expand affordance.

```vue
<script setup lang="ts">
import Tree from '~/components/base/tree/Tree.vue'

const items = [{ path: 'src', name: 'src', children: [{ path: 'src/main.ts', name: 'main.ts' }] }]
</script>

<template>
  <Tree :items="items" item-key="path" item-label="name" aria-label="Files">
    <template #item-leading="{ item, expanded }">
      <Icon :name="item.children ? (expanded ? 'ph:folder-open' : 'ph:folder') : 'ph:file'" />
    </template>
  </Tree>
</template>
```

A worked file explorer, a `multiple` Tree and a Tree without selection are in
`pages/playground/tree.vue`.

## Keyboard

The keys act on the Focused Node and move over the Visible Nodes: the Nodes whose ancestors
are all Expanded.

| Key | Action |
| --- | --- |
| `ArrowDown` / `ArrowUp` | Moves to the next or previous Visible Node. Stops at the ends. |
| `ArrowRight` | On a collapsed Parent Node, expands it. On an Expanded one, moves to its first child. |
| `ArrowLeft` | On an Expanded Parent Node, collapses it. Otherwise moves to the parent. |
| `Home` / `End` | Moves to the first or last Visible Node. |
| `Enter` / `Space` | Selects the Node. On a Node that cannot be selected, toggles a Parent Node. |
| `*` | Expands every Parent Node among the siblings of the Focused Node. |
| Printable characters | Typeahead: moves to the next Visible Node whose Label starts with the typed text. |

Disabled Nodes are not skipped. `PageUp` and `PageDown` are not Tree keys, so they scroll the page.

## Accessibility

- The root is `role="tree"`, each row is `role="treeitem"`, and each child list is
  `role="group"`. The row carries `aria-level`, `aria-posinset`, `aria-setsize`,
  `aria-expanded` on a Parent Node, and `aria-disabled` on a disabled Node.
- `aria-selected` is on every Leaf Node, and on every Parent Node unless `selectParents` is
  `false`. A disabled Node has it too, as `false`. No Node of a Tree without `v-model` has it.
  `aria-multiselectable` is on the root under `multiple`.
- **Focus.** The Tree roves real DOM focus. It is one tab stop: Tab enters at the Selected
  Node, or at the nearest ancestor of a hidden Selected Node that is a Visible Node, or at the
  first Node. In `multiple`, the first Selected Node in tree order counts. A Selected Node
  without `aria-selected` does not count.
- When the Focused Node stops being visible (its parent collapses, or its Item leaves
  `items`), focus moves to its nearest ancestor that is a Visible Node, and does not go to
  `<body>`.
- The toggle is `aria-hidden`. The keyboard and `aria-expanded` replace it.

## Styling

The styles are in `assets/css/components/tree.css`. The expand animation and the turn of the
toggle stop under `prefers-reduced-motion: reduce`.

| Hook | Element |
| --- | --- |
| `data-slot="tree"` | The root. |
| `data-slot="tree-row"` | A row. Style its state with `[aria-selected="true"]` and `[aria-disabled="true"]`: unselected rows have `aria-selected="false"`, so `[aria-selected]` alone matches them too. |
| `data-slot="tree-toggle"` | The toggle. |
| `data-slot="tree-label"` | The label in the default row. Not present under a custom `item` slot. |
| `data-slot="tree-group"` | A child list with its guide line. |

`class` and other attributes go on the root.

## Gotchas

- **Omitting `itemValue` requires `itemKey`.** Without it the whole Item becomes the Key, Nodes
  cannot be matched by identity, and a Value restored from JSON does not resolve.
- **The Tree renders every Visible Node.** It has no virtual mode, so a Tree with thousands of
  Expanded Nodes renders thousands of rows.
- **Keep `items` the same array between renders.** A key press or a selection re-renders only
  the rows it changes. A new `items` array, such as `:items="buildTree()"` in the template,
  builds every Node again and re-renders every row.
- **Define function accessors outside the template.** An inline `:item-label="(i) => i.name"`
  is a new function on each render of the parent. The Tree then builds every Node again and
  re-renders every row. Define the function in `<script setup>` and pass it by name.
- **Children are not loaded on demand.** Load them before you expand the Parent Node.
- **No drag and drop.** The Tree does not reorder Nodes.
