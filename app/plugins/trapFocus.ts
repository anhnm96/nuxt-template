import type { DirectiveHook } from 'vue'

function findFocusable(element: HTMLElement) {
  if (!element) return null

  return element.querySelectorAll<HTMLElement>(`a[href]:not([tabindex="-1"]),
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

const mounted: DirectiveHook<HTMLElement> = (el) => {
  const onKeyDown = createKeyDownHandler(el)
  traps.set(el, {
    onKeyDown,
    previouslyFocused: document.activeElement as HTMLElement | null,
  })

  // move focus inside the root element
  el.focus()
  el.addEventListener('keydown', onKeyDown)
}

const beforeUnmount: DirectiveHook<HTMLElement> = (el) => {
  const trap = traps.get(el)
  if (!trap) return

  el.removeEventListener('keydown', trap.onKeyDown)
  traps.delete(el)

  // Hand focus back to whatever opened the trap, so keyboard users aren't
  // dropped at the top of the document when a dialog closes.
  if (trap.previouslyFocused?.isConnected)
    trap.previouslyFocused.focus()
}

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('trapFocus', {
    mounted,
    beforeUnmount,
  })
})
