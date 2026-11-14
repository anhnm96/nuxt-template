# Drag and drop

`DragList` is a list the user reorders by dragging, bound with `v-model:list`. `DragItem` is
one drag source, one drop target, or both. Lists and items of the same group exchange items.

Both use the native HTML drag and drop of the browser. There is no keyboard alternative; see
[Accessibility](#accessibility).

This file is how to **use** them. For why they are built this way — the shared drag session,
the landing spot, the rules for `cut`, windowed lists — see [DESIGN.md](./DESIGN.md).

```vue
<script setup lang="ts">
const tasks = ref(['Write', 'Review', 'Ship'])
</script>

<template>
  <DragList v-model:list="tasks">
    <template #default="{ item, index }">
      <p>{{ index + 1 }}. {{ item }}</p>
    </template>
  </DragList>
</template>
```

> **Pinia is required.** The components keep the drag in `useDnDStore`, from `stores/dnd.ts`.
>
> **`DragList` changes the array in place.** Bind a reactive array. See [Gotchas](#gotchas).
>
> **Give `itemKey` when two items can be equal.** The default key of a row is the item itself.

## Parts

- **`DragList`** — a list of rows. Each row is a `DragItem` that the list makes.
- **`DragItem`** — a drag source or a drop target outside a list: a palette entry, a trash can.
- **`useDnDStore`** — the drag in progress. Read `draggingPayload` to show something for the
  item that is dragged.
- **`useDragAutoScroll`** — scrolls a container while a drag is near its top or bottom edge.
  A native drag does not scroll a container.

## Reordering

`reorder` sets how the rows of a list answer to a drag of one of its own items.

| `reorder` | Behaviour |
| --- | --- |
| `immediate` (default) | The dragged row changes places with the row it enters. |
| `placeholder` | The rows stay. The `placeholder` slot shows where the item will land, and the item moves on the drop. |

```vue
<script setup lang="ts">
const tasks = ref(['Write', 'Review', 'Ship'])
</script>

<template>
  <DragList v-model:list="tasks" reorder="placeholder">
    <template #default="{ item, dragging }">
      <p :class="{ 'opacity-40': dragging }">
        {{ item }}
      </p>
    </template>
    <template #placeholder="{ data }">
      <p class="border border-dashed">
        {{ data.value }}
      </p>
    </template>
  </DragList>
</template>
```

The landing spot comes from the cursor and the middle of the row below it. Before the middle,
the item lands before that row; after the middle, it lands after that row. The list shows no
placeholder for the spot that the dragged item already has.

## Moving between lists

Lists with the same `group` exchange items. A list with no `group` is in the same group as
every other list and item with no `group`.

```vue
<script setup lang="ts">
const todo = ref(['Write', 'Review'])
const done = ref<string[]>([])
</script>

<template>
  <div class="flex gap-4">
    <DragList v-model:list="todo" group="task" transfer="cut" class="min-h-20 w-40">
      <template #default="{ item }">
        <p>{{ item }}</p>
      </template>
      <template #placeholder="{ data }">
        <p>{{ data.value }}</p>
      </template>
    </DragList>
    <DragList v-model:list="done" group="task" transfer="cut" class="min-h-20 w-40">
      <template #default="{ item }">
        <p>{{ item }}</p>
      </template>
      <template #placeholder="{ data }">
        <p>{{ data.value }}</p>
      </template>
    </DragList>
  </div>
</template>
```

- **The `placeholder` slot is required to accept an item of another list.** An incoming item
  is not in the list, so the list can only show it as a placeholder. This applies to both
  values of `reorder`. Without the slot the list refuses the drop and writes a warning.
- **`transfer` is a prop of the source list.** With `copy` (default) the item stays in the
  source list. With `cut` the source list removes the item after another target accepts it.
- **`origin` tells the two cases apart** in the `placeholder` slot: `'self'` for an item of
  this list, `'other'` for an item of another list or of a `DragItem`.
- **Give an empty list a size.** The list itself is the drop target when it has no rows.
- **`acceptData` restricts what a list takes.** It gets the payload of the dragged item.
  `false` refuses the drop, `true` allows it, and `undefined` allows it and adds no class.
  The payload can come from a `DragItem` of the same group, so read it defensively.

## DragItem alone

A `DragItem` drags when `draggable` is true and accepts drops when `droppable` is true. Both
are true by default.

```vue
<script setup lang="ts">
import type { DraggingPayload } from '~/stores/dnd'

const colors = ['red', 'green', 'blue']
const picked = ref<string[]>([])

function onDropped({ source }: { source: DraggingPayload | null }) {
  if (typeof source?.value === 'string') picked.value.push(source.value)
}
</script>

<template>
  <div>
    <DragItem
      v-for="color in colors"
      :key="color"
      group="color"
      :droppable="false"
      :payload="{ value: color }"
    >
      {{ color }}
    </DragItem>

    <DragItem group="color" :draggable="false" class="h-20" @dropped="onDropped">
      {{ picked.join(', ') }}
    </DragItem>
  </div>
</template>
```

`payload` can have any shape. Put the dragged thing in `value` if a `DragList` must accept
the item: `value` is what the list inserts.

## Drag handle

`handle` is a CSS selector. With it, a row or an item drags only from an element that matches
inside it.

```vue
<script setup lang="ts">
const tasks = ref(['Write', 'Review', 'Ship'])
</script>

<template>
  <DragList v-model:list="tasks" handle=".grip">
    <template #default="{ item }">
      <p>
        <button type="button" class="grip">
          ☰
        </button>
        {{ item }}
      </p>
    </template>
  </DragList>
</template>
```

## Drag image

The `drag-image` slot replaces the drag image of the browser. Its content follows the cursor
and is centred on it. The content can change during the drag.

```vue
<script setup lang="ts">
const tasks = ref(['Write', 'Review', 'Ship'])
</script>

<template>
  <DragList v-model:list="tasks">
    <template #default="{ item }">
      <p>{{ item }}</p>
    </template>
    <template #drag-image="{ item, width }">
      <p class="bg-white shadow" :style="{ width: `${width}px` }">
        {{ item }}
      </p>
    </template>
  </DragList>
</template>
```

A `DragItem` with this slot also sends a `customdrag` event from its root during the drag.
It is a `MouseEvent` with the cursor position. Use it instead of the native `drag` event,
because Firefox reports the position `0, 0` on that event.

## Direction

The list reads the landing spot along one axis. It takes the axis from its own layout: a
flex row is horizontal, and every other layout is vertical. Set `axis` for a grid of several
tracks or for a flex row that wraps, where the layout does not give one axis.

## Virtual lists

`visible` is for a list that a virtualizer renders in part. `list` stays the whole list, and
`visible` names the part to render. Each index stays a position in the whole list, so an item
can move to a part that is not rendered.

```vue
<script setup lang="ts">
const items = ref(Array.from({ length: 500 }, (_, id) => ({ id, text: `Item ${id}` })))

const { list, containerProps, wrapperProps } = useVirtualList(items, { itemHeight: 40 })
const visible = computed(() => ({
  offset: list.value[0]?.index ?? 0,
  count: list.value.length,
}))

useDragAutoScroll(containerProps.ref)
</script>

<template>
  <div v-bind="containerProps" class="h-80 overflow-y-auto">
    <div v-bind="wrapperProps">
      <DragList
        v-model:list="items"
        :visible
        reorder="placeholder"
        :item-key="item => item.id"
      >
        <template #default="{ item }">
          <p class="h-10">
            {{ item.text }}
          </p>
        </template>
        <template #placeholder>
          <p class="h-10 border border-dashed" />
        </template>
      </DragList>
    </div>
  </div>
</template>
```

- The list keeps the dragged row mounted while it is scrolled out of the rendered part.
- A list with `visible` does not animate rows that enter or leave.
- A drop on a landing spot that is scrolled out of the rendered part is refused.
- Do not add or remove `visible` during a drag. The change mounts the rows again.

## API

### DragList

#### Props

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `list` | `T[]` | — *(required)* | The items. The model of `v-model:list`. |
| `id` | `string` | generated | The id of the list in the store and on its root element. |
| `itemKey` | `(item: T) => PropertyKey` | the item | The `v-for` key of a row. |
| `tag` | `string` | `'div'` | HTML tag of the list. |
| `itemTag` | `string` | `'div'` | HTML tag of each row. |
| `handle` | `string` | — | Selector of the drag handle in a row. See [Drag handle](#drag-handle). |
| `enterZone` | `string` | — | Selector of the part of a row that counts as entered. |
| `group` | `string` | — | Only lists and items of one group interact. Also on the root as `data-group`. |
| `acceptData` | `(payload?: DraggingPayload) => boolean \| undefined` | `() => undefined` | Restricts what the list takes. See [Moving between lists](#moving-between-lists). |
| `transfer` | `'copy' \| 'cut'` | `'copy'` | What happens to an item of this list when another target accepts it. |
| `reorder` | `'immediate' \| 'placeholder'` | `'immediate'` | See [Reordering](#reordering). |
| `axis` | `'vertical' \| 'horizontal'` | from the layout | See [Direction](#direction). |
| `visible` | `{ offset: number, count: number }` | — | The part of `list` to render. See [Virtual lists](#virtual-lists). |

#### Events

| Event | Payload | When |
| --- | --- | --- |
| `update:list` | `T[]`, the same array | The list inserted an item of another source, or removed an item for `cut`. Not sent for a reorder. |

#### Slots

| Slot | Props | Content |
| --- | --- | --- |
| `default` | `item`, `index`, `dragging` | One row. `index` is the position in `list`. `dragging` is true for the row that is dragged. |
| `placeholder` | `origin`, `data` | The landing spot. `data` is the payload of the dragged item; `data.value` is only assumed to be a `T`. |
| `drag-image` | `item`, `index`, `data`, `width`, `height` | Follows the cursor. `width` and `height` are the size of the row when it mounted. |

### DragItem

#### Props

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `as` | `string` | `'div'` | HTML tag of the root element. |
| `draggable` | `boolean` | `true` | The item is a drag source. |
| `droppable` | `boolean` | `true` | The item is a drop target. |
| `payload` | `P` | — | What the drag carries. See [DragItem alone](#dragitem-alone). |
| `dropEffect` | `'copy' \| 'move' \| 'link' \| 'none'` | `'move'` | The cursor while a drag is over this item. The `effectAllowed` of the source must permit it, or the browser refuses the drop. |
| `effectAllowed` | `'none' \| 'copy' \| 'copyLink' \| 'copyMove' \| 'link' \| 'linkMove' \| 'move' \| 'all' \| 'uninitialized'` | `'move'` | The drop effects that are permitted while this item is dragged. |
| `hoverClass` | `string` | `'drop-hover'` | Class of a drop target while a drag it can take is over it. |
| `handle` | `string` | — | Selector of the drag handle. |
| `enterZone` | `string` | — | Selector of the part of the item that counts as entered. |
| `group` | `string` | — | Only lists and items of one group interact. |
| `acceptData` | `(payload?: DraggingPayload) => boolean \| undefined` | `() => undefined` | `false` refuses the drop. `undefined` allows it and adds no class. |
| `allowClass` | `string` | `'drop-allowed'` | Class of a drop target during a drag when `acceptData` returns `true`. |
| `forbiddenClass` | `string` | `'drop-forbidden'` | Class of a drop target during a drag when `acceptData` returns `false`. |

#### Events

| Event | Payload | When |
| --- | --- | --- |
| `dropped` | `{ event, source, target }` | The item accepted a drop. `source` is the payload of the dragged item, `target` is the `payload` of this item. |
| `customdrag` | `MouseEvent` | A native event on the root, during a drag of this item. Sent only with the `drag-image` slot. |

The native drag events (`dragstart`, `dragend`, `dragenter`, `dragleave`) reach a listener on
the component, because the listener goes to the root element.

#### Slots

| Slot | Props | Content |
| --- | --- | --- |
| `default` | `dragging` | The content. `dragging` is true while this item is dragged. |
| `drag-image` | `data`, `width`, `height` | Follows the cursor. `data` is the `payload` of this item. |

### Store

`useDnDStore` and its types are in `stores/dnd.ts`.

| Member | What it gives |
| --- | --- |
| `isDragging` | True while a drag is in progress. |
| `draggingPayload` | The payload of the dragged item, or `null`. |
| `isGroupActive(group)` | True while the dragged item is of `group`. |
| `DraggingPayload<T>` | `{ value: T, index?: number }`. The shape a drop target reads. |
| `isDragListPayload(payload)` | True when a `DragList` started the drag, so `index` is a number. |

## Accessibility

The components add no role and no keyboard behaviour. A user who cannot use a pointer cannot
reorder a `DragList`. Give that user another way to do the same work, for example buttons
that move a row up and down.

A drag handle answers to `mousedown` only.

## Styling

The components publish classes and attributes, and no custom properties.

| Hook | On | When |
| --- | --- | --- |
| `.drag-list` | List root | Always. |
| `[data-group]` | List root | The `group` of the list. |
| `.drag-container` | Each row, each `DragItem` | Always. |
| `[data-index]` | Each row that holds an item | The position in `list`. |
| `[data-dragging]` | The row or item that is dragged | During the drag. |
| `.drag-placeholder` | The placeholder row | While it is rendered. |
| `.drag-placeholder--self`, `.drag-placeholder--other` | The placeholder row | By `origin`. |
| `.drag-list--move` | A row | While the row moves to a new place. The transition of the move is `transform 0.2s ease-out`. |
| `.drop-hover` | A drop target | See `hoverClass`. |
| `.drop-allowed`, `.drop-forbidden` | A drop target | See `allowClass` and `forbiddenClass`. |

The list root is `position: relative`. The placeholder row is a row, so give it the size and
the margins of a row, or the rows move when it appears.

## Gotchas

- **The array is changed in place.** A reorder moves the item in the array you bound and sends
  no event. `update:list` is sent for an insert and for a `cut`, with the same array. A
  `watch` on the array needs `{ deep: true }`, and an array that is not reactive does not
  render the change.
- **A drop target that holds another drop target keeps `hoverClass`** while the cursor is
  over the inner one. Both have the class then.
- **Lists with no `group` are one group.** Give each set of lists its own `group`.
- **A list accepts an incoming item only with a `placeholder` slot**, and only an item whose
  payload has a `value`.
- **`cut` needs a successful drop on another target.** A drop outside every target leaves
  the item where it was.
- **An item cannot go into a list that is inside it.** A row that holds a nested list cannot
  be dropped into that list.
- **`width` and `height` of the `drag-image` slot are measured one time,** when the row or
  item mounts.
- **The payload is also written to the native drag as JSON.** A payload with a circular
  reference throws when the drag starts.
- **`hoverClass` is one class name.** A value with a space throws when a drag enters.
- **`useDragAutoScroll` scrolls vertically only.**

Worked examples are in `pages/playground/dnd.vue`.
