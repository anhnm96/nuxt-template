# v-trap-focus

Wraps `Tab` and `Shift+Tab` at the focus boundaries inside an element. When the element unmounts, the directive can return focus to the opener.

The directive is registered globally by `app/plugins/trapFocus.ts` under the name `trapFocus`. In a template it is `v-trap-focus`, with no import. The plugin also exports the directive object as `trapFocus`, so a test can register it directly.

Used by the dialog panel, the mobile sidebar, the color picker field, and the [DatePicker](/docs/components/date-picker) calendar.

## Usage

Use the app's `Dialog` for modal UI. It provides a panel, backdrop, and dismissal controls.
The directive below only wraps focus at the first and last stops. The default mount
focuses the container, where an initial `Shift+Tab` can leave the group. The directive
also leaves the rest of the page interactive.

```vue
<template>
  <div v-trap-focus role="group" aria-label="Settings" tabindex="-1">
    <input type="text" aria-label="Name">
    <button type="button">
      Save
    </button>
  </div>
</template>
```

The directive takes no value. Mount the element only while it is open, with `v-if`, so the trap starts and ends with it.

### Modifiers

| Form | What happens on mount |
| --- | --- |
| `v-trap-focus` | The element takes focus. |
| `v-trap-focus.manual` | Focus stays where it is. The host decides when focus enters. |

Use `.manual` for a popover over a text field. The field keeps the keyboard, and focus enters the popover only when the user asks, as the DatePicker does on `ArrowDown`. The default is right for a modal dialog, which should take focus the moment it appears.

## Behaviour

- **On mount,** the directive records the element that has focus, and then calls `el.focus()` on the trapped element unless `.manual` is set.
- **`Tab` on the last stop moves focus to the first. `Shift+Tab` on the first stop moves it to the last.** `Tab` on any other stop is left to the browser.
- **The stops are recomputed on every key press,** so a list that changes between presses, such as a calendar that changes month, is respected.
- **Nothing is intercepted when the element holds no focusable content.**
- **On unmount,** the directive removes its listener and returns focus to the element that had it at mount, if that element is still in the document.
- **Focus is not returned when it has already moved on.** If focus is on an element outside the trapped one, and not on the page body, the directive leaves it there. Closing a popover by clicking another field then does not pull focus back.
- **Each element keeps its own state,** so stacked dialogs do not overwrite each other's listener, and each one gives focus back to its own opener.

### Which elements are stops

The directive looks for these candidates:

- links with `href`, and `area[href]`
- `input` elements, except `type="hidden"`
- `select`, `textarea` and `button` elements
- `iframe`, `object` and `embed`
- `summary` elements, and `audio` and `video` elements with `controls`
- elements with a `tabindex`
- elements with `contenteditable`, except `contenteditable="false"`

The directive then removes any element that is disabled, or that has a `disabled` attribute. It also removes any element whose `tabIndex` is below `0`, which excludes the inactive cells in a roving-tabindex widget. Hidden, inert and invisible elements are removed too. Positive `tabindex` values come first, lowest first, followed by the remaining stops in DOM order. A named radio group contributes one stop. When `Tab` wraps onto an unchecked group, focus lands where the browser would enter it: on the first radio going forward, and on the last radio going back.

## Notes

- **Give the element a `tabindex`.** `focus()` on a `div` with no `tabindex` does nothing, so the default focus on mount has no effect. Add `tabindex="-1"`, as the dialog panel does.
- **`Shift+Tab` pressed while the trapped element itself holds focus is not intercepted.** The element is not one of the stops, so focus leaves the trap. This is the state right after the default focus on mount.
- **It handles the `Tab` key only.** A click or a pointer tap outside can still move focus out, and the directive does not make the rest of the page inert. Handle dismissal in the host, for example on `Escape`.
- **With `.manual`, the directive still records the element that had focus at mount and still gives it back,** under the same rule as above.
- Compare [v-focus](/docs/directives/focus), which only moves focus on mount and does not trap or give it back.
