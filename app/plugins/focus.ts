export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('focus', {
    mounted(el) {
      nextTick(() => {
        el.focus()
      })
    },
  })
})
