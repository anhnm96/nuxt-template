import type { NuxtPage } from 'nuxt/schema'
import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: false },
  experimental: {
    payloadExtraction: 'client',
  },
  features: {
    // An inlined component style that declares `@layer components` would come before main.css
    // and make `components` the lowest layer, below Tailwind's `base` reset.
    inlineStyles: false,
  },
  routeRules: {
    // Keep the demos client-rendered without disabling payload extraction globally.
    '/**': { ssr: false },
    '/': { prerender: true },
    '/radiant': { prerender: true },
    // Prerender both the docs HTML and the payload used by client-side navigation.
    '/docs': { ssr: true, prerender: true },
    '/docs/**': { ssr: true, prerender: true },
  },
  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ['/', '/radiant', '/docs'],
      // The docs render on the server, so the i18n module links its `messages.json` endpoint.
      // That endpoint cannot load the locale files in the prerender bundle, and the static
      // output does not need it.
      ignore: ['/_i18n'],
    },
  },
  compatibilityDate: '2024-08-18',
  css: ['~/assets/css/main.css'],
  modules: [
    '@nuxtjs/i18n',
    '@nuxtjs/color-mode',
    '@pinia/nuxt',
    '@pinia/colada-nuxt',
    '@nuxt/icon',
    '@vueuse/nuxt',
    '@vee-validate/nuxt',
    'v-lazy-show/nuxt',
    '@nuxt/fonts',
    'nuxt-echarts',
    'motion-v/nuxt',
    'z-vue-scan-nuxt-module',
    '@dxup/nuxt',
    'vue-sonner/nuxt',
    '@crazydos/nuxt-msw',
    '@nuxt/content',
  ],
  vueScan: {
    enable: false,
  },
  fonts: {
    defaults: {
      weights: [400, 500, 600, 700],
      styles: ['normal'],
      subsets: ['latin'],
      // The pages render on the client, so the browser finds the fonts only after the app has
      // drawn text. A preload hint in the HTML starts the download with the script instead.
      preload: true,
    },
  },
  app: {
    head: {
      title: 'Epic Stack',
    },
  },
  hooks: {
    'pages:extend': function (pages) {
      const pagesToRemove: NuxtPage[] = []
      pages.forEach((page) => {
        if (page.path.includes('components')
          || page.path.includes('constants')
          || page.path.includes('types')
          || page.path.includes('utils')
          || page.path.includes('composables')) pagesToRemove.push(page)
      })

      pagesToRemove.forEach((page: NuxtPage) => {
        pages.splice(pages.indexOf(page), 1)
      })
    },
  },
  components: [
    {
      path: '~/components',
      pathPrefix: false,
      ignore: ['**/context.ts', '**/composables/**', '**/utils.ts', '**/use*.ts', '**/*.spec.ts'],
    },
  ],
  imports: {
    dirs: ['composables/*/index.{ts,js,mjs,mts}'],
  },
  colorMode: {
    // preference: 'rainforest',
    // dataValue: 'theme',
    classSuffix: '',
    fallback: 'dark',
  },
  icon: {
    clientBundle: {
      scan: true,
    },
  },
  veeValidate: {
    typedSchemaPackage: 'valibot',
  },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      dedupe: [
        'prosemirror-state',
        'prosemirror-view',
        'prosemirror-model',
        'prosemirror-transform',
      ],
    },
    optimizeDeps: {
      // Direct Vite exactly to the deep entrypoints
      include: [
        '@tiptap/pm/state',
        '@tiptap/pm/view',
        '@tiptap/pm/model',
        '@tiptap/pm/transform',
      ],
    },
  },
  i18n: {
    langDir: 'locales',
    locales: [
      {
        code: 'en',
        language: 'en-US',
        file: 'index.ts',
      },
      {
        code: 'ja',
        language: 'ja-JP',
        file: 'index.ts',
      },
    ],
    defaultLocale: 'en',
    strategy: 'no_prefix',
  },
  echarts: {
    ssr: false,
    renderer: ['svg'], // 'canvas', 'svg'
    charts: ['BarChart', 'LineChart', 'PieChart', 'ScatterChart', 'EffectScatterChart', 'GaugeChart', 'CandlestickChart'],
    components: [
      // 'TitleComponent',
      // 'DatasetComponent',
      'GridComponent',
      'TooltipComponent',
      // 'ToolboxComponent',
      // 'GeoComponent',
      // 'VisualMapComponent',
      'LegendComponent',
    ],
  },
  runtimeConfig: {
    public: {
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api',
      useMockData: '',
    },
  },
  msw: {
    enable: process.env.NUXT_PUBLIC_USE_MOCK_DATA === '1',
  },
})
