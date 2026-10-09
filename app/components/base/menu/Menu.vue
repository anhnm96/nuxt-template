<script setup lang="ts">
import { provideMenuContext } from './context'

/**
 * A list of commands, or of one-of-N property setters. Not a listbox — see ADR-0009 for why
 * the distinction is load-bearing rather than pedantic.
 *
 * The Menu owns no placement. A Menu Host positions it and supplies dismissal:
 * `Dropdown` where a trigger element exists, `ContextMenu` where only a point does.
 */
const props = defineProps<{
  /** Names the Menu for a screen reader. Give this or `labelledBy`. */
  label?: string
  /** Id of the element naming the Menu — usually the Host's trigger. */
  labelledBy?: string
}>()

const listEl = useTemplateRef<HTMLElement>('listEl')
const popover = injectPopoverContext(NO_POPOVER)

/**
 * Whether a Menu Host is wrapping this Menu. A Menu only ever mounts inside a popover once
 * that popover opens, so having a Host is what makes mounting mean "the user just opened
 * me" — and that is a request for focus, per the APG menu-button pattern.
 *
 * Rendered inline, with no Host, mounting means nothing of the sort, and grabbing the
 * page's focus on render would be the bug ADR-0005 records for an inline `<Calendar>`.
 */
const hasHost = popover !== NO_POPOVER

/**
 * Menu Items are read from the DOM rather than from a registry.
 *
 * Roving `tabindex` is what makes this affordable: DOM order is the navigation order by
 * construction, `aria-disabled` is already on the element, and real focus means the browser
 * scrolls the Focused Item into view. A registry would have to re-derive all three, and sort
 * itself by DOM position anyway once a `v-if` is involved.
 */
function items(): HTMLElement[] {
  if (!listEl.value) return []
  return Array.from(listEl.value.querySelectorAll<HTMLElement>('[role^="menuitem"]'))
}

function isDisabled(el: HTMLElement) {
  return el.getAttribute('aria-disabled') === 'true'
}

/** `data-label` when the item declared one, otherwise whatever the row reads as. */
function labelOf(el: HTMLElement) {
  return el.dataset.label ?? el.textContent?.trim() ?? ''
}

// ------------------------------------------------------------- roving tabindex

/** Exactly one item is in the tab order, so `Tab` leaves the Menu instead of walking it. */
function setTabStop(target: HTMLElement | null) {
  for (const el of items()) el.tabIndex = el === target ? 0 : -1
}

/**
 * Where the Menu opens: the Checked Item if there is one, else the first enabled item.
 * A font-size menu showing `11` must open on `11`, not on `8`. This mirrors `useSelect`'s
 * `positionOnOpen`.
 */
function initialTarget() {
  const list = items()
  return list.find(el => el.getAttribute('aria-checked') === 'true' && !isDisabled(el))
    ?? list.find(el => !isDisabled(el))
    ?? null
}

/**
 * No Menu Item can hold focus — every one is disabled, or there are none at all. The Menu
 * itself becomes the tab stop then, the same fallback the Calendar panels use (ADR-0005).
 * Without it there is no keyboard route in, and worse, `Escape` is handled by the Host on
 * an element that never receives focus, so the Menu cannot be dismissed from the keyboard.
 */
const needsOwnTabStop = shallowRef(false)

/**
 * Re-establishes the tab stop when the current one has gone — a `v-if` removed it, or it
 * became disabled. Leaves a valid tab stop alone, so this never drags focus back while the
 * user is navigating.
 */
function syncTabStop() {
  const current = items().find(el => el.tabIndex === 0)
  if (current && !isDisabled(current)) {
    needsOwnTabStop.value = false
    return
  }
  const active = document.activeElement
  const target = initialTarget()
  setTabStop(target)
  needsOwnTabStop.value = target === null

  // Focus has to follow when the element holding it is the one this call unfocuses: the
  // root giving up its own tab stop (the browser blurs an element whose `tabindex` goes
  // away), or an item a `v-if` removed, which already dropped focus to `<body>`. Left
  // there, neither the Menu's own keys nor the Host's `Escape` reach anything.
  const strandedFocus = active === listEl.value || (hasHost && active === document.body)
  if (target && strandedFocus) target.focus()
}

