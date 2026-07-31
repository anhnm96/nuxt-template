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
      requestAnimationFrame(() => {
        document.body.addEventListener('click', targetEl.__ClickOutsideHandler__)
      })
    },
    beforeUnmount(el, binding) {
      let targetEl = el
      if (binding.modifiers.parent) targetEl = el.parentElement
      document.body.removeEventListener(
        'click',
        targetEl.__ClickOutsideHandler__,
      )
    },
  })
})
