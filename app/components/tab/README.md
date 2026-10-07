# Tabs

A tablist with a sliding indicator and optional panels. One tab may own **several** values,
so a single pill can stand for a group of views that a menu inside it selects between.

This file is how to **use** it. For why it is built this way — the value model, the tab
registry, the keyboard contract — see [DESIGN.md](./DESIGN.md).

```vue
<template>
  <Tabs v-model:value="view">
    <TabList>
      <TabIndicator />
      <Tab value="day">
        Day
      </Tab>
      <Tab value="week">
        Week
      </Tab>
    </TabList>

    <TabPanels>
      <TabPanel value="day">
        …
      </TabPanel>
      <TabPanel value="week">
        …
      </TabPanel>
    </TabPanels>
  </Tabs>
</template>
```

> **`TabIndicator` goes inside `TabList`.** It is absolutely positioned, and it measures each
> tab with `offsetLeft` / `offsetTop`. Both need the same offset parent, which is the
> `position: relative` element `TabList` renders.

> **`value` on `Tabs` is required.** There is no uncontrolled mode and no default, so an
> unbound tablist has no active tab and the indicator has nothing to measure.

## Components

| Component | What it does |
| --- | --- |
| `Tabs` | The root. Owns the model and provides the context every other part injects. |
| `TabList` | The `role="tablist"` container. Owns arrow-key navigation. |
| `Tab` | One tab. Owns one value, or several. |
| `TabIndicator` | The bar that slides to the active tab. |
| `TabPanels` | Renders the panel whose value matches the model. |
| `TabPanel` | One panel. |

## Props

