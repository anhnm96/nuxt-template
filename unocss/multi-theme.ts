import hexRgb from 'hex-rgb'

export function getRgbChannels(hex: string) {
  const { red, green, blue } = hexRgb(hex)
  return `${red},${green},${blue}`
}
