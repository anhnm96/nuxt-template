import { defineConfig, presetWind, transformerDirectives, transformerVariantGroup } from 'unocss'
import { getColorUtilitiesWithCssVariableReferences, getCssVariableDeclarations, styleString } from './unocss/multi-theme'
import defaultThemes from './unocss/themes.json'

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
      ...getColorUtilitiesWithCssVariableReferences(Object.values(defaultThemes)[0]),
      info: 'var(--info)',
      success: 'var(--success)',
      warning: 'var(--warning)',
      danger: 'var(--danger)',
      highlight: '#6202FF',
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
        :root ${styleString(getCssVariableDeclarations(Object.values(defaultThemes)[0]))}

        ${Object.entries(defaultThemes).map(([key, value]) => `
          [data-theme="${key}"] ${styleString(getCssVariableDeclarations(value))}
        `).join(' ')}
      `,
    },
  ],
  transformers: [transformerDirectives(), transformerVariantGroup()],
})
