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

let onKeyDown: ((event: KeyboardEvent) => void) | null = null

function applyHandler(el: HTMLElement, value = true): void {
  if (value) {
    // move focus inside the root element
    el.focus()

    // set keydown event listener
    if (typeof onKeyDown === 'function')
      el.addEventListener('keydown', onKeyDown)
  } else {
    // remove keydown event listener
    if (typeof onKeyDown === 'function')
      el.removeEventListener('keydown', onKeyDown)
  }
}

const mounted: DirectiveHook<HTMLElement> = (el, { value }) => {
  // create onKeyDown event listener
  onKeyDown = (event: KeyboardEvent): void => {
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

  applyHandler(el, value)
}

const beforeUnmount: DirectiveHook<HTMLElement> = (el) => {
  // remove handler
  applyHandler(el, false)
  onKeyDown = null
}

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('trapFocus', {
    mounted,
    beforeUnmount,
  })
})
