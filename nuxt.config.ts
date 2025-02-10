import Lara from '@primevue/themes/lara'
import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: false },
  ssr: false,
  compatibilityDate: '2024-08-18',
  css: ['~/assets/css/main.css'],
  // css: ['@unocss/reset/tailwind.css', '~/assets/css/main.css'],
  modules: [
    '@nuxtjs/i18n',
    '@nuxtjs/color-mode',
    '@pinia/nuxt',
    '@pinia/colada-nuxt',
    '@nuxt/icon',
    '@vueuse/nuxt',
    '@vee-validate/nuxt',
    '@primevue/nuxt-module',
    'v-lazy-show/nuxt',
  ],
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
  components: {
    dirs: [{
      path: '~/components',
      pathPrefix: false,
    }],
  },
  imports: {
    dirs: ['composables/*/index.{ts,js,mjs,mts}'],
  },
  colorMode: {
    preference: 'rainforest',
    dataValue: 'theme',
    classSuffix: '',
    fallback: 'rainforest',
  },
  veeValidate: {
    typedSchemaPackage: 'valibot',
  },
  vite: { plugins: [tailwindcss()] },
  i18n: {
    locales: [
      {
        code: 'en',
        files: ['en/common.json', 'en/game-management.json', 'en/country.json'],
      },
      {
        code: 'ja',
        files: ['ja/common.json', 'ja/game-management.json', 'ja/country.json'],
      },
    ],
    lazy: true,
    defaultLocale: 'en',
    langDir: 'locales',
  },
  primevue: {
    autoImport: false,
    options: {
      theme: {
        preset: Lara,
        options: { darkModeSelector: '.dark' },
      },
    },
    components: {
      include: ['Badge', 'Select'],
    },
  },
})
