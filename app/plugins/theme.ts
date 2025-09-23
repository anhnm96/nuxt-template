export default defineNuxtPlugin({
  enforce: 'post',
  setup() {
    const appConfig = useAppConfig()

    if (import.meta.client) {
      function updateColor(type: 'primary') {
        const color = localStorage.getItem(`nuxt-ui-${type}`)
        if (color) {
          appConfig.theme.colors[type] = color
        }
      }

      watch(() => appConfig.theme.colors.primary, (value) => {
        document.documentElement.setAttribute('data-theme', value)
      })
      updateColor('primary')
      // updateColor('neutral')
    }
    if (import.meta.server) {
      useHead({
        script: [{
          innerHTML: `
           if (localStorage.getItem('nuxt-ui-primary')) {
              const primaryColor = localStorage.getItem('nuxt-ui-primary');
              document.documentElement.setAttribute('data-theme', primaryColor)
            }
          `.replace(/\s+/g, ' '),
          type: 'text/javascript',
          tagPriority: -1,
        }],
      })
    }
  },
})
