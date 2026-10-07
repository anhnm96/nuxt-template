<script setup lang="ts">
import { injectTabsRootContext } from './context'

withDefaults(defineProps<{ as?: string }>(), { as: 'div' })
const { orientation, selectTab } = injectTabsRootContext()

const tabListEl = useTemplateRef<HTMLElement>('tablist')

/**
 * The tab a key event belongs to, or `undefined` when the event came from content
 * inside a tab. See DESIGN.md, "Only a tab's own keys drive navigation".
 */
function getTabTarget(event: KeyboardEvent) {
  const target = event.target as HTMLElement
  return target.matches('[role="tab"]') ? target as HTMLButtonElement : undefined
}

function getTabs() {
  return Array.from<HTMLButtonElement>(tabListEl.value!.querySelectorAll('[role="tab"]'))
}

/** Navigation skips a tab that is `disabled` or that carries `aria-disabled="true"`. */
function isViable(tab: HTMLButtonElement) {
  return !tab.disabled && tab.getAttribute('aria-disabled') !== 'true'
}

function selectAndFocus(tab: HTMLButtonElement) {
  // Select through the root, never with a click: a click on a multi-value tab opens
  // its menu instead of selecting it.
  selectTab(tab)
  tab.focus()
}

/** Select the next viable tab in the direction, wrapping at the ends. */
function moveSelection(target: HTMLButtonElement, forward: boolean) {
  const tabs = getTabs()
  const from = tabs.indexOf(target)
  if (from < 0) return

  const direction = forward ? 1 : -1

  // Every other tab, nearest first. The bound leaves out `target` itself, so a list
  // whose other tabs are all disabled ends the walk rather than circling.
  for (let step = 1; step < tabs.length; step++) {
    const tab = tabs[mod(from + step * direction, tabs.length)]!
    if (isViable(tab)) {
      selectAndFocus(tab)
      return
    }
  }
}

/** Select the first viable tab, counted from the start of the list or from its end. */
function selectEdge(fromStart: boolean) {
  const tabs = getTabs()
  const tab = (fromStart ? tabs : tabs.reverse()).find(isViable)
  if (tab) selectAndFocus(tab)
}

function onKeydown(event: KeyboardEvent): void {
  // A widget the tab holds marks the keys it takes. On a vertical tablist `ArrowDown`
  // opens such a menu and is also our forward key, and one press must not do both.
  if (event.defaultPrevented) return

  const target = getTabTarget(event)
  if (!target) return

  const forward = orientation.value === 'vertical' ? 'ArrowDown' : 'ArrowRight'
  const backward = orientation.value === 'vertical' ? 'ArrowUp' : 'ArrowLeft'

  switch (event.key) {
    case forward:
      moveSelection(target, true)
      break
    case backward:
      moveSelection(target, false)
      break
    case 'Home':
      selectEdge(true)
      break
    case 'End':
      selectEdge(false)
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
