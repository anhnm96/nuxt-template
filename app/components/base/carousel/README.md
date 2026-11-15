# Carousel

A row of items in an element that scrolls, with `prev`, `next` and `scrollTo` for the controls
you write. The user moves it with a mouse drag, a touch, a trackpad or the keyboard. The
carousel renders no buttons and no dots: its slots give you the state and the functions.

This file is how to **use** it. For why it is built this way — a native scroll container, snap
that goes off for a drag, the click after a drag — see [DESIGN.md](./DESIGN.md).

```vue
<template>
  <Carousel items-class="gap-4">
    <CarouselItem v-for="card in cards" :key="card.id" class="w-64">
      {{ card.title }}
    </CarouselItem>
    <template #footer="{ prev, next }">
      <button type="button" aria-label="Previous" @click="prev()">
        ‹
      </button>
      <button type="button" aria-label="Next" @click="next()">
        ›
      </button>
    </template>
  </Carousel>
</template>
```

> **Give each `CarouselItem` a width, and the same one.** The carousel measures the first item
> and uses that width for all positions. `w-full` gives one item for each view.

## Parts

- `Carousel` — the root. It holds the element that scrolls and the `header` and `footer` slots.
- `CarouselItem` — one item. It must be inside a `Carousel`, and it throws when it is not.

## Positions

`activeIndex` is the index of the item at the leading edge. When three items fit and there are
seven, the positions are 0 to 4: at position 4 the last item is at the trailing edge. `scrollTo`
limits its index to these positions, so `scrollTo(6)` goes to position 4.

Only whole items count as items that fit. When three items and a part of the fourth show,
three fit, and the last position still puts the last item at the trailing edge. That position
can be less than one item after the position before it.

`prev` and `next` move by the number of items that fit. Set `itemsToScroll` for another number:

```html
<Carousel :items-to-scroll="1" items-class="gap-4">
  <!-- items -->
</Carousel>
```

With `repeat`, which is the default, `next` at the last position goes to the first position and
`prev` at the first position goes to the last one. With `:repeat="false"` they do nothing
there; use `hasPrev` and `hasNext` to disable the buttons.

## Dots

```vue
<template>
  <Carousel :repeat="false">
    <CarouselItem v-for="slide in slides" :key="slide.id" class="w-full">
      {{ slide.title }}
    </CarouselItem>
    <template #footer="{ activeIndex, scrollTo }">
      <button
        v-for="(slide, index) in slides"
        :key="slide.id"
        type="button"
        :aria-label="`Slide ${index + 1}`"
        :aria-current="index === activeIndex || undefined"
        @click="scrollTo(index)"
      />
    </template>
  </Carousel>
</template>
```

One dot for each item is correct only when one item fits. When more fit, the last positions
do not exist; see [Positions](#positions).

## Autoplay

`autoplay` is the time between two steps, in milliseconds. Each step moves one item, and after
the last position the carousel goes to the first one, with or without `repeat`. The carousel
stops while the mouse is over it.

```html
<Carousel :autoplay="4000">
  <!-- items -->
</Carousel>
```

## API

### Carousel

#### Props

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `initialIndex` | `number` | `0` | Position when the carousel mounts. Not read after that. |
| `repeat` | `boolean` | `true` | `prev` and `next` go round at the two ends. |
| `autoplay` | `number` | — | Milliseconds between two automatic steps. Read one time, at setup. No value or `0` gives no autoplay. |
| `itemsClass` | `string` | — | Classes for the element that scrolls. Put `gap-*` and padding here. |
| `itemsToScroll` | `number` | items that fit | How many items `prev` and `next` move. |

Attributes on `<Carousel>`, `class` included, go to the root and not to the element that
scrolls.

#### Slots

| Slot | Props | Content |
| --- | --- | --- |
| `header` | see below | Above the items. |
| `default` | see below | The `CarouselItem`s. |
| `footer` | see below | Below the items. |

The three slots get the same props:

- `activeIndex: number` — index of the item at the leading edge.
- `hasPrev: boolean` — `false` at the first position.
- `hasNext: boolean` — `false` at the last position.
- `prev(): void` — moves back.
- `next(): void` — moves forward.
- `scrollTo(index: number): void` — scrolls to an item, limited to the positions that exist.

### CarouselItem

No props. The `default` slot is the content. Attributes go to its root element.

## Keyboard

The carousel adds no keys. The element that scrolls is not in the tab order, unless the browser
puts it there: Chrome does that for a scrollable element with no focusable content, and the
arrow keys then scroll it. Focus that moves
to a control in an item scrolls the item into view, and `activeIndex` follows.

## Accessibility

The carousel sets no role and no name. For a carousel that a screen-reader user must know as
one, put `role="region"`, `aria-roledescription="carousel"` and an `aria-label` on
`<Carousel>`, and name each button you render.

Autoplay stops for the mouse only. It does not stop for keyboard focus or for
`prefers-reduced-motion`, and the carousel gives you no function to stop it. Content that
moves for more than five seconds needs a stop control (WCAG 2.2.2), so do not use `autoplay`
for content the user must read.

## Styling

| Class | Element |
| --- | --- |
| `carousel` | The element that scrolls. A flex row with a hidden scrollbar. |
| `scroll-snap` | On the same element while snap is on. It goes during a mouse drag. |
| `carousel-item` | Each item. It has `flex-shrink: 0` and `scroll-snap-align: start`. |

Padding on the element that scrolls puts the first item away from the edge. Give the items the
same `scroll-margin-left`, or snap puts each item at the edge and not at the padding.

## Gotchas

- **The items must have one width.** The carousel reads the width of the first item only.
- **A change of the item width alone is not measured.** The carousel measures when its own
  size changes and when the number of items changes.
- **Text in an item is selected during a mouse drag.** Add `select-none` to the items.
- **An element in an item cannot start a native drag.** The carousel cancels `dragstart`, so
  a drag-and-drop source in an item does not work.
- **`autoplay` and `initialIndex` are not reactive.**
- **No event tells the parent the position.** Read `activeIndex` in a slot.
- **A border at the edge of a full-width item can be cut.** The browser scrolls by whole
  pixels. When the width of the item is not a whole number, as `w-full` can give, the item
  can be half a pixel out and the carousel cuts what is at its edge. Put 1px of padding on
  the `CarouselItem` (`px-px`) and the border on an element inside it. When the item itself
  has the border, put the padding on the element that scrolls and tell snap about it:
  `items-class="px-px scroll-px-px"`.
- **Vertical carousels do not exist.** The carousel scrolls along x only.

A worked example of each section is in `pages/playground/carousel.vue`.
