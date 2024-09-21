import hexRgb from 'hex-rgb'

function getRgbChannels(hex: string) {
  const { red, green, blue } = hexRgb(hex)
  return `${red},${green},${blue}`
}

type Preset = Record<string, string>
interface Theme {
  [key: string]: string | Theme
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
              '--primary-50': '34,211,238',
              '--primary-100': '6,182,212',
              '--primary-this-is-nested': '0,121,85'
            }
 */
export function getCssVariableDeclarations(input: Theme, path: string[] = [], output: Preset = {}) {
  Object.entries(input).forEach(([key, value]) => {
    const newPath = path.concat(key)
    if (typeof value !== 'string') {
      getCssVariableDeclarations(value, newPath, output)
    } else {
      output[`--${newPath.join('-')}`] = getRgbChannels(value)
    }
  })
  return output
}

// convert object to style string
export function styleString(obj: Preset) {
  return `{${Object.entries(obj).map(([k, v]) => `${k}:${v}`).join(';')}}`
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
                '400': 'rgb(var(--primary-400), <alpha-value>)',
                '500': 'rgb(var(--primary-500), <alpha-value>)',
                'this': {
                  'is': {
                    'nested': 'rgb(var(--primary-this-is-nested), <alpha-value>)'
                  }
                }
              }
            }
 */
export function getColorUtilitiesWithCssVariableReferences(input: Theme, path: string[] = []): Theme {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => {
      const newPath = path.concat(key)
      if (typeof value !== 'string') {
        return [key, getColorUtilitiesWithCssVariableReferences(value, newPath)]
      } else {
        return [key, `rgb(var(--${newPath.join('-')}), <alpha-value>)`]
      }
    }),
  )
}
