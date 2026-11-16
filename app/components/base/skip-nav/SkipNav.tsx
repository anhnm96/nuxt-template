import type { FunctionalComponent } from 'vue'

/** The id a page may put on its main content. Optional — see DESIGN.md, "The id is optional". */
export const MAIN_CONTENT_ID = 'main-content'

const DEFAULT_HREF = `#${MAIN_CONTENT_ID}`

export interface SkipNavProps {
  /** A `#id` fragment that names the Skip Target. Any other value is left to the browser. */
  href?: string
}

/** `fallback` is true only for an omitted `href`; see DESIGN.md, "The id is optional". */
function findTarget(href: string, fallback: boolean): HTMLElement | null {
  let id: string
  try {
    id = decodeURIComponent(href.slice(1))
  } catch {
    // A malformed escape, such as `#%`, names no element.
    return null
  }
  return document.getElementById(id) ?? (fallback ? document.querySelector('main') : null)
}

/**
 * Side effect: a target that refuses focus gets `tabindex="-1"` and `outline: none` until focus
 * leaves it. Then its earlier `tabindex` and inline `outline` are restored.
 */
function focusTarget(target: HTMLElement) {
  // Try first: `tabIndex` reads 0 on some elements that cannot hold focus, such as `<a>` with no `href`.
  target.focus({ preventScroll: true })
  if (document.activeElement === target) return

  const tabindex = target.getAttribute('tabindex')
  const outline = target.style.outline
  const restore = () => {
    if (tabindex === null) target.removeAttribute('tabindex')
    else target.setAttribute('tabindex', tabindex)
    target.style.outline = outline
  }

  target.tabIndex = -1
  target.style.outline = 'none'
  target.focus({ preventScroll: true })
  // A hidden target still refuses focus, and then no `blur` comes to restore it.
  if (document.activeElement === target) target.addEventListener('blur', restore, { once: true })
  else restore()
}

const SkipNav: FunctionalComponent<SkipNavProps, { click: [event: MouseEvent] }> = (props, { slots, emit }) => {
  const href = props.href ?? DEFAULT_HREF

  function skip(event: MouseEvent) {
    emit('click', event)
    if (event.defaultPrevented) return
    // `#` alone names no element, and a path or a URL is a normal link.
    if (!href.startsWith('#') || href.length === 1) return

    // Prevented even when no Skip Target exists, so the hash and history never change.
    event.preventDefault()

    const target = findTarget(href, props.href === undefined)
    if (!target) {
      // `import.meta.dev` is false under vitest and `import.meta.env.DEV` is the true one.
      if (import.meta.dev || import.meta.env.DEV) {
        console.warn(`[SkipNav] No Skip Target for "${href}". Put that id on an element, or render a <main>.`)
      }
      return
    }

    focusTarget(target)
    target.scrollIntoView({ block: 'start' })
  }

  return (
    <a href={href} class="skip-nav btn btn-neutral" data-slot="skip-nav" onClick={skip}>
      {slots.default?.() ?? 'Skip to main content'}
    </a>
  )
}

// No `default`: the fallback to `<main>` must tell an omitted `href` from an explicit one.
SkipNav.props = { href: { type: String, required: false } }
// Declared, so `skip` calls the consumer's handler first; see DESIGN.md, "The URL does not change".
SkipNav.emits = ['click']

export default SkipNav
