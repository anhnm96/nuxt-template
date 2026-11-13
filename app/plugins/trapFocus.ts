import type { DirectiveHook, ObjectDirective } from 'vue'

import { getTabEnds } from '~/utils/getTabStops'

interface TrapState {
  onKeyDown: (event: KeyboardEvent) => void
  /** Element focused before the trap took over, restored when it tears down. */
  previouslyFocused: HTMLElement | null
}

/**
 * Keyed by element: a single module-level handler would be overwritten by the
 * next trap (stacked dialogs), leaving the earlier element's listener attached
 * forever and unremovable.
 */
const traps = new WeakMap<HTMLElement, TrapState>()

function createKeyDownHandler(el: HTMLElement) {
  return (event: KeyboardEvent): void => {
    if (event.key !== 'Tab') return

    // Recompute the ends when a widget changes its focusable content.
    const { first, last } = getTabEnds(el)
    if (!first || !last || event.target !== (event.shiftKey ? first : last)) return

    // Land where the browser would enter: the first stop going forward, the last going back.
    const landing = event.shiftKey ? last : first
    event.preventDefault()
    landing.focus()
  }
}

const mounted: DirectiveHook<HTMLElement> = (el, binding) => {
  const onKeyDown = createKeyDownHandler(el)
  traps.set(el, {
    onKeyDown,
    previouslyFocused: document.activeElement as HTMLElement | null,
  })

  /*
    `.manual` — trap the tab ring, but let the host say when focus enters. A modal
    dialog should take focus the moment it appears; a non-modal popover over a text
    field must not, because the field stays the primary control (see `DatePicker`,
    where focus enters only on ArrowDown).

    Opting out explicitly rather than relying on `el.focus()` being a no-op on a root
    with no `tabindex`: that is a browser focusability rule, not a contract. jsdom
    already disagrees and focuses the element, and adding `tabindex="-1"` to a root
    for unrelated reasons would silently restore the focus steal.
  */
  if (!binding.modifiers.manual) el.focus()
  el.addEventListener('keydown', onKeyDown)
}

const beforeUnmount: DirectiveHook<HTMLElement> = (el, binding) => {
  const trap = traps.get(el)
  if (!trap) return

  el.removeEventListener('keydown', trap.onKeyDown)
  traps.delete(el)

  // `.no-restore` — the host restores focus itself. `DatePicker`'s Popover does, under a
  // narrower rule: this one would also restore after a click on empty page space.
  if (binding.modifiers['no-restore']) return

  // Hand focus back to whatever opened the trap, so keyboard users aren't
  // dropped at the top of the document when a dialog closes.
  //
  // Unless something else has legitimately taken focus already — closing a non-modal
  // popover by clicking another field would otherwise yank focus straight back out of
  // it. Focus on `<body>` still counts as lost: a modal dialog closed by its backdrop
  // must hand focus back. The Popover's restore is narrower, so a trap inside a Popover
  // uses `.no-restore` and leaves restoring to the Popover.
  const active = document.activeElement
  const focusMovedOn = active && active !== document.body && !el.contains(active)
  if (!focusMovedOn && trap.previouslyFocused?.isConnected)
    trap.previouslyFocused.focus()
}

/**
 * Exported so it can be registered directly in a test. The tab ring it computes is
 * shared by every consumer, so it needs a spec of its own rather than being covered
 * only through whichever component happens to use it.
 */
export const trapFocus: ObjectDirective<HTMLElement> = { mounted, beforeUnmount }

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('trapFocus', trapFocus)
})
