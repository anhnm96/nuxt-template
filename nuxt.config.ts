// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: false },
  css: ['@/assets/css/main.css'],
  modules: ['@unocss/nuxt', '@pinia/nuxt'],
  imports: {
    dirs: ['composables/*/index.{ts,js,mjs,mts}'],
    presets: [
      {
        from: '@tanstack/vue-query',
        imports: ['useQuery', 'useQueries', 'useInfiniteQuery', 'useMutation', 'useQueryClient', 'useIsFetching'],
      },
    ],
  },
})
