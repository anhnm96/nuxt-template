# Dropdown

A trigger element paired with a [Popover](../popover/README.md). Floating UI handles placement;
the Popover is teleported out of the DOM flow so it is never clipped by an overflow ancestor.

There is **no trigger wrapper**. Whatever you put in the default slot *becomes* the trigger:
Dropdown merges its behaviour — the click handler, `aria-haspopup`, `aria-expanded` — onto your
element, the way reka-ui's `asChild` does. So you style and size the trigger directly, and the
slot must have exactly one root element.

This file is how to **use** it. For why it is built this way, see [DESIGN.md](./DESIGN.md). For
the positioning and dismissal machinery underneath, see
[`base/popover`](../popover/README.md) — you need that one directly only when your component
owns its own keyboard or has no trigger element.

```vue
<Dropdown placement="bottom-start">
  <button class="btn btn-outline">Menu</button>

  <template #popover="{ toggleShow }">
    <div class="popover-list">
      <button class="list-select-item p-1.5 text-left" @click="pick('a'); toggleShow(false)">
        Option A
      </button>
    </div>
  </template>
</Dropdown>
```

> **Requires a teleport host.** `app.vue` renders `<div class="popovers" />`, and the Popover
> teleports there. In a unit test you must create it yourself or nothing renders:
> ```ts
> const host = document.createElement('div')
> host.className = 'popovers'
> document.body.appendChild(host)
> ```

## Props

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `placement` | `Placement` | `'bottom'` | Any Floating UI placement — `'bottom-start'`, `'right'`, … |
| `triggers` | `('click' \| 'hover')[]` | `['click']` | How it opens. See below. |
| `offset` | `number` | `4` | Gap between trigger and Popover, in px. |
| `disabled` | `boolean` | `false` | Blocks **opening**. An already-open Popover can still be dismissed. |
| `transition` | `string` | `'popover'` | Vue transition name. |
| `dismissOnClickOutside` | `boolean` | `triggers` includes `click` | Whether a click outside dismisses. Set it when the trigger must not toggle on click. |
| `restoreFocus` | `boolean` | `true` | Whether closing returns focus to whatever held it when the Popover opened. Turn **off** for a trigger that keeps focus throughout. |
| `popoverProps` | `PtSlot<HTMLAttributes>` | — | Attributes merged onto the Popover surface. |
| `whiteList` | `string[]` | — | Selectors that click-outside should ignore. |

Attributes you put on `<Dropdown>` itself land on its outer wrapper — a `display: contents`
`<div>` holding the trigger and the teleport — **not** on the trigger. That wrapper generates no
box, so styling it is usually a no-op. Put trigger attributes on your trigger element, which
*is* the trigger, and use `popoverProps` for the Popover surface.

Exposed: `toggleShow(value?: boolean)` via template ref.

## Open state

Uncontrolled by default. Bind it when you need to drive or observe it:

```vue
<Dropdown v-model:open="isOpen">
  <button class="btn">
    Menu
  </button>
  <template #popover>
    <div class="popover-list">…</div>
  </template>
</Dropdown>
```

`#popover` also receives `toggleShow`, which is how a menu item closes the menu after acting:

```vue
<Dropdown>
  <button class="btn">
    Actions
  </button>

  <template #popover="{ toggleShow }">
    <button @click="save(); toggleShow(false)">
      Save
    </button>
  </template>
</Dropdown>
```

## Triggers

- **`['click']`** (default) — clicking the trigger toggles. Click-outside dismisses.
- **`['hover']`** — opens on `mouseenter` *and* `focus`, closes on `mouseleave` / `blur`. Touch
  gets a fallback: `touchstart` opens, and a vertical drag over ~10px closes it again so
  scrolling doesn't leave it stuck open. Click-outside is **not** wired up in this mode.
- Both can be combined: `:triggers="['click', 'hover']"`.
- **`[]`** — nothing opens it; the host drives `v-model:open` itself. Click-outside follows the
  `click` trigger, so an empty list switches dismissal off too — pass `dismiss-on-click-outside`
  to keep it.

