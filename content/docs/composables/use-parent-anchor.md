# useParentAnchor

Resolves the Anchor of a component that renders no element of its own. Terms in Title Case are defined in the [glossary](/docs/reference/glossary).

Such a component leaves only a placeholder in its parent. The parent of that placeholder is the element that the component was written inside, and that element is the default Anchor.

Used by [Tooltip](/docs/components/tooltip) and [ContextMenu](/docs/components/context-menu).

## Usage

This component draws an outline on the element that it is written inside. It adds no element of its own.

```vue
<script setup lang="ts">
import type { AnchorTarget } from '~/composables/useParentAnchor'

const props = withDefaults(defineProps<{
  target?: AnchorTarget
}>(), { target: true })

const anchorEl = useParentAnchor(() => props.target, 'Outline')

watch(anchorEl, (el, previous) => {
  previous?.style.removeProperty('outline')
  el?.style.setProperty('outline', '2px solid currentColor')
})
</script>

<template>
  <slot />
</template>
```

## Signature

```ts
type AnchorTarget = true | string | HTMLElement

function useParentAnchor(
  target: () => AnchorTarget,
  componentName: string,
): ShallowRef<HTMLElement | null>
```

### Arguments

| Argument | What it does |
| --- | --- |
| `target` | Which element is the Anchor. Read on mount, and again each time it changes. |
| `componentName` | Names the component in the error for a selector that matches nothing, for example `'Tooltip'`. |

### Target

| Value | The Anchor |
| --- | --- |
| `true` | The element that the component was written inside. |
| a `string` | The first element that matches this CSS selector in the document. |
| an `HTMLElement` | That element. |

## Behaviour

- **The Anchor is `null` until the component mounts.** The placeholder has no parent before that.
- **A selector that matches nothing resolves to `null`,** and logs `[componentName] target "…" not found` as an error.
- **A changed `target` resolves again.** The previous Anchor is replaced, so a watcher on the returned ref can move its listeners.

## Notes

- Call it in `setup`. It reads the current component instance.
- A selector is resolved one time for each change of `target`. An element that enters the document later does not become the Anchor until `target` changes.
- The component must render no element of its own for `true` to work as described. With a root element, `true` resolves to the parent of that root.
