import type { DirectiveHook, ObjectDirective } from 'vue'

/**
 * The elements this trap can wrap to — the *tab ring*, not everything focusable.
 *
 * The `tabIndex >= 0` filter is load-bearing: the selector's `button:not([disabled])`
 * clause has no `tabindex` exclusion, so a roving-tabindex widget reports every one of
 * its cells. `Calendar` matched 48 elements where only 7 are tabbable, and named a
 * `tabindex="-1"` day cell as the last stop — so `Tab` from the real roving cell, which
 * sits somewhere in the middle, matched neither boundary and walked straight out of the
 * trap. An element the author removed from the tab order is not a boundary of it.
 */
function findFocusable(element: HTMLElement) {
  if (!element) return null

  const candidates = element.querySelectorAll<HTMLElement>(`a[href]:not([tabindex="-1"]),
                                 area[href],
                                 input:not([disabled]):not([type="hidden"]),
                                 select:not([disabled]),
                                 textarea:not([disabled]),
                                 button:not([disabled]),
                                 iframe,
                                 object,
                                 embed,
                                 *[tabindex]:not([tabindex="-1"]):not([disabled]),
                                 *[contenteditable]`)

  return Array.from(candidates).filter(candidate => candidate.tabIndex >= 0)
}

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
    const target = event.target as HTMLElement
    if (!target) return

    // Need to get focusable each time since it can change between key events
    // ex. changing month in a datepicker
    const focusable = findFocusable(el)
    if (!focusable?.length) return

    const firstFocusable = focusable[0]
    const lastFocusable = focusable[focusable.length - 1]

    if (
      target === firstFocusable
      && event.shiftKey
      && event.key === 'Tab'
    ) {
      // prevent moving focus outside by setting the focus to last focusable element
      event.preventDefault()
      lastFocusable?.focus()
    } else if (
      target === lastFocusable
      && !event.shiftKey
      && event.key === 'Tab'
    ) {
      // prevent moving focus outside by setting the focus to first focusable element
      event.preventDefault()
      firstFocusable?.focus()
    }
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

const beforeUnmount: DirectiveHook<HTMLElement> = (el) => {
  const trap = traps.get(el)
  if (!trap) return

  el.removeEventListener('keydown', trap.onKeyDown)
  traps.delete(el)

  // Hand focus back to whatever opened the trap, so keyboard users aren't
  // dropped at the top of the document when a dialog closes.
  //
  // Unless something else has legitimately taken focus already — closing a non-modal
  // popover by clicking another field would otherwise yank focus straight back out of
  // it. Same guard, and the same reason, as `Dropdown`'s own restore.
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
