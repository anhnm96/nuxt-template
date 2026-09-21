# Dropdown

A positioned popover with a trigger. Floating UI handles placement; the popover is teleported
out of the DOM flow so it is never clipped by an overflow ancestor.

There is **no trigger wrapper**. Whatever you put in the default slot *becomes* the trigger:
Dropdown merges its behaviour — the click handler, `aria-haspopup`, `aria-expanded` — onto
your element, the way reka-ui's `asChild` does. So you style and size the trigger directly,
and the slot must have exactly one root element.

This file is how to **use** it. For why it is built this way — the teleport, the focus
handling, the keyboard contract with hosts like Select — see [DESIGN.md](./DESIGN.md).

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

> **Requires a teleport host.** `app.vue` renders `<div class="popovers" />`, and the popover
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
| `offset` | `number` | `4` | Gap between trigger and popover, in px. |
| `disabled` | `boolean` | `false` | Blocks **opening**. An already-open popover can still be dismissed. |
| `transition` | `string` | `'popover'` | Vue transition name. |
| `manageKeyboard` | `boolean` | `true` | Dropdown handles `ArrowDown` to open and to move focus in. Turn **off** if the host drives its own navigation. |
| `focusOnOpen` | `boolean` | `true` | Whether `ArrowDown` on an already-open popover moves focus into it. |
| `popoverProps` | `PtSlot<HTMLAttributes>` | — | Attributes merged onto the popover. |
| `whiteList` | `string[]` | — | Selectors that click-outside should ignore. |

Attributes you put on `<Dropdown>` itself land on its outer wrapper — a `display: contents`
`<div>` holding the trigger and the teleport — **not** on the trigger. That wrapper generates
no box, so styling it is usually a no-op. Put trigger attributes on your trigger element,
which *is* the trigger, and use `popoverProps` for the popover surface.

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

## Slots

| Slot | Props | Content |
| --- | --- | --- |
| default | — | **Becomes** the trigger. Exactly one root element; Dropdown merges its handlers and `aria-haspopup` / `aria-expanded` onto it. |
| `popover` | `toggleShow` | The popover body. |

## Keyboard

| Key | Does |
| --- | --- |
| `ArrowDown` on the trigger | Opens — when `manageKeyboard` |
| `ArrowDown` in an open popover | Moves focus to the first focusable child — when `manageKeyboard` and `focusOnOpen` |
| `Escape` | Dismisses. Always, even when `disabled` |

The popover is teleported to the end of the document, so without `manageKeyboard` there is no
keyboard route into it at all — Tab from the trigger skips straight past. Two reasons to turn
it off anyway:

- **The host owns navigation.** Select uses an `aria-activedescendant` model where focus never
  leaves the trigger; a roving-focus handler here would fight it (ADR-0001). It passes
  `:manage-keyboard="false"`.
- **The trigger keeps using the keyboard.** TimePicker's trigger is a text input where
  `ArrowDown` means something else, so it passes `:focus-on-open="false"` to keep `ArrowDown`
  opening the popover without stealing focus into it.

## Positioning and CSS variables

Floating UI with `flip()` and `shift()`, kept in sync by `autoUpdate` — the popover reflows on
scroll and resize. The popover element carries two custom properties you can use:

| Variable | Value | Typical use |
| --- | --- | --- |
| `--trigger-width` | The trigger's measured width in px | Match or floor the popover's width |
| `--trigger-origin` | A `transform-origin` derived from the *resolved* placement | Transitions that grow from the trigger |

```css
.my-popup {
  min-width: max(var(--trigger-width, 0px), 200px);
  transform-origin: var(--trigger-origin);
}
```

`--trigger-origin` reads from the resolved placement, not the requested one, so a popover that
`flip()` moved above the trigger animates from the bottom edge.

## Styling

`.popover` (in `assets/css/components/dropdown.css`) gives the surface its border, radius,
shadow and background. `.popover-list` is the common scrolling menu body — capped height,
`min-w-50`, `max-w-100`.

Stable hooks: `data-slot="dropdown-popover"` on the popover, and `data-slot="dropdown-trigger"`
on the trigger — *unless* your element sets its own `data-slot`, which wins (see Gotchas).
Select does exactly that, so its trigger reads `data-slot="select-trigger"`.

## Gotchas

- **Attributes on `<Dropdown>` reach the outer wrapper, not the trigger.** They are applied
  rather than dropped, but the wrapper is `display: contents`, so layout classes do nothing —
  and a `display` utility such as `flex` overrides `contents` and gives it a box, which can
  move the surrounding layout. Style the trigger element directly instead.
- **`triggers` is read once, at setup.** The click-outside wiring and the trigger's event
  handlers are built when the component is created, so swapping `triggers` reactively has no
  effect. Pass a static value, or `key` the Dropdown to force a remount.
- **Your element's own props win over Dropdown's.** The merge is `mergeProps(dropdownAttrs,
  yourProps)`, so a `data-slot`, `class` or `aria-*` you set survives. Handlers are the
  exception — `mergeProps` chains them, so your `@click` runs *and* Dropdown's toggle does.
- **The default slot needs exactly one root element.** Extra roots are rendered but get none
  of the merged behaviour, so only the first one opens the popover.
- **`disabled` gates opening only.** Dismissal — click-outside, Escape — keeps working, so a
  host that disables mid-interaction can't strand an open popover on screen.
- **Don't toggle from inside the trigger slot.** Dropdown's toggle is chained onto your
  element's own `@click`, so toggling yourself as well closes the popover the instant it
  opens. This reproduces only with a real mouse, never with a scripted click — see
  [DESIGN.md](./DESIGN.md#the-double-toggle-hazard).
