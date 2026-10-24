import { normalizeStyle } from 'vue'

const dimensions = ['width', 'height', 'min-width', 'max-width', 'min-height', 'max-height'] as const

/** Measure destination constraints without the animated wrapper's current dimensions. */
export function measureTooltipSurface(surface: HTMLElement, content: HTMLElement, style: unknown): { width: number, height: number, contentWidth: number } {
  const saved = surface.getAttribute('style')
  const savedContentWidth = content.style.width
  const normalized = normalizeStyle([style])
  const destination = typeof normalized === 'object' ? normalized : {}
  try {
    // A previous measurement pins the text width. Release it to measure reactive content
    // and destination constraints without carrying the previous Anchor's layout forward.
    content.style.width = 'auto'
    // The live surface fills the animated wrapper. Restore consumer sizing only for this
    // synchronous measurement; the original styles return before the browser can paint.
    for (const property of dimensions) {
      surface.style.removeProperty(property)
      const camel = property.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())
      const value = destination[property] ?? destination[camel]
      if (value != null) {
        const css = String(value)
        surface.style.setProperty(property, css.replace(/\s*!important\s*$/, ''), css.includes('!important') ? 'important' : '')
      }
    }
    // offsetWidth rounds to the nearest pixel. Rounding a 213.34px line down to 213px
    // creates another wrapped line after the width is pinned. Keep enough room for it.
    const surfaceStyle = getComputedStyle(surface)
    const contentStyle = getComputedStyle(content)
    return {
      width: Math.ceil(Number.parseFloat(surfaceStyle.width)),
      height: Math.ceil(Number.parseFloat(surfaceStyle.height)),
      contentWidth: Math.ceil(Number.parseFloat(contentStyle.width)),
    }
  } finally {
    content.style.width = savedContentWidth
    if (saved == null) surface.removeAttribute('style')
    else surface.setAttribute('style', saved)
  }
}
