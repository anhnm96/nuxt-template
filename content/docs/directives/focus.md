# v-focus

Focuses an element when it is mounted. Use it on the first field of a dialog or an inline editor, where the user has just asked for the element and expects to type in it.

The directive is registered globally by `app/plugins/focus.ts`. In a template it is `v-focus`, with no import. It takes no value, argument or modifier.

## Usage

Put the directive on a field that appears after a user action.

```vue
<script setup lang="ts">
const editing = ref(false)
</script>

<template>
  <button type="button" @click="editing = true">
    Edit title
  </button>
  <input v-if="editing" v-focus type="text" aria-label="Title">
</template>
```

Each time the `v-if` creates the input, the input takes focus.

## Behaviour

- When the element is mounted, the directive waits for the next tick and then calls `el.focus()`. The wait lets the rest of the update render before focus moves.
- It runs once, at mount. A later render does not focus the element again, and an element that `v-show` reveals is not focused.
- It runs in the browser only, because it uses the `mounted` hook.

## Notes

- **The element must be able to take focus.** `input`, `select`, `textarea` and `button` can. Any other element needs a `tabindex`, or `focus()` has no effect.
- **On a component, the directive applies to the component's root element.** It then works only when that element can take focus.
- **When several elements with `v-focus` mount in the same update, the last one keeps focus.** Each one calls `focus()` in mount order.
- **It does not remember where focus was, and it does not give focus back.** A dialog that must return focus to its opener when it closes needs [v-trap-focus](/docs/directives/trap-focus), which does both.
- **Use it only where the user asked for the element.** Moving focus on mount is right for a dialog or an editor the user just opened. It is wrong for a field that appears while the user is working somewhere else on the page.
