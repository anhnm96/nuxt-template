# Menu

A list of commands, or of one-of-N property setters. Use it for a toolbar popover, a
context menu, or anywhere a list of things to *do* belongs.

Do not use it to choose a value. A Menu holds no value and emits no model; the thing it
commands owns the value. [`base/select`](../select/README.md) is the component for choosing
one. [ADR-0009](../../../../docs/adr/0009-menus-are-menus-not-listboxes.md) explains why the
two are separate.

Terms in Title Case are defined in [CONTEXT.md](../../../../CONTEXT.md). For why the
component is built this way, see [DESIGN.md](./DESIGN.md).

## Shape

```
base/menu/
  Menu.vue           role="menu", roving tabindex, keyboard, Typeahead
  MenuItem.vue       role="menuitem" or menuitemradio (NOT a <button>)
  MenuGroup.vue      role="group", bounds a set of Checked Items
  MenuSeparator.vue  role="separator", skipped by navigation
  context.ts         createContext, per the house pattern
```

A Menu owns no placement. A **Menu Host** positions it and dismisses it:

| Host | Use when | Docs |
| --- | --- | --- |
| [`Dropdown`](../dropdown/README.md) | A trigger element opens the Menu | `<template #popover>` |
| [`ContextMenu`](../context-menu/README.md) | A right-click opens the Menu at a point | Renders its own Menu |

## Commands

```html
<Dropdown placement="bottom-start">
  <button class="btn btn-text btn-icon">Table</button>
  <template #popover>
    <Menu label="Table">
      <MenuItem label="Add row above" @select="addRowBefore()">
        Add row above
      </MenuItem>
      <MenuItem label="Remove row" :disabled="!canRemoveRow" @select="removeRow()">
        Remove row
      </MenuItem>
      <MenuSeparator />
      <MenuItem label="Delete table" @select="deleteTable()">
        Delete table
      </MenuItem>
    </Menu>
  </template>
</Dropdown>
```

The Host closes by itself when an item is activated. Do not call `toggleShow(false)` as well.

## Checked Items

Bind `checked` to make a row report a value its host already owns. The row becomes
`menuitemradio`, draws a tick, and the Menu opens on it instead of on the first row.

Wrap the set in a `MenuGroup`. It carries `role="group"`, which is what tells a screen
reader where the set starts and stops.

```html
<Menu label="Font size">
  <MenuGroup>
    <MenuItem
      v-for="size in sizes"
      :key="size"
      :label="size"
      :checked="size === currentSize"
      @select="setFontSize(size)"
    >
      {{ size }}
    </MenuItem>
  </MenuGroup>
</Menu>
```

`checked` is **bind-detected**. A row with no `checked` binding is a plain command. Pass
`:checked="false"` for the unchecked rows of a set; omitting it makes them commands, and
a screen reader then never says which size is current.

The Group above is unnamed on purpose: the Menu's own label already says "Font size", and
naming the Group the same thing has it announced twice. Name a Group only when one Menu
holds **more than one** set, where the Menu's single name cannot tell them apart:

```html
<Menu label="Formatting">
  <MenuGroup label="Size">
    <MenuItem :checked="size === 11" @select="setSize(11)">11</MenuItem>
  </MenuGroup>
  <MenuGroup label="Alignment">
    <MenuItem :checked="align === 'left'" @select="setAlign('left')">Left</MenuItem>
  </MenuGroup>
</Menu>
```

`label` draws a visible heading and names the Group from it. Use `labelledBy` instead to
name it from an element elsewhere, which draws no heading.

## API

### Menu

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `label` | `string` | — | Names the Menu for a screen reader. Give this or `labelledBy`. |
| `labelledBy` | `string` | — | Id of the element that names the Menu. |

| Slot | Props | Content |
| --- | --- | --- |
| `default` | — | The Menu Items, separators and anything else the Menu draws. |

| Exposed | Signature | What it does |
| --- | --- | --- |
| `focus` | `() => void` | Moves real focus to the Checked Item, else the first enabled item. |

**Styling hooks:** `data-slot="menu"`

### MenuItem

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `disabled` | `boolean` | `false` | Cannot be activated, and the keyboard steps over it. |
| `checked` | `boolean` | `undefined` | Makes the row a Checked Item. Binding it at all switches the role to `menuitemradio`. |
| `label` | `string` | `undefined` | Matched by Typeahead. Defaults to the row's own trimmed text. |

