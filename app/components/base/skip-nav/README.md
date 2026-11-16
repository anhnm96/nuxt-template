# SkipNav

A Skip Link: a link that lets keyboard and screen reader users move past the repeated
navigation to the main content. It is hidden until it holds focus. It answers WCAG 2.4.1,
Bypass Blocks.

This file is how to **use** it. For why it is built this way — the optional id, the unchanged
URL and the temporary `tabindex` — see [DESIGN.md](./DESIGN.md).

```vue
<template>
  <SkipNav />
  <header>…</header>
  <main>…</main>
</template>
```

> Render it before the navigation, as the first focusable element in the document. Then the
> first Tab shows it.

## The Skip Target

With no `href`, the link looks for `id="main-content"` and then for the first `<main>` in the
document. Set the id when the main content is not a `<main>`, or when the link must work
before the page hydrates:

```vue
<script setup lang="ts">
import { MAIN_CONTENT_ID } from '~/components/base/skip-nav/SkipNav'
</script>

<template>
  <main :id="MAIN_CONTENT_ID">
    …
  </main>
</template>
```

Pass `href` to name a different Skip Target. An explicit `href` never falls back to `<main>`,
even when its value is `#main-content`:

```vue
<template>
  <SkipNav href="#search">
    Skip to search
  </SkipNav>
  <input id="search" type="search">
</template>
```

## More than one

Each `SkipNav` is independent. Render several and they take focus in document order. They
all show in the same corner, and only the focused one shows at a time.

```vue
<template>
  <SkipNav />
  <SkipNav href="#footer">
    Skip to footer
  </SkipNav>
</template>
```

## A sticky header

The Skip Target scrolls to the top of the viewport. A sticky header covers it there, so give
the target a `scroll-margin-top` of the header's height:

```vue
<template>
  <main class="scroll-mt-16">
    …
  </main>
</template>
```

## Props

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `href` | `string` | — | A `#id` fragment that names the Skip Target. Omitted, the link renders `#main-content` and falls back to the first `<main>`. Any other value — a path, a URL, a bare `#` — is left to the browser. |

`class` and every other attribute fall through to the `<a>`.

## Events

| Event | Payload | When |
| --- | --- | --- |
| `click` | `MouseEvent` | The link is activated, before the component acts. Call `preventDefault()` on the event and the component does nothing. |

## Slots

| Slot | Props | Content |
| --- | --- | --- |
| `default` | — | The link text. Defaults to "Skip to main content". |

## Keyboard

| Key | What it does |
| --- | --- |
| `Tab` | Shows the link, when it is the first focusable element. |
| `Enter` | Moves focus to the Skip Target. |

## Accessibility

The link is a native `<a>`, so the role and Enter activation come from the platform. While
hidden it stays in the accessibility tree.

Focus moves to the Skip Target itself, so the next `Tab` goes to the first focusable element
inside it. A target that is not focusable takes `tabindex="-1"` and no outline until focus
leaves it.

While focused the link sits at `--skip-nav`, set in
[`main.css`](../../../assets/css/main.css) above the fixed header and tooltips, so nothing
covers it.

## Styling

The look is `btn btn-neutral` from [`button.css`](../../../assets/css/components/button.css).
Position and the hidden state are in
[`skip-nav.css`](../../../assets/css/components/skip-nav.css). Select the link with
`[data-slot="skip-nav"]` or pass `class`.

## Gotchas

**A page with no `<main>` and no id has a dead link.** A click then does nothing, and the
component warns in dev.

**Two `<main>` elements.** The fallback takes the first one in the document. A page that
renders several should put `id="main-content"` on the element that wraps them.

**A click moves the Tab start point.** After a click on the page, Tab continues from the
click, so it goes past the link. This is normal browser behaviour. To test the link, reload
and press Tab before you click.

**It does not reset focus on a route change.** After a client-side navigation, focus stays
where it was, so the link is not the next Tab stop. See
[DESIGN.md](./DESIGN.md#out-of-scope).

**Before hydration, only the id works.** The `<main>` fallback is script. Until the page
hydrates, the link is a plain `#main-content` anchor.
