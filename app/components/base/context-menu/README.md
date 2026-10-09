# ContextMenu

A [Menu](../menu/README.md) summoned by right-click on its Anchor. It is a Menu Host: it
positions the Menu and dismisses it.

It renders the Menu itself, so put Menu Items straight into its default slot.

Terms in Title Case are defined in [CONTEXT.md](../../../../CONTEXT.md). For why it is
shaped like `Tooltip` rather than built on `Dropdown`, see [DESIGN.md](./DESIGN.md).

## Use

Write it **inside** the element it belongs to. It renders no element of its own, and by
default it anchors to its parent and listens there for `contextmenu`.

```html
<div class="row">
  {{ row.name }}
  <ContextMenu :label="row.name">
    <MenuItem label="Add" @select="add(row)">Add</MenuItem>
    <MenuItem label="Delete" :disabled="row.locked" @select="remove(row)">Delete</MenuItem>
  </ContextMenu>
</div>
```

One instance per row, not one shared instance that every row aims. Each menu anchors to its
own row, so nothing has to be pointed at a target before it opens.

Pass the row straight to the handler, as above. **Do not record it from `@contextmenu`**
into a page-level ref — see the gotcha below.

## API

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `target` | `true \| string \| HTMLElement` | `true` | The Anchor. `true` means the parent element. Vue cannot check this type at runtime, so a wrong value fails silently. |
| `atCursor` | `boolean` | `true` | Position at the pointer. Falls back to the Anchor's box when the Menu opened without coordinates. |
| `placement` | `Placement` | `'bottom-start'` | floating-ui placement. |
| `offset` | `number` | `4` | Gap, in px. |
| `disabled` | `boolean` | `false` | Never opens. Dismissal still works, so disabling mid-interaction cannot strand an open Menu. |
| `label` | `string` | — | Names the Menu for a screen reader. Give this or `labelledBy`. |
| `labelledBy` | `string` | — | Id of the element that names the Menu. |

| Model | Type | Default | What it does |
| --- | --- | --- | --- |
| `v-model:open` | `boolean` | `false` | Whether the Menu is open. Optional — it manages itself. Setting it to `true` yourself opens against the Anchor's box, because there is no pointer behind it. |

| Slot | Props | Content |
| --- | --- | --- |
| `default` | — | The Menu Items. Rendered inside a `Menu`. |

| Exposed | Signature | What it does |
| --- | --- | --- |
| `open` | `(coords?: { x, y }) => void` | Opens it. With no coordinates it anchors to the Anchor's box. |
| `dismiss` | `() => void` | Closes it. |

**Styling hooks:** `data-slot="context-menu"`

## Behaviour

| Gesture | Result |
| --- | --- |
| Right-click the Anchor | Opens at the pointer, and replaces the browser's own menu |
| `Shift`+`F10`, or the context-menu key | Opens against the Anchor's box. Pressed again while the Menu is open, it is swallowed rather than summoning the browser's own menu |
| Right-click the same Anchor again | Moves the open Menu to the new point |
| Right-click elsewhere | Closes this Menu; the other Anchor opens its own |
| Click outside | Closes |
| `Escape` | Closes |
| Activate an item | Closes |

Focus moves into the Menu when it opens, onto the Checked Item or the first enabled item.
When it closes, focus returns to wherever it was.

For the keymap inside the Menu, see [Menu's README](../menu/README.md#keyboard).

## Gotchas

- **It must be written inside its Anchor.** `target: true` resolves to the parent of the
  placeholder it renders, so moving it to a sibling silently anchors to the wrong element.
- **`@contextmenu` on the Anchor is not "the menu opened".** The keyboard summon opens the
  Menu from a `keydown`, and no `contextmenu` event follows it in Chrome. A page that
  records the current row from `@contextmenu` therefore acts on whatever row was last
  *right-clicked*, which may be a different one or none. Take the row from the slot's own
  scope and pass it to the handler instead.
- **Keyboard summoning needs a focusable Anchor.** `Shift`+`F10` reaches the component only
  when the Anchor, or something inside it, holds focus. A plain `div` row does not, so give
  it a `tabindex` if keyboard users need the Menu.
- **It does not set `aria-haspopup` on the Anchor.** The Anchor is an element the component
  does not own, so it is left untouched. A `Dropdown` trigger gets this for free.
- **`target` is unchecked at runtime.** The declared `true | string | HTMLElement` compiles
  to `[Boolean, String]` with `skipCheck`, so Vue checks nothing.
