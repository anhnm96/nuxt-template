# Popover

The positioning and dismissal machinery behind every popup in this library. Floating UI places
it, and it is teleported out of the DOM flow so no `overflow: hidden` ancestor can clip it.

Three parts, at three levels. **Pick the highest one that fits:**

| Use | When |
| --- | --- |
| [`Dropdown`](../dropdown/README.md) | A button opens the popup. It merges the click handler and the ARIA onto your element. |
| **`<Popover>`** | You have a reference *element*, but it supplies its own ARIA or owns its own keys. |
| `usePopover` + `<PopoverSurface>` | You have no reference element at all — `ContextMenu` anchors to a cursor point. |

`<Popover>` is the middle one: a reference element paired with a Popover, merging **nothing**
onto the trigger. `Dropdown` is `<Popover>` plus the trigger merge. See
[Which one do I want?](#which-one-do-i-want).

```vue
<Popover v-model:open="isOpen" placement="bottom-start" slot-name="my-thing">
  <template #default="{ toggleShow }">
    <MyControl @click="toggleShow()" />
  </template>

  <template #popover>
    <div class="popover-list">
      <!-- your rows -->
    </div>
  </template>
</Popover>
```

Whatever you put in the default slot **becomes the reference**: `Popover` positions against it
and measures it, but puts nothing on it. No click handler, no `aria-*`, no keyboard. That is
the difference from `Dropdown`, and the reason `Select` and the Field Popovers use this — their
controls already carry their own ARIA and own their own keys.


> **Requires a teleport host.** `app.vue` renders `<div class="popovers" />`, and the surface
> teleports there. In a unit test you must create it yourself or nothing renders:
> ```ts
> const host = document.createElement('div')
> host.className = 'popovers'
> document.body.appendChild(host)
> ```

## `<Popover>`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `v-model:open` | `boolean` | `false` | The open state. Yours to drive; a Host usually keeps its own ref. |
| `placement` | `Placement` | `'bottom'` | Any Floating UI placement. |
| `offset` | `number` | `4` | Gap between reference and surface, in px. |
| `disabled` | `boolean` | `false` | Blocks **opening**. An open Popover can still be dismissed. |
| `transition` | `string` | `'popover'` | Vue transition name. |
| `dismissOnClickOutside` | `boolean` | `true` | Whether a click outside dismisses. |
| `restoreFocus` | `boolean` | `true` | Whether closing returns focus to whatever held it when the Popover opened. Turn **off** when the reference keeps focus throughout, as a text input does. |
| `whiteList` | `string[]` | — | Selectors that click-outside treats as inside. |
| `popoverProps` | `PtSlot<HTMLAttributes>` | — | Attributes merged onto the surface. |
| `slotName` | `string` | `'popover'` | Names this Host. The root carries it as `data-slot`; the surface carries `<slotName>-popover`. Not called `dataSlot`, so a consumer's own `data-slot` attribute cannot bind it and rename the surface hook. |
| `referenceProps` | `Record<string, unknown>` | — | Attributes merged onto the reference element. This is how `Dropdown` applies its trigger behaviour; a Host that wants no merge leaves it unset. |

| Slot | Props | Content |
| --- | --- | --- |
| default | `toggleShow`, `dismiss`, `isOpen` | **Becomes the reference.** Exactly one root element. |
| `popover` | `toggleShow`, `dismiss`, `isOpen` | The Popover body. |

**Exposed:** `toggleShow(value?)`, `dismiss()`, `popoverEl`.

Take `toggleShow` from the default slot when your trigger opens on click. Reach for the
template ref only when you need it in *script* — `Select` does, to forward `toggleShow` to its
own consumers.

## `usePopover(options)`

| Option | Type | Default | What it does |
| --- | --- | --- | --- |
| `reference` | `MaybeRefOrGetter<Element \| VirtualElement \| null>` | — *(required)* | What the Popover is placed against. A Floating UI `VirtualElement` stands for a point, which is how a context menu anchors to the cursor. |
| `open` | `Ref<boolean>` | — *(required)* | The open state. You own it, so model it however suits the host. |
| `placement` | `MaybeRefOrGetter<Placement>` | `'bottom'` | Any Floating UI placement. |
| `offset` | `MaybeRefOrGetter<number>` | `4` | Gap between reference and surface, in px. |
| `disabled` | `MaybeRefOrGetter<boolean>` | `false` | Blocks **opening**. An open Popover can still be dismissed. |
| `dismissOnClickOutside` | `MaybeRefOrGetter<boolean>` | `true` | Whether a click outside dismisses. |
| `restoreFocus` | `MaybeRefOrGetter<boolean>` | `true` | Whether closing returns focus to whatever held it when the Popover opened. Turn **off** when the reference keeps focus throughout — a text input does. |
| `anchor` | `MaybeRefOrGetter<HTMLElement \| null>` | — | An element that counts as "inside" for focus restore, besides the surface itself. Pass your trigger. Hosts anchored to a point pass nothing. |

Returns a `Popover`:

| Member | Type | What it is |
| --- | --- | --- |
| `isOpen` | `Ref<boolean>` | The same ref you passed as `open`. |
| `isMounted` | `Readonly<Ref<boolean>>` | Whether the teleport is mounted. Stays true through the leave transition. |
| `popoverEl` | `Readonly<Ref<HTMLElement \| null>>` | The positioned element, once bound. |
| `setPopoverEl` | `(el: HTMLElement \| null) => void` | Binds it. `PopoverSurface` calls this; nothing else should. |
| `styles` | `ComputedRef<Record<string, string>>` | Floating styles plus `--trigger-origin`. |
| `resolvedPlacement` | `Readonly<Ref<Placement>>` | The placement after `flip()` has had its say. |
| `dismissOnClickOutside` | `ComputedRef<boolean>` | The resolved option. |
| `restoreFocus` | `ComputedRef<boolean>` | The resolved option. |
| `toggle` | `(value?: boolean) => void` | Opens, closes, or flips. Respects `disabled`. |
| `dismiss` | `() => void` | `toggle(false)`. |
| `handleEscape` | `(event: KeyboardEvent) => void` | Dismisses on `Escape` and stops the event. |
| `onAfterLeave` | `() => void` | Releases the teleport. `PopoverSurface` wires this. |
| `update` | `() => void` | Re-measures. Needed only when the reference moves without changing identity — a cursor `VirtualElement` does. |

**You must call `handleEscape` yourself** from a keydown handler on whatever wraps your
reference. `PopoverSurface` handles keystrokes *inside* the Popover, but those never reach your
wrapper: the teleport moved them out of its subtree.

## `<PopoverSurface>`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `popover` | `Popover` | — *(required)* | The object `usePopover` returned. |
| `transition` | `string` | `'popover'` | Vue transition name. |
| `whiteList` | `string[]` | — | Selectors that click-outside treats as inside. |
| `popoverProps` | `PtSlot<HTMLAttributes>` | — | Attributes merged onto the surface. |
| `slotName` | `string` | `'popover'` | The surface's `data-slot`, as a stable hook for your styles and tests. |
| `styleVars` | `Record<string, string>` | — | Extra custom properties for the positioned element. This is how a host publishes `--trigger-width`. |

| Slot | Props | Content |
| --- | --- | --- |
| default | — | The Popover body. |

## Which one do I want?

`Dropdown` adds a trigger element: it merges a click handler and `aria-haspopup` /
`aria-expanded` onto your markup, and handles `ArrowDown` to open and to move focus in. Take it
unless one of these applies:

- **You own the keyboard.** `Select` navigates with `aria-activedescendant`, where focus never
  leaves the trigger. A roving-focus handler would fight it (ADR-0001).
- **Your trigger is a text input.** Clicking must place a caret, typing must reach the field,
  and restoring focus on close would pull the user back into a field they just left. This is a
  **Field Popover** — see `CONTEXT.md`. `Autocomplete`, `DatePicker` and `TimePicker` are the
  three.
- **There is no trigger element.** `ContextMenu` opens at a cursor point, so it passes a
  `VirtualElement` and never has an element to merge anything onto.

A bare `<Popover>` merges nothing onto its reference, so none of that behaviour exists to
switch off. The defaults are already what these Hosts want.

Drop to `usePopover` + `<PopoverSurface>` only for the third case. `<Popover>` reads its
reference from the DOM — the first element child of its root — so it needs a real element;
`ContextMenu` has only a point.

## Keyboard

| Key | Does |
| --- | --- |
| `Escape` | Dismisses. Always, even while `disabled`. |

That is the whole keymap. A Popover has no navigation of its own; its content brings that, and
a host that wants `ArrowDown` to open uses `Dropdown` or writes it itself.

## Focus

A Popover **does not move focus into itself when it opens.** Content that needs focus takes it,
the way `Menu` does on mount.

On close, focus returns to whatever held it when the Popover opened — but only after a
`setTimeout(0)`, and only when focus is otherwise nowhere useful (`<body>`, inside the surface,
or inside the `anchor` you passed). That keeps a keyboard user on the trigger after `Escape`
instead of stranding them on `<body>`, and it leaves a deliberate focus move alone.

## Dismissal from inside

The Popover's content can close it without knowing what is hosting it, by injecting
`HostContext` and calling `dismiss()`. `usePopover` does **not** provide it — a Host does, so
that the same content works under `Dropdown` and `ContextMenu` alike:

```ts
provideHostContext({ dismiss: popover.dismiss })
```

`Menu` relies on this, which is how activating a Menu Item dismisses its Host with nothing
wired at the call site. See [`CONTEXT.md`](../../../../CONTEXT.md) — Host.

## Positioning and CSS variables

Floating UI with `flip()` and `shift()`, kept in sync by `autoUpdate`, so the Popover reflows on
scroll and resize. The positioned element carries:

| Variable | Value | Typical use |
| --- | --- | --- |
| `--trigger-origin` | A `transform-origin` derived from the *resolved* placement | Transitions that grow from the reference |


`--trigger-width` is **not** published here, because a reference may be a point with no width.
A host that has measured a trigger passes it through `styleVars`; `Dropdown`, `Select` and
`Autocomplete` all do, and their stylesheets read it:

```css
min-width: max(var(--trigger-width, 0px), 180px);
```

## Styling

`.popover` (in `assets/css/components/dropdown.css`) gives the surface its border, radius,
shadow and background. `.popover-list` is the common scrolling menu body — capped height,
`min-w-50`, `max-w-100`.

## Gotchas

- **You own `Escape` on the reference side.** Nothing wires it for you; see above.
- **`setPopoverEl` is for `PopoverSurface`.** Calling it yourself detaches positioning from the
  element actually on screen.
- **No focus trap.** The Popover is not modal, and `Tab` leaves it. That is correct for a menu;
  a dialog needs `ConfirmDialog`. A host that needs a trap applies one to its own content —
  `DatePicker` puts `v-trap-focus.manual` on the `Calendar` inside.
- **No submenus, and no arrow pointing at the reference.** Floating UI supports an arrow;
  nothing has needed one.
- **`autoUpdate` runs while mounted.** Scroll and resize listeners stay attached for as long as
  the Popover is mounted. Fine at current usage; worth revisiting if a page ever shows many open
  Popovers at once.
