export function isValidColorHexCode(str: string, shouldAllowShortVersion: boolean = true) {
  const regex = shouldAllowShortVersion
    ? /^#([a-f0-9]{6}|[a-f0-9]{3})$/i
    : /^#([a-f0-9]{6})$/i

  return regex.test(str)
}

export function rgbToHex(r: number, g: number, b: number) {
  if (r < 0 || g < 0 || b < 0) {
    return undefined
  }

  if (r > 255 || g > 255 || b > 255) {
    return undefined
  }

  const componentToHex = (c: number) => {
    const hex = c.toString(16)

    return hex.length === 1 ? `0${hex}` : hex
  }

  return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`
}

export function hexToRgb(hex: string) {
  // Remove "#" from hex color
  hex = (hex[0] === '#') ? hex.slice(1) : hex

  if (!isValidColorHexCode(`#${hex}`)) {
    return undefined
  }

  // If the hex code is in short format, convert it to long format
  if (hex.length === 3) {
    hex = `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`
  }

  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  }
}

// red: 255, 0, 0 => {h: 0, s: 1, v: 1}
export function rgbToHsv(r: number, g: number, b: number) {
  r /= 255
  g /= 255
  b /= 255

  const cmin = Math.min(r, g, b)
  const cmax = Math.max(r, g, b)
  const delta = cmax - cmin
  let h = 0
  let s = 0
  let v = cmax

  if (delta === 0) {
    h = 0
  } else if (cmax === r) {
    h = ((g - b) / delta) % 6
  } else if (cmax === g) {
    h = (b - r) / delta + 2
  } else {
    h = (r - g) / delta + 4
  }

  h = Math.round(h * 60)

  if (h < 0) {
    h += 360
  }

  s = (delta === 0) ? 0 : delta / cmax
  v = cmax

  return { h, s, v }
}

export function hexToHsv(hex: string) {
  const rgb = hexToRgb(hex)

  if (!rgb) {
    return null
  }

  const { r, g, b } = rgb

  return rgbToHsv(r, g, b)
}

// red: {h: 0, s: 1, v: 1} => {r: 255, g: 0, b: 0}
export function hsvToRgb(h: number, s: number, v: number) {
  h = h / 360
  // s = s / 100;
  // v = v / 100;

  let r = 0
  let g = 0
  let b = 0

  const i = Math.floor(h * 6)
  const f = h * 6 - i
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)

  switch (i % 6) {
    case 0:
      r = v
      g = t
      b = p
      break
    case 1:
      r = q
      g = v
      b = p
      break
    case 2:
      r = p
      g = v
      b = t
      break
    case 3:
      r = p
      g = q
      b = v
      break
    case 4:
      r = t
      g = p
      b = v
      break
    case 5:
      r = v
      g = p
      b = q
      break
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  }
}

export function hsvToHex(h: number, s: number, v: number) {
  const { r, g, b } = hsvToRgb(h, s, v)

  return rgbToHex(r, g, b)
}
