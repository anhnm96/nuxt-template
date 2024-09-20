import { defineConfig, presetWind, transformerDirectives, transformerVariantGroup } from 'unocss'
import defaultThemes from '~/unocss/themes.json'
import { getRgbChannels } from '~/unocss/multi-theme.js'

// function flattenColorPalette(colors: any): Record<string, string> {
//   return Object.assign({}, ...Object.entries(colors !== null && colors !== void 0 ? colors : {}).flatMap(([color, values]) => typeof values == 'object'
//     ? Object.entries(flattenColorPalette(values)).map(([number, hex]) => ({
//       [color + (number === 'DEFAULT' ? '' : `-${number}`)]: hex,
//     }))
//     : [
//         {
//           [`${color}`]: values,
//         },
//       ]))
// }

export default defineConfig({
  presets: [presetWind()],
  extendTheme: theme => ({
    ...theme,
    breakpoints: {
      ...theme.breakpoints,
      sm: '520px',
      lg: '976px',
    },
  }),
  theme: {
    colors: {
      info: 'var(--info)',
      success: 'var(--success)',
      warning: 'var(--warning)',
      danger: 'var(--danger)',
      // primary: 'var(--primary)',
      highlight: '#6202FF',
      primary: {
        50: 'rgba(var(--primary-50), <alpha-value>)',
        100: 'rgba(var(--primary-100), <alpha-value>)',
        200: 'rgba(var(--primary-200), <alpha-value>)',
        300: 'rgba(var(--primary-300), <alpha-value>)',
        400: 'rgba(var(--primary-400), <alpha-value>)',
        500: 'rgba(var(--primary-500), <alpha-value>)',
        600: 'rgba(var(--primary-600), <alpha-value>)',
        700: 'rgba(var(--primary-700), <alpha-value>)',
        800: 'rgba(var(--primary-800), <alpha-value>)',
        900: 'rgba(var(--primary-900), <alpha-value>)',
      },
    },
    fontSize: {
      '4.5xl': ['2.625rem', '1.15'],
      '5.5xl': ['3.375rem', '1'],
    },
    zIndex: {
      dialog: '100',
    },
    animation: {
      keyframes: {
        'roll-reveal': `{
          from { transform: rotate(12deg) scale(0); opacity: 0 }
          to { transform: rotate(0deg) scale(1); opacity: 1 }
        }`,
        'fade-in': `{
          from { opacity: 0 }
          to { opacity: 1 }
        }`,
        'slide-top': `{
          from {
            opacity: 0;
            transform: translateY(20px)
          },
          to {
            opacity: 1;
            transform: translateY(0)
          }
        }`,
        'slide-left': `{
          from {
            opacity: 0;
            transform: translateX(20px)
          }
          to {
            opacity: 1;
            transform: translateX(0)
          }
        }`,
      },
      durations: {
        'roll-reveal': '0.4s',
        'fade-in': '0.4s',
        'slide-top': '0.3s',
        'slide-left': '0.3s',
      },
      timingFns: {
        'roll-reveal': 'linear(0, .007, .029 2.2%, .118 4.7%, .625 14.4%, .826 19%, .902, .962, 1.008 26.1%, 1.041 28.7%, 1.064 32.1%, 1.07 36%, 1.061 40.5%, 1.015 53.4%, .999 61.6%, .995 71.2%, 1)',
        'fade-in': 'ease-out',
        'slide-top': 'ease-out',
        'slide-left': 'ease-out',
      },
      properties: {
        'roll-reveal': { 'animation-fill-mode': 'backwards' },
        'fade-in': { 'animation-fill-mode': 'backwards' },
        'slide-top': { 'animation-fill-mode': 'backwards' },
        'slide-left': { 'animation-fill-mode': 'backwards' },
      },
    },
  },
  variants: [
    (matcher) => {
      if (matcher.startsWith('initial:')) {
        return {
          matcher: matcher.slice(8),
          selector: s => `html :where(${s})`,
        }
      }
    },
  ],
  rules: [
    [
      /^grid-auto-fit-(\w+)$/,
      ([, value]) => {
        return {
          'grid-template-columns': `repeat(auto-fit, minmax(${value}, 1fr))`,
        }
      },
    ],
  ],
  preflights: [
    {
      getCSS: () => `
        :root {
          --primary-50:  ${getRgbChannels(defaultThemes.base['50'])};
          --primary-100: ${getRgbChannels(defaultThemes.base['100'])};
          --primary-200: ${getRgbChannels(defaultThemes.base['200'])};
          --primary-300: ${getRgbChannels(defaultThemes.base['300'])};
          --primary-400: ${getRgbChannels(defaultThemes.base['400'])};
          --primary-500: ${getRgbChannels(defaultThemes.base['500'])};
          --primary-600: ${getRgbChannels(defaultThemes.base['600'])};
          --primary-700: ${getRgbChannels(defaultThemes.base['700'])};
          --primary-800: ${getRgbChannels(defaultThemes.base['800'])};
          --primary-900: ${getRgbChannels(defaultThemes.base['900'])};
        }
        ${Object.entries(defaultThemes).map(([key, value]) => `
          [data-theme="${key}"] {
            --primary-50:  ${getRgbChannels(value['50'])};
            --primary-100: ${getRgbChannels(value['100'])};
            --primary-200: ${getRgbChannels(value['200'])};
            --primary-300: ${getRgbChannels(value['300'])};
            --primary-400: ${getRgbChannels(value['400'])};
            --primary-500: ${getRgbChannels(value['500'])};
            --primary-600: ${getRgbChannels(value['600'])};
            --primary-700: ${getRgbChannels(value['700'])};
            --primary-800: ${getRgbChannels(value['800'])};
            --primary-900: ${getRgbChannels(value['900'])};
          }
        `).join(' ')}
    `,
    },
  ],
  transformers: [transformerDirectives(), transformerVariantGroup()],
})
