// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: false },
  compatibilityDate: '2024-08-18',
  css: ['@unocss/reset/tailwind.css', '@/assets/css/main.css'],
  modules: ['@unocss/nuxt', '@pinia/nuxt', '@nuxt/icon', 'v-lazy-show/nuxt', '@vueuse/nuxt', '@nuxtjs/color-mode'],
  app: {
    head: {
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap' },
      ],
      title: 'Epic Stack',
    },
  },
  imports: {
    dirs: ['composables/*/index.{ts,js,mjs,mts}'],
    presets: [
      {
        from: '@tanstack/vue-query',
        imports: ['useQuery', 'useQueries', 'useInfiniteQuery', 'useMutation', 'useQueryClient', 'useIsFetching'],
      },
    ],
  },
  colorMode: {
    preference: 'rainforest',
    dataValue: 'theme',
    classSuffix: '',
    fallback: 'rainforest',
  },
})
