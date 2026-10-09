export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('clickOutside', {
    mounted(el, binding) {
      let targetEl = el
      if (binding.modifiers.parent) targetEl = el.parentElement
      // binding.arg doubles as a whitelist of selectors (e.g. ['.v-overlay-container'])
      // whose elements count as "inside" even though they aren't DOM descendants of
      // targetEl — needed for content teleported outside it, like Vuetify overlays.
      const whitelist: string[] = Array.isArray(binding.arg) ? binding.arg : []
      targetEl.__ClickOutsideHandler__ = (event: Event) => {
        const target = event.target as Node
        // check if event's target is the el or contained by el
        if (targetEl === target || targetEl.contains(target)) return
        const isWhitelisted = whitelist.some(selector =>
          [...document.querySelectorAll(selector)].some(node => node.contains(target)))
        if (isWhitelisted) return
        binding.value(event)
      }
      // Deferred a frame so the click that opened this element does not immediately close
      // it. The frame id is kept, because `beforeUnmount` has to be able to cancel a frame
      // that has not run yet: otherwise it removes a listener that is not attached, the
      // frame then attaches one, and nothing is left to remove it.
      targetEl.__ClickOutsideFrame__ = requestAnimationFrame(() => {
        targetEl.__ClickOutsideFrame__ = undefined
        document.body.addEventListener('click', targetEl.__ClickOutsideHandler__)
      })
    },
    beforeUnmount(el, binding) {
      let targetEl = el
      if (binding.modifiers.parent) targetEl = el.parentElement
      if (targetEl.__ClickOutsideFrame__ !== undefined) {
        cancelAnimationFrame(targetEl.__ClickOutsideFrame__)
        targetEl.__ClickOutsideFrame__ = undefined
      }
      document.body.removeEventListener(
        'click',
        targetEl.__ClickOutsideHandler__,
      )
    },
  })
})
