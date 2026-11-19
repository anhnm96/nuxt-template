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

- Enter, Space or a click selects. By default the arrow keys move the focus only, so a watcher
  on `v-model` does not run on each arrow key. `selectionBehavior: 'replace'` changes this.
- A plain click on a Parent Node row selects it and toggles it. A click on the toggle only
  toggles. See [Clicks](#clicks).
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

### Selection Behavior

`selectionBehavior` sets how a plain click changes the selection. It applies to a single Tree
and to a multiple Tree.

| Gesture | `toggle` (default) | `replace` |
| --- | --- | --- |
| Click | Toggles one Node. | Selects only this Node. |
| Ctrl+click | Same as a click. | Toggles one Node and keeps the others. |
| Shift+click | Every Node of the Range takes the new state of the clicked Node. | Replaces the selection with the Range. |
| Ctrl+Shift+click | Same as Shift+click. | Adds the Range to the selection. |
| Arrow keys | Move focus only. | Move focus, and select only the Focused Node. |

On macOS, ⌘ replaces Ctrl. In a single Tree, Ctrl and Shift do nothing extra. A single Tree
under `toggle` never clears its model on a click.

A **Range** is the Visible Nodes from the **Anchor Node** to the clicked or Focused Node. A
Node inside a collapsed Parent Node is never in a Range, and a Node that cannot be selected
keeps its state. A Range without a Node that can be selected changes nothing.

A gesture without Shift that changes the selection sets the Anchor Node: a click, Enter,
Space, or `toggleSelected`. Under `replace`, a key that moves the selection sets it too. Under
`toggle`, a key that only moves focus does not. Shift never moves it. Without an Anchor Node,
the Focused Node before the gesture is the Anchor Node. Without either, a Shift gesture works
as the same gesture without Shift.

Use `replace` for a master–detail layout, where the detail follows the arrow keys. It writes
`v-model` on each arrow key.

### Checkboxes

`checkboxes` shows a checkbox on each row. The checkbox is a view of the selection and not a
second state: a checked box is a Selected Node. See
[ADR-0018](../../../../docs/adr/0018-tree-checkbox-is-a-view-of-the-selection.md).

```vue
<script setup lang="ts">
import Tree from '~/components/base/tree/Tree.vue'

const items = [{ id: 'src', label: 'src', children: [{ id: 'main', label: 'main.ts' }] }]
const selected = ref<string[]>([])
</script>

<template>
  <Tree v-model="selected" :items="items" item-value="id" multiple checkboxes aria-label="Files" />
</template>
```

- It requires `multiple`, `selectionBehavior: 'toggle'` and `v-model`. Otherwise the Tree shows
  no checkbox, and warns in development.
- A click on the checkbox selects as a click on the row does, but never expands.
- A Node without a selection state has an empty checkbox column. A disabled Node has a disabled
  checkbox.
- A checked Parent Node does not check its children. There is no indeterminate state.
- The `item-checkbox` slot replaces the built-in checkbox, for a different design. Render a
  picture only: the slot is inside an `aria-hidden` element, and the row must keep focus. Give
  a native input `tabindex="-1"` and `pointer-events: none`, as the built-in checkbox has. Do
  not put a button or a focusable element in it.

### Clicks

A plain click on a Parent Node row also expands or collapses it. `:expand-on-click="false"`
turns this off. These clicks never expand, whatever the prop says:

- A click with Ctrl or Shift.
- A click on the checkbox.

A click on a Node that cannot be selected always expands or collapses it. Otherwise the click
does nothing.

`rowClick` and `toggleClick` fire before the Tree acts. Call `event.preventDefault()` in the
handler to cancel the default:

```vue
<script setup lang="ts">
import type { TreeClickPayload } from '~/components/base/tree/Tree.vue'
import Tree from '~/components/base/tree/Tree.vue'

interface Page { id: string, label: string, url?: string }

const items: Page[] = [{ id: 'docs', label: 'Docs', url: '/docs' }]
const selected = ref<string | null>(null)

function onRowClick({ node, event }: TreeClickPayload<Page>) {
  if (!node.item.url) return
  // Navigates instead of selecting.
  event.preventDefault()
  navigateTo(node.item.url)
}
</script>

<template>
  <Tree v-model="selected" :items="items" item-value="id" aria-label="Pages" @row-click="onRowClick" />
</template>
```

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
| `selectionBehavior` | `'toggle' \| 'replace'` | `'toggle'` | How a plain click changes the selection. See [Selection Behavior](#selection-behavior). |
| `expandOnClick` | `boolean` | `true` | A plain click on a Parent Node row also expands or collapses it. See [Clicks](#clicks). |
| `checkboxes` | `boolean` | `false` | Shows a checkbox on each row. See [Checkboxes](#checkboxes). |
| `disabled` | `boolean` | `false` | Removes the Tree from the tab order and ignores every interaction. |
| `modelValue` | `V \| null`, or `V[]` with `multiple` | — | The selection. See [Selection](#selection). |
| `expanded` | `Key[]` | `[]` | The Keys of the Expanded Parent Nodes. |

## Events

| Event | Payload | When |
| --- | --- | --- |
| `update:modelValue` | `V \| null`, or `V[]` with `multiple` | The selection changes. |
| `update:expanded` | `Key[]` | A Parent Node expands or collapses. |
| `rowClick` | `{ node, event }` | A row or its checkbox is clicked, before the Tree acts. `event.preventDefault()` cancels the selection and the expansion. |
| `toggleClick` | `{ node, event }` | The toggle is clicked, before the Tree acts. `event.preventDefault()` cancels the expansion. |

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
| `toggleExpanded` | `() => void` | Expands or collapses the Node. |
| `toggleSelected` | `() => void` | Adds or removes this one Node and keeps the others, under both Selection Behaviors. Sets the Anchor Node. |

Use the two actions from custom content in a row, such as a pin button. Stop the click in
your handler, or the row receives it too.

| Slot | Content |
| --- | --- |
| `item` | The row after the toggle and the checkbox. It replaces the three slots below. |
| `item-checkbox` | Replaces the built-in checkbox. Only rows that show a checkbox render it. |
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
| `Enter` / `Space` | Selects the Node, as a click does. On a Node that cannot be selected, toggles a Parent Node. |
| `*` | Expands every Parent Node among the siblings of the Focused Node. |
| Printable characters | Typeahead: moves to the next Visible Node whose Label starts with the typed text. |

Disabled Nodes are not skipped. `PageUp` and `PageDown` are not Tree keys, so they scroll the page.

In a multiple Tree, these keys also change the selection:

| Key | `toggle` (default) | `replace` |
| --- | --- | --- |
| `Shift+Space` | Every Node of the Range takes the new state of the Focused Node. | Replaces the selection with the Range. |
| `Ctrl+Space` / `Ctrl+Enter` | Toggles the Focused Node. | Toggles the Focused Node. |
| `Shift+ArrowDown` / `Shift+ArrowUp` | Moves focus, and the new Focused Node takes the state of the Anchor Node. A move back does not clear Nodes. | Moves focus, and replaces the selection with the Range. |
| `Ctrl+ArrowDown` / `Ctrl+ArrowUp` | Moves focus only. | Moves focus only. |
| `Shift+Home` / `Shift+End` | As `Shift+ArrowUp` or `Shift+ArrowDown`, to the first or last Visible Node. | Replaces the selection with the Range to the first or last Visible Node. |

Under `replace`, Ctrl with Shift adds the Range to the selection instead of replacing it, as
`Ctrl+Shift+click` does. This holds for `Ctrl+Shift+Space`, the arrow keys, `Home` and `End`.
Under `toggle`, Ctrl with Shift is the same as Shift.

Enter does what Space does, with the same modifiers. On macOS, ⌘ replaces Ctrl, and macOS
keeps `⌘+Space` for Spotlight, so the page never receives it. Use `⌘+Enter` to toggle one
Node there.

Under `replace`, every other key that moves focus also selects the Focused Node. A Node that
cannot be selected takes focus only, and the selection stays. There is no `Ctrl+A`.

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
- The checkbox is `aria-hidden` and takes no focus. `aria-selected` on the row carries its state,
  so a screen reader announces "selected" and not "checked".

## Styling

The styles are in `assets/css/components/tree.css`. The expand animation and the turn of the
toggle stop under `prefers-reduced-motion: reduce`.

| Hook | Element |
| --- | --- |
| `data-slot="tree"` | The root. |
| `data-slot="tree-row"` | A row. Style its state with `[aria-selected="true"]` and `[aria-disabled="true"]`: unselected rows have `aria-selected="false"`, so `[aria-selected]` alone matches them too. |
| `data-slot="tree-toggle"` | The toggle. |
| `data-slot="tree-checkbox"` | The checkbox column, with `checkboxes`. |
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
