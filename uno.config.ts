import {
  defineConfig,
  presetWind,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss'

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
  theme: {
    colors: {
      info: 'var(--info)',
      success: 'var(--success)',
      warning: 'var(--warning)',
      danger: 'var(--danger)',
      primary: 'var(--primary)',
      rainforest: {
        50: '#ecfdf4',
        100: '#c9f2de',
        200: '#9de9c6',
        300: '#56d0a0',
        400: '#00b380',
        500: '#009268',
        600: '#007955',
        700: '#006344',
        800: '#005038',
        900: '#003422',
      },
    },
  },
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
    // {
    // getCSS: ({ theme }) => {
    //   const allColors = flattenColorPalette(theme.colors)
    //   const newVars = Object.fromEntries(
    //     Object.entries(allColors).slice(3).map(([key, val]) => [`--${key}`, val]),
    //   )
    //   console.log(Object.values(newVars)[0])
    //   // return ''
    //   fs.writeFileSync(`./t.txt`, JSON.stringify(newVars, undefined, 2), 'utf-8')
    //   // return ''
    //   return `
    //     :root ${JSON.stringify(newVars, undefined, 2).replace(/"(--[a-z0-9-]+)": "(#\w+)",*/g, '$1:$2;')}
    //   `
    // },
    // },
  ],
  transformers: [transformerDirectives(), transformerVariantGroup()],
})
