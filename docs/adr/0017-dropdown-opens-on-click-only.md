---
status: accepted
---

# Dropdown opens on click only

`Dropdown` has one way to open: a click on its trigger. It has no `triggers` prop. A popup that
shows on hover is an Interactive Tooltip
([ADR-0004](0004-interactive-tooltip-is-a-mode-of-tooltip.md)).

`dismissOnClickOutside` is a plain boolean that defaults to `true`, in `Dropdown` and in
`Popover`.

## Why

`Dropdown` took `triggers: ('click' | 'hover')[]`. The hover mode had one call site, on a demo
page. It cost more than that one use was worth:

- **It made a default depend on another prop.** Click-outside followed the `click` trigger, so
  `dismissOnClickOutside` defaulted to `triggers.includes('click')`. A `boolean` prop that is
  absent is cast to `false` unless its `withDefaults` entry says otherwise, so the derivation
  needed `default: undefined` in two components to stay reachable. That entry was lost once,
  and click-outside stopped for every consumer while every test stayed green.
- **It was read once.** The handler map was built at setup. A `triggers` value that changed
  later did nothing.
- **It was a second hover implementation.** `Tooltip` already owns hover intent, the bridge
  between the Anchor and the Surface, touch handling and grouping. The hover mode here had
  none of them: the popup closed on `mouseleave` of the trigger, so the pointer could not
  enter it unless the two overlapped.

## Considered options

- **Keep `triggers` and make it reactive.** This removes the smallest of the three problems.
  The derived default and the duplicate hover behaviour stay.
- **Keep `hover` and give it hover intent.** That builds the Interactive Tooltip a second time
  inside a component that every click popover depends on.
- **Remove it** — chosen.

## Consequences

- A consumer that wants a hover popup writes `<Tooltip interactive>` inside the element.
- `dismissOnClickOutside` no longer needs `default: undefined`. It still needs a `withDefaults`
  entry, as does `restoreFocus`, because both default to `true`. `Dropdown.spec.ts` guards the
  two entries.
- `triggers: []` is gone with the prop. A host that drives `v-model:open` itself renders a bare
  `Popover`, which is what [ADR-0013](0013-popover-mechanism-is-separate-from-dropdown.md)
  already asked for.
