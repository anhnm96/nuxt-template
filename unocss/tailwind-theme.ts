import { omit } from 'lodash-es'
import colors from 'tailwindcss/colors'
import plugin from 'tailwindcss/plugin'
import themes from './themes.json'

// Type definitions for theme structure
interface ThemeValue {
  [key: string]: string | ThemeValue
}

interface CSSVariableDeclaration {
  [key: string]: string
}

/**
 * Generate flat preset
 * @param {Theme} input - Theme values
 * @example {
              "primary": {
                "400": "#22d3ee",
                "500": "#06b6d4",
                "this": {
                  "is": {
                    "nested": "#007955"
                  }
                }
              }
            }
 * @returns {Preset} Flat object preset
 * @example {
              '--color-primary-400': #22d3ee,
              '--color-primary-500': "#06b6d4",
              '--color-primary-this-is-nested': "#007955"
            }
 */
function getCssVariableDeclarations(
  input: ThemeValue,
  path: string[] = ['color'],
  output: CSSVariableDeclaration = {},
): CSSVariableDeclaration {
  Object.entries(input).forEach(([key, value]) => {
    const newPath = path.concat(key)
    if (typeof value !== 'string') {
      getCssVariableDeclarations(value as ThemeValue, newPath, output)
    } else {
      output[`--${newPath.join('-')}`] = value
    }
  })
  return output
}

/**
 * Generate color extension object
 * @param input - Theme values
 * @example {
              primary: {
                '400': '#22d3ee',
                '500': '#06b6d4',
                'this': {
                  'is': {
                    'nested': '#007955'
                  }
                }
              }
            }
 * @returns {Theme} Color object for unocss
 * @example {
              primary: {
                '400': 'var(--color-primary-400)',
                '500': 'var(--color-primary-500)',
                'this': {
                  'is': {
                    'nested': 'var(--color-primary-this-is-nested)'
                  }
                }
              }
            }
 */
function getColorUtilitiesWithCssVariableReferences(
  input: ThemeValue,
  path: string[] = ['color'],
): ThemeValue {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => {
      const newPath = path.concat(key)
      if (typeof value !== 'string') {
        return [key, getColorUtilitiesWithCssVariableReferences(value as ThemeValue, newPath)]
      } else {
        return [key, `var(--${newPath.join('-')})`]
      }
    }),
  ) as ThemeValue
}

export default plugin(
  ({ addBase }) => {
    addBase({
      ':root': getCssVariableDeclarations(Object.values(themes)[0]),
    })
    Object.entries(themes).forEach(([key, value]) => {
      addBase({
        [`[data-theme="${key}"]`]: getCssVariableDeclarations(value),
      })
    })

    const neutralColors = ['slate', 'gray', 'zinc', 'neutral', 'stone']
    const colorsToOmit = ['inherit', 'current', 'transparent', 'black', 'white', ...neutralColors]
    const primaryColors = Object.keys(omit(colors, colorsToOmit))

    for (const color of primaryColors) {
      const output: CSSVariableDeclaration = {}
      const colorPalette = colors[color as keyof typeof colors]

      if (colorPalette && typeof colorPalette === 'object') {
        // Set CSS custom properties for all color shades
        Object.entries(colorPalette).forEach(([shade, colorValue]) => {
          if (typeof colorValue === 'string') {
            output[`--color-primary-${shade}`] = colorValue
          }
        })

        addBase({
          [`[data-theme="${color}"]`]: output,
        })
      }
    }
  },
  {
    theme: {
      extend: {
        colors: getColorUtilitiesWithCssVariableReferences(Object.values(themes)[0]),
      },
    },
  },
)
