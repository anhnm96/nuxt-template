import hexRgb from 'hex-rgb'
import defaultThemes from '~/unocss/themes.json'

export function getRgbChannels(hex: string) {
  const { red, green, blue } = hexRgb(hex)
  return `${red},${green},${blue}`
}

type Preset = Record<string, string>
type Theme = Record<string, string | Preset>

/**
 * Generate flat preset
 * @param {Theme} input - Theme
 * @example {
 *            "primary": {
                "50": "#eef2ff",
                "100": "#e0e7ff",
              }
            }
 * @returns {Preset} Flat object preset
 * @example {
 *            '--primary-50': '238,242,255',
 *            '--primary-100': '224,231,255'
 *          }
 */
function getCssVariableDeclarations(input: Theme, path: string[] = [], output: Preset = {}) {
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
function styleString(obj: Preset) {
  return `{${Object.entries(obj).map(([k, v]) => `${k}:${v}`).join(';')}}`
}

export function multiTheme() {
  return `
    :root ${styleString(getCssVariableDeclarations(Object.values(defaultThemes)[0]))}

    ${Object.entries(defaultThemes).map(([key, value]) => `
      [data-theme="${key}"] ${styleString(getCssVariableDeclarations(value))}
    `).join(' ')}
  `
}