| Event | Payload | When |
| --- | --- | --- |
| `select` | — | The row is activated by click, `Enter` or `Space`. The Host is dismissed straight after. |

| Slot | Props | Content |
| --- | --- | --- |
| `default` | `checked`, `disabled` | The row's content. Falls back to `label`. |

**Styling hooks:** `data-slot="menu-item"`, plus `data-checked` and `data-disabled`.

### MenuGroup

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `label` | `string` | — | The heading to draw, which also names the Group. Give this or `labelledBy`. |
| `labelledBy` | `string` | — | Names the Group from an element elsewhere, and draws no heading. |

| Slot | Props | Content |
| --- | --- | --- |
| `default` | — | The Menu Items in the Group. |
| `label` | — | Replaces the heading's content. Needs `label` to be set, which is what draws the heading. |

**Styling hooks:** `data-slot="menu-group"`, `data-slot="menu-group-label"`

### MenuSeparator

No props, no events. **Styling hooks:** `data-slot="menu-separator"`

## Keyboard

Movement is over the Menu Items, and it steps over disabled items, separators and Group
headings. Groups do not bound it: arrows cross from one Group into the next, and wrapping
goes round the whole Menu.

| Key | Behaviour |
| --- | --- |
| `ArrowDown` / `ArrowUp` | ±1, **wrapping** at the ends |
| `Home` / `End` | First / last enabled item |
| `PageDown` / `PageUp` | ±10, clamped at the ends |
| `Enter` / `Space` | Activate the Focused Item, then dismiss the Host |
| printable character | Typeahead to the next matching Label. Repeating one character walks the rows starting with it |
| `Tab` | Dismiss the Host, activate nothing |
| `Shift`+`F10`, context-menu key | Swallowed. A Menu is already a context menu, and the browser's own would open on top of it |
| `Escape` | The Host dismisses. The Menu does not handle it. |

Arrow keys wrap here, where `Select`'s clamp. Each follows its own APG pattern; see
[DESIGN.md](./DESIGN.md).

## Accessibility

- The Menu is `role="menu"`. Items are `role="menuitem"`, or `role="menuitemradio"` with
  `aria-checked` once `checked` is bound.
- **Put Checked Items in a `MenuGroup`.** `role="group"` is what bounds the set, so a
  reader can say where it starts and stops. A Menu with two ungrouped sets reads as one
  run of rows.
- **Give the Menu a `label` or a `labelledBy`.** Without one, a set of Checked Items is
  announced as a bare "11, checked", with no hint that it is a font size. A development
  build warns when both are missing.
- **Opening a Menu moves focus into it**, onto the Checked Item or the first enabled item,
  however the Host was opened — click, `Enter` or `ArrowDown`. So the keyboard works
  straight away, without an arrow key or a hover first.
- Exactly one item holds `tabindex="0"`, so `Tab` leaves the Menu rather than walking it.
  When **every** item is disabled, the Menu takes the tab stop itself, so there is still a
  keyboard route in and `Escape` still reaches the Host.
- The Focused Item holds real DOM focus, so the browser scrolls it into view. This is the
  opposite of `Select`, whose options never hold focus
  ([ADR-0001](../../../../docs/adr/0001-select-uses-aria-activedescendant.md)).
- Hovering an item focuses it, so arrowing after pointing continues from the pointer.

## Gotchas

- **`checked` is bind-detected, not truth-tested.** `:checked="false"` is a radio reporting
  "not current". No `checked` at all is a command. These are different in the accessibility
  tree.
- **A `MenuItem` is a `div`, not a `<button>`.** This is deliberate: `aria-disabled` on a div
  gives a disabled row a screen reader can still find and report as unavailable, which a
  natively disabled button does not. Do not "fix" the element.
- **Typeahead reads the rendered text unless you pass `label`.** A row of icon plus text
  reads as whitespace-padded junk, so pass `label` whenever a row holds anything but text.
- **Items are found in the DOM, not registered.** A Menu Item has to render a
  `role="menuitem*"` element the Menu can find. Wrapping items in your own markup is fine;
  replacing `MenuItem` with a hand-rolled row is not.
- **A Group does not bound navigation**, only announcement. Arrows cross from one Group
  into the next, and wrapping goes round the whole Menu.
- **No submenus, and no checkbox items.** No call site needs either. `menuitemcheckbox`
  would be additive; submenus would not — see [DESIGN.md](./DESIGN.md).
- **`Select` is not built on this.** It keeps its own popup and its own focus model.