A component whose trigger is a text input should not reach for `:triggers="[]"`. It wants
a bare `Popover`, which has no trigger behaviour to switch off — see
[`base/popover`](../popover/README.md#which-one-do-i-want).

## Slots

| Slot | Props | Content |
| --- | --- | --- |
| default | — | **Becomes** the trigger. Exactly one root element; Dropdown merges its handlers and `aria-haspopup` / `aria-expanded` onto it. |
| `popover` | `toggleShow` | The Popover body. |

Content inside the Popover can also close it **without** the slot prop, by injecting
`HostContext` and calling its `dismiss()`. `Menu` does this, so activating a Menu Item dismisses
the Dropdown with nothing wired at the call site. Reach for `toggleShow` when your own markup
needs to close the Popover; reach for the context when you are writing a component that must
work under any Host. See [CONTEXT.md](../../../../CONTEXT.md) — Host, Menu Host.

## Keyboard

| Key | Does |
| --- | --- |
| `ArrowDown` on the trigger | Opens |
| `ArrowDown` in an open Popover | Moves focus to the first focusable child |
| `Escape` | Dismisses. Always, even when `disabled` |

The Popover is teleported to the end of the document, so `ArrowDown` is the only keyboard route
into it — `Tab` from the trigger skips straight past.

**Dropdown does not move focus into the Popover when it opens**, only when `ArrowDown` is
pressed on the trigger. A Popover opened by *clicking* leaves focus on the trigger, and because
the Popover is teleported, keystrokes there never reach its content. Content with its own
keyboard handling must take focus itself, the way `Menu` and `ContextMenu` do.

### Focus on close

Closing returns focus to whatever held it when the Popover opened, but only when that focus
would otherwise be lost — it is skipped when something outside has already taken it. That keeps
a keyboard user on the trigger after `Escape` instead of stranding them on `<body>`.

Turn it off with `:restore-focus="false"` when the trigger itself keeps focus the whole time.

## Positioning and CSS variables

Floating UI with `flip()` and `shift()`, kept in sync by `autoUpdate` — the Popover reflows on
scroll and resize. The Popover element carries two custom properties you can use:

| Variable | Value | Typical use |
| --- | --- | --- |
| `--trigger-width` | The trigger's measured width in px | Match or floor the Popover's width |
| `--trigger-origin` | A `transform-origin` derived from the *resolved* placement | Transitions that grow from the trigger |

```css
.my-popup {
  min-width: max(var(--trigger-width, 0px), 200px);
  transform-origin: var(--trigger-origin);
}
```


`--trigger-origin` reads from the resolved placement, not the requested one, so a Popover that
`flip()` moved above the trigger animates from the bottom edge.

## Styling

`.popover` (in `assets/css/components/dropdown.css`) gives the surface its border, radius,
shadow and background. `.popover-list` is the common scrolling menu body — capped height,
`min-w-50`, `max-w-100`.

Stable hooks: `data-slot="dropdown-popover"` on the Popover, and `data-slot="dropdown-trigger"`
on the trigger — *unless* your element sets its own `data-slot`, which wins (see Gotchas).

## Gotchas

- **Attributes on `<Dropdown>` reach the outer wrapper, not the trigger.** They are applied
  rather than dropped, but the wrapper is `display: contents`, so layout classes do nothing —
  and a `display` utility such as `flex` overrides `contents` and gives it a box, which can move
  the surrounding layout. Style the trigger element directly instead.
- **`triggers` is read once, at setup.** The click-outside wiring and the trigger's event
  handlers are built when the component is created, so swapping `triggers` reactively has no
  effect. Pass a static value, or `key` the Dropdown to force a remount.
- **Your element's own props win over Dropdown's.** The merge is `mergeProps(dropdownAttrs,
  yourProps)`, so a `data-slot`, `class` or `aria-*` you set survives. Handlers are the
  exception — `mergeProps` chains them, so your `@click` runs *and* Dropdown's toggle does.
- **The default slot needs exactly one root element.** Extra roots are rendered but get none of
  the merged behaviour, so only the first one opens the Popover.
- **`disabled` gates opening only.** Dismissal — click-outside, Escape — keeps working, so a
  host that disables mid-interaction can't strand an open Popover on screen.
- **Don't toggle from inside the trigger slot.** Dropdown's toggle is chained onto your
  element's own `@click`, so toggling yourself as well closes the Popover the instant it opens.
  This reproduces only with a real mouse, never with a scripted click — see
  [DESIGN.md](./DESIGN.md#the-double-toggle-hazard).
- **No focus trap.** The Popover is not modal; `Tab` leaves it, which is correct for a menu. A
  dialog needs `ConfirmDialog`, not this.
