<script setup lang="ts">
import { injectTabsRootContext, isTabDisabled } from './context'

withDefaults(defineProps<{ as?: string }>(), { as: 'div' })
const { orientation, selectTab } = injectTabsRootContext()

const tabListEl = useTemplateRef<HTMLElement>('tablist')

/** Read from the DOM on each key, because that is the order the user sees. */
function getTabs() {
  return Array.from<HTMLElement>(tabListEl.value!.querySelectorAll('[role="tab"]'))
}

// The key being handled: the tabs, read one time, and the index of the tab that raised it.
let tabs: HTMLElement[] = []
let from = -1

// The arithmetic is shared with `Menu` and the listbox; see ADR-0009. Only `move` and the
// two edges are used: the arrow keys depend on the orientation, and a tablist has no
// Typeahead and no page keys.
const { move, moveToStart, moveToEnd } = useListNavigation({
  entries: () => tabs.map(tab => ({ disabled: isTabDisabled(tab), label: '' })),
  index: () => from,
  onMove(index) {
    const tab = tabs[index]!
    // The key can end on the tab that raised it: `Home` on the first tab, or an arrow
    // when no other tab is enabled. A selected tab is not selected again, because that
    // resets a multi-value tab to its primary value.
    if (index === from && tab.getAttribute('aria-selected') === 'true') return

    // Select through the root, never with a click: a click on a multi-value tab opens
    // its menu instead of selecting it.
    selectTab(tab)
    tab.focus()
  },
})

function onKeydown(event: KeyboardEvent): void {
  // A widget the tab holds marks the keys it takes. On a vertical tablist `ArrowDown`
  // opens such a menu and is also our forward key, and one press must not do both.
  if (event.defaultPrevented) return

  // Only a tab's own keys drive navigation. `matches`, not `closest`: content inside a
  // tab keeps its keys. See DESIGN.md, "Only a tab's own keys drive navigation".
  const target = event.target as HTMLElement
  if (!target.matches('[role="tab"]')) return

  tabs = getTabs()
  from = tabs.indexOf(target)

  const forward = orientation.value === 'vertical' ? 'ArrowDown' : 'ArrowRight'
  const backward = orientation.value === 'vertical' ? 'ArrowUp' : 'ArrowLeft'

  switch (event.key) {
    case forward:
      move(1, true)
      break
    case backward:
      move(-1, true)
      break
    case 'Home':
      moveToStart()
      break
    case 'End':
      moveToEnd()
      break
    default:
      // The key is not ours; leave its default behaviour alone.
      return
  }

  event.preventDefault()
}
</script>

<template>
  <component
    :is="as" ref="tablist" role="tablist" :aria-orientation="orientation"
    class="relative"
    @keydown="onKeydown"
  >
    <slot />
  </component>
</template>
