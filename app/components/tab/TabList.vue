<script setup lang="ts">
import { injectTabsRootContext } from './context'

withDefaults(defineProps<{ as?: string }>(), { as: 'div' })
const { orientation } = injectTabsRootContext()

function mod(index: number, total: number): number {
  return ((index % total) + total) % total
}

const tabListEl = useTemplateRef<HTMLElement>('tablist')
// `tab-${value.toString()}__${tabsId}`
function getFirstViableItem(
  target: HTMLButtonElement,
  forward: boolean,
  index?: number,
) {
  const tabs = Array.from<HTMLButtonElement>(tabListEl.value!.querySelectorAll('[role="tab"]'))
  if (tabs.length < 1) return
  if (index === undefined) index = tabs.indexOf(target)
  const direction = forward ? 1 : -1
  let newIndex = index

  while (true) {
    newIndex = mod(newIndex + direction, tabs.length)
    if (newIndex === index) break
    // Break if the item at this index is viable (not disabled and is visible)
    if (!tabs[newIndex]!.disabled && !tabs[newIndex]!.ariaDisabled) {
      tabs[newIndex]?.click()
      tabs[newIndex]?.focus()
      return
    }
  }
}

/** Focus the next item or wrap around. */
function onNext(event: KeyboardEvent): void {
  if (
    (orientation.value === 'vertical' && event.key === 'ArrowDown')
    || (orientation.value !== 'vertical' && event.key === 'ArrowRight')
  ) {
    getFirstViableItem(event.target as HTMLButtonElement, true)
  }
}

/** Focus the previous item or wrap around. */
function onPrev(event: KeyboardEvent): void {
  if (
    (orientation.value === 'vertical' && event.key === 'ArrowUp')
    || (orientation.value !== 'vertical' && event.key === 'ArrowLeft')
  ) {
    getFirstViableItem(event.target as HTMLButtonElement, false)
  }
}

/** Focus to the first viable item. */
function onHomePressed(event: KeyboardEvent): void {
  getFirstViableItem(event.target as HTMLButtonElement, true, -1)
}

/** Focus to the last viable item. */
function onEndPressed(event: KeyboardEvent): void {
  getFirstViableItem(event.target as HTMLButtonElement, false, 0)
}
</script>

<template>
  <component
    :is="as" ref="tablist" role="tablist" :aria-orientation="orientation"
    class="relative"
    @keydown.left.prevent="onPrev"
    @keydown.right.prevent="onNext"
    @keydown.up.prevent="onPrev"
    @keydown.down.prevent="onNext"
    @keydown.home.prevent="onHomePressed"
    @keydown.end.prevent="onEndPressed"
  >
    <slot />
  </component>
</template>
