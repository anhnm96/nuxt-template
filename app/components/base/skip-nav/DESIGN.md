# SkipNav — design

Why this component is built the way it is. For how to *use* it, see [README.md](./README.md).

Terms in Title Case are defined in [CONTEXT.md](../../../../CONTEXT.md).

## The id is optional

A fragment link scrolls, but it does not reliably move focus to an element that cannot hold
it, and it changes the URL. The component replaces the browser's handling for those two
reasons only.

The usual contract is an id on the main content. There is no shared layout here to put the id
in once, and no page sets it. So with no `href`, the link looks for `#main-content` and then
takes the first `<main>`. The id wins when present: it names a Skip Target that is not a
`<main>`, and it is the only form that works before hydration.

Only an omitted `href` falls back, so the prop has no default. An explicit `href` that
matches nothing is a mistake, and landing on `<main>` would hide it; that holds for an
explicit `#main-content` too. The rendered `href` is still `#main-content`, because an `<a>`
without `href` is not a link and not a Tab stop.

## The URL does not change

A hash change goes through Vue Router, adds a history entry, and makes Back return to the
same page. So a `#id` click is always prevented, also when no Skip Target exists; the link
then does nothing at all. An explicit `href` does not write the URL either: a Skip Link is a
one-time aid, not a place to share or reload.

A consumer's `@click` must be able to stop the skip, so `click` is a declared emit and `skip`
calls the consumer's handler first. As a fallthrough listener it would run after the
component's own handler, and its `preventDefault()` would come too late.

A value that is not a `#id` fragment is left to the browser, which follows it as a normal
link, so there is no warning.

## Focusable only while focused

The component tries to focus the target first, and makes it focusable only when that fails.
`tabIndex` is no guide: it reads 0 on an `<a>` with no `href`, which a browser still does not
focus.

A permanent `tabindex="-1"` makes every click on empty space inside `<main>` move focus to
it, so the attribute lives only until blur. The outline is hidden for the same period: a ring
around the whole content area is noise. On blur, the target's earlier `tabindex` and inline
`outline` are restored. A hidden target refuses focus even then and never sends `blur`, so
the restore runs at once.

## Above the header

The fixed header sits at `z-index: 9999` and tooltips at 9000, both far above the scale in
[`main.css`](../../../assets/css/main.css). `--skip-nav` is 10000, so nothing in the page
covers the focused link (WCAG 2.4.11). The full-screen editor toolbar is higher; it covers the
whole page, Skip Target included, so the link under it is correct.

It shows on `:focus`, not `:focus-visible`. A link takes focus from the keyboard or from a
script, and browsers do not agree on which of those counts as visible.

## Scrolling

`scrollIntoView({ block: 'start' })` has no `behavior`, so the jump is instant unless the
page's own CSS says otherwise. The sticky header offset is the consumer's
`scroll-margin-top`; the component cannot know the height.

## Out of scope

- **Focus reset on route change.** After a client-side navigation, focus stays on the link
  that was clicked. That affects every page and belongs to the router.
- **A wrapper for several Skip Links.** Each instance is independent.
- **A `label` prop or i18n.** The default slot carries the text.