### `Tabs`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `value` | `Primitive` | — *(required)* | The active value. Use `v-model:value`. |
| `vertical` | `boolean` | `false` | Sets `aria-orientation`, swaps the arrow keys, and moves the indicator rule from the bottom edge to the right edge. |
| `duration` | `number` | `130` | Declared, read nowhere. See [Gotchas](#gotchas). |

### `TabList`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `as` | `string` | `'div'` | The element to render. |

### `Tab`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `value` | `Primitive \| Primitive[]` | — *(required)* | The value the tab owns, or the values. See [Multi-value tabs](#multi-value-tabs). |
| `as` | `string` | `'button'` | The element to render. |

### `TabPanels`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `eager` | `boolean` | `false` | Render every panel and hide the inactive ones with `v-show`, rather than render only the active one. |
| `keepAlive` | `boolean \| KeepAliveProps` | — | Wrap the active panel in `<KeepAlive>`, so a panel keeps its state after it is unmounted. An object is passed to `KeepAlive` as props. Ignored under `eager`, which never unmounts a panel. |

### `TabPanel`

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `value` | `Primitive \| Primitive[]` | — *(required)* | The value this panel answers to. Must match its tab. |
| `as` | `string` | `'div'` | The element to render. |

`TabIndicator` takes no props. Style it with `class`; see [Styling](#styling).

## Model

`Tabs` has one model, `value`, and it holds a `Primitive` — never an array, even when a tab
owns several values:

```vue
<script setup lang="ts">
const view = ref('day')
</script>

<template>
  <Tabs v-model:value="view">
    <!-- … -->
  </Tabs>
</template>
```

A tab's `value` says which model values that tab answers to. The model says which one is
active. Those are different questions, which is why only one of them takes an array.

## Multi-value tabs

Pass an array and the tab is selected whenever the model holds any value in it:

```vue
<template>
  <Tab :value="['timeline_day', 'user_week']">
    …
  </Tab>
</template>
```

Two rules follow:

- The **first** value is the tab's identity. It builds the DOM id, it is what keyboard
  navigation commits, and its panel is the one `TabPanel` must name.
- A multi-value tab **does not select on click**. Its own content sets the model instead —
  a menu inside the tab, typically. A single-value tab still selects on click.

The second rule is the trap. A multi-value tab with nothing interactive inside it can be
focused and can be reached with the arrow keys, but a pointer click on it does nothing.
For why it works this way, see [DESIGN.md](./DESIGN.md#a-tab-owns-values-not-a-value).

## Slots

| Component | Slot | Props | Content |
| --- | --- | --- | --- |
| `Tabs` | `default` | `active-value` | The whole tablist and panels. |
| `TabList` | `default` | — | `TabIndicator` and the tabs. |
| `Tab` | `default` | `is-selected` | The tab's label. |
| `TabPanels` | `default` | — | The panels. |
| `TabPanel` | `default` | — | The panel's content. |

Nothing here exposes members through `defineExpose`, and `update:value` on `Tabs` is the only
event.

## Keyboard

Focus must be on a tab itself. A key event that starts inside a tab's content is left alone,
so a menu trigger in a tab keeps its own keys.

| Key | What it does |
| --- | --- |
| `ArrowRight` / `ArrowLeft` | Horizontal: select and focus the next or previous tab, and wrap at the ends. |
| `ArrowDown` / `ArrowUp` | The same, when `vertical` is set. |
| `Home` | Select and focus the first tab. |
| `End` | Select and focus the last tab. |

Navigation skips a tab that is `disabled` or that carries `aria-disabled="true"`. Any other
value of `aria-disabled`, `"false"` included, leaves the tab reachable. `disabled` is read as
the button property, so a `Tab` rendered with `as="div"` has to use `aria-disabled`. `Home` and `End` land
on the first or last tab that navigation does not skip, and they do nothing when no tab
qualifies.

The default is not prevented for any other key, so a horizontal tablist still scrolls the
page on `ArrowDown`. A key whose default a widget inside the tab has already prevented is
left alone, so a menu in a tab opens on `ArrowDown` without also moving to the next tab.

Selection follows focus: an arrow key selects the tab it moves to. There is no manual
activation mode.

## Accessibility

| Element | What it carries |
| --- | --- |
| `TabList` | `role="tablist"`, `aria-orientation`. |
| `Tab` | `role="tab"`, `aria-selected`, `aria-controls`, and a roving `tabindex` — `0` on the active tab, `-1` on the rest. |
| `TabPanel` | `role="tabpanel"`, `aria-labelledby`, `tabindex="0"`. |

Ids are built from the tab's primary value and the `useId()` of the `Tabs` root, so a tab and
its panel point at each other without either naming an id.

A multi-value tab that holds a menu departs from the APG tab pattern. See
[DESIGN.md](./DESIGN.md#known-limitations).

## Styling

There is no tab stylesheet. `Tab` renders the shared button classes: `btn`, plus `btn-text`,
or `btn-text-primary selected` when it is active. `selected` is what suppresses the hover and
active states in `button.css`, so an active tab does not react to the pointer.

`TabIndicator` ships its own Tailwind classes: a solid 2px primary rule on the edge that
faces the panel — the bottom edge horizontally, the right edge vertically. Pass `h-full`
(horizontal) or `w-full` (vertical) to make it a block behind the active tab instead, and a
tint with it, because an opaque block hides the active label. A `class` you pass is
**merged** with them,
never substituted, so a property you want to change has to override what the component
already sets. That is what the `!` does here — Tailwind compiles `rounded-lg!` to
`!important`, which beats the component's `rounded-md`:

```vue
<template>
  <TabIndicator class="top-1/2 h-7 -translate-y-1/2 rounded-lg! bg-primary/15" />
</template>
```

No component here publishes `data-slot` hooks or CSS custom properties.

## Gotchas

- **`duration` on `Tabs` does nothing.** It is declared with a default of `130` and read
  nowhere. Style the transition on `TabIndicator` instead.
- **Ids come from the primary value, through `String()`.** Two tabs whose primary values
  convert to the same text — `1` and `'1'` — produce the same id, and `aria-controls` then
  points at the wrong panel.
- **A `TabPanel` under `TabPanels` is unmounted while it is inactive** unless `eager` is set.
  Reach for `keepAlive` when the panel holds state worth keeping.
- **A child of `TabPanels` that is not a `TabPanel` always renders**, whatever the model
  holds. Only panels are matched, and a panel is a **direct** child: `TabPanels` reads the
  component name off each vnode in its slot. A `v-for` over panels produces a fragment rather
  than a panel, so it passes through whole and every panel inside it renders at once. Write
  the panels out, or render the `v-for` inside a single `TabPanel`.
- **`TabPanel` throws outside `TabPanels`.** It injects the context `TabPanels` provides, so
  a panel needs that wrapper even when you only ever show one.