onMounted(() => {
  syncTabStop()
  // Settle the tab stop first: `focus()` aims at it.
  if (hasHost) focus()
})
// Slot content is compiled into this component, so a consumer's `v-if`/`v-for` lands here.
onUpdated(syncTabStop)

/**
 * The single place the tab stop moves. Keyboard navigation and pointer hover both work by
 * focusing an item, so both arrive here and neither needs its own bookkeeping.
 */
function handleFocusIn(event: FocusEvent) {
  const el = (event.target as HTMLElement | null)?.closest<HTMLElement>('[role^="menuitem"]')
  if (el) setTabStop(el)
}

// ------------------------------------------------------------------- keyboard

const nav = useListNavigation({
  entries: () => items().map(el => ({ disabled: isDisabled(el), label: labelOf(el) })),
  // Real focus *is* the cursor, so there is no second copy of it to keep in step.
  index: () => items().indexOf(document.activeElement as HTMLElement),
  onMove: index => items()[index]?.focus(),
  // Menus come round at the ends; `Select` clamps. Both follow their own APG pattern — see
  // ADR-0009, and the "Clamp, not wrap" note in base/select/DESIGN.md.
  loop: true,
})

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Tab') {
    // "Focus moved" and "value changed" are never the same gesture, so this commits nothing.
    // Deliberately not prevented: the Tab itself still moves focus out.
    popover.dismiss()
    return
  }
  // `Shift`+`F10` and the context-menu key summon the browser's own menu, which would open
  // on top of this one. No Host can stop it: the popover is teleported, so the keypress
  // never reaches the element whose handler would cancel it. A Menu is already a context
  // menu, so it swallows the gesture rather than opening a second one.
  //
  // This alone only settles Chrome, which drops the `contextmenu` event when the keydown
  // is cancelled. Firefox fires it anyway, so the root also carries `@contextmenu.prevent`
  // — which has to be there regardless, to stop a right-click *inside* the Menu opening
  // the browser's menu over it.
  if (event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey)) {
    event.preventDefault()
    return
  }

  // `Enter` and `Space` belong to the item that has focus; `Escape` belongs to the Host.
  nav.handleKeydown(event)
}

provideMenuContext({
  onItemActivate: () => popover.dismiss(),
})

if (import.meta.dev) {
  watchEffect(() => {
    if (!props.label && !props.labelledBy) {
      console.warn(
        '[Menu] needs `label` or `labelledBy`. Without one, a set of Checked Items is '
        + 'announced as a bare "11, checked" with no hint that it is a font size.',
      )
    }
  })
}

/**
 * Moves real focus into the Menu, at the tab stop. The Menu calls this on mount whenever it
 * has a Host, because mounting inside a popover means the user just opened it — see
 * DESIGN.md, "Opening is a request for focus". Leaving it to the Host does not work.
 *
 * It stays exposed for `ContextMenu`, where it is not redundant: re-opening while the leave
 * transition still runs reuses the Menu, so `onMounted` does not fire a second time.
 */
function focus() {
  const target = items().find(el => el.tabIndex === 0) ?? initialTarget()
  if (target) return target.focus()

  // Nothing here can hold focus, so take it ourselves rather than leaving focus outside
  // the popover, where the Host's `Escape` handler would never see a keypress.
  //
  // The attribute is written directly instead of waiting for `needsOwnTabStop` to render:
  // a Host focuses the Menu in the same tick it mounts, and `.focus()` does nothing to an
  // element that is not focusable yet. The flag is set with it so the next patch agrees.
  const el = listEl.value
  if (!el) return
  needsOwnTabStop.value = true
  el.tabIndex = 0
  el.focus()
}

defineExpose({
  focus,
})
</script>

<template>
  <div
    ref="listEl"
    role="menu"
    class="menu"
    :tabindex="needsOwnTabStop ? 0 : undefined"
    :aria-label="label"
    :aria-labelledby="labelledBy"
    data-slot="menu"
    @keydown="handleKeydown"
    @focusin="handleFocusIn"
    @contextmenu.prevent
  >
    <slot />
  </div>
</template>
