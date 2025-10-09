import type { NuxtPage } from 'nuxt/schema'
import Lara from '@primevue/themes/lara'
import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: false },
  ssr: false,
  routeRules: {
    // '/demo': { ssr: true },
    '/': { prerender: true },
    '/radiant': { prerender: true },
  },
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
    '@formkit/auto-animate/nuxt',
    '@crazydos/nuxt-msw',
    '@nuxt/fonts',
    'nuxt-echarts',
    'motion-v/nuxt',
  ],
  fonts: {
    defaults: {
      weights: [400, 500, 600, 700],
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
        if (page.path.includes('component') || page.path.includes('constant') || page.path.includes('type')) pagesToRemove.push(page)
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
      ignore: ['**/context.ts'],
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
    mode: 'svg',
  },
  veeValidate: {
    typedSchemaPackage: 'valibot',
  },
  vite: { plugins: [tailwindcss()] },
  i18n: {
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
    lazy: true,
    defaultLocale: 'en',
    langDir: '',
    strategy: 'no_prefix',
    bundle: {
      optimizeTranslationDirective: false,
    },
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
      exclude: ['Button', 'Tabs', 'TabList', 'TabPanels', 'Tab', 'TabPanel'],
      include: ['Badge', 'Select', 'MultiSelect'],
    },
    composables: {
      exclude: ['useToast'],
    },
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
