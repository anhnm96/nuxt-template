# v-click-outside

Calls a function when the user clicks outside an element. Use it to dismiss a popover, a menu or an inline editor.

The directive is registered globally by `app/plugins/clickOutside.ts` under the name `clickOutside`. In a template it is `v-click-outside`, with no import.

Used by [Popover](/docs/components/popover) to dismiss its surface, and by the rich-text image and link editors.

## Usage

```vue
<script setup lang="ts">
const open = ref(true)
</script>

<template>
  <div v-if="open" v-click-outside="() => (open = false)">
    <p>Panel content</p>
  </div>
</template>
```

The value is a function. The directive calls it with the `click` event.

### Forms

| Form | What counts as inside |
| --- | --- |
| `v-click-outside="handler"` | The element and everything it contains. |
| `v-click-outside.parent="handler"` | The element's parent and everything it contains. |
| `v-click-outside:[selectors]="handler"` | The element, plus every element that matches one of the `selectors` and everything it contains. |

`selectors` is an array of CSS selector strings. Use it for content that is drawn outside the element in the DOM but belongs to it. Match the specific teleported panel that belongs to the host. A selector for the shared `.popovers` layer would also exempt clicks on unrelated panels.

```vue
<script setup lang="ts">
const open = ref(true)
const panelId = useId()
const alsoInside = [`#${panelId}`]
</script>

<template>
  <div v-if="open" v-click-outside:[alsoInside]="() => (open = false)">
    <p>Editor content</p>
    <Teleport to="body">
      <div :id="panelId">Related panel content</div>
    </Teleport>
  </div>
</template>
```

## Behaviour

- **It listens for `click` on `document.body`.** A click whose target is the element, is inside it, or is inside a whitelisted selector is ignored. Any other click calls the handler.
- **The listener attaches one animation frame after mount.** The click that created the element does not dismiss it. If the element unmounts before that frame, the frame is cancelled and nothing is left attached.
- **The listener is removed when the element unmounts.**
- **The whitelist is checked at click time.** The directive runs `document.querySelectorAll` for each selector when a click arrives, so content that appears later still counts.
- **Content moved elsewhere in the DOM counts as outside.** This includes content drawn with `Teleport`. Name it in `selectors` to make it count as inside.

## Notes

- **The listener stays active while the element is mounted,** including when `v-show` hides it. Every outside click then calls the handler. Use `v-if` to end the listening, as the example does.
- **The handler, the `.parent` modifier and the selectors are read at mount.** The directive has no `updated` hook, so a different function passed in a later render is ignored. Pass a function that reads current state, such as one that sets a ref.
- **Only a `click` that reaches `document.body` is seen.** A secondary-button press does not fire `click`, and a click whose propagation is stopped before `body` never arrives. `ContextMenu` listens for `contextmenu` itself for this reason.
- **It listens for bubbling `click` events, including clicks from keyboard activation.** Provide a keyboard dismissal action such as `Escape`. `Popover` handles `Escape` on its surface.
