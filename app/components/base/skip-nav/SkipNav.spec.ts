import type { VueWrapper } from '@vue/test-utils'
import { mount } from '@vue/test-utils'
import SkipNav, { MAIN_CONTENT_ID } from './SkipNav'

let wrapper: VueWrapper | undefined

/**
 * Attached to the document, because `focus()` on a detached element moves nothing. The page
 * markup goes in first, so the Skip Target exists before the click.
 */
function mountSkipNav(page: string, options: { props?: Record<string, any>, attrs?: Record<string, any> } = {}) {
  const host = document.createElement('div')
  host.innerHTML = page
  document.body.append(host)
  wrapper = mount(SkipNav, { ...options, attachTo: document.body })
  return wrapper
}

/** Clicks with a real event, so the test can read `defaultPrevented` afterwards. */
function click(link: VueWrapper) {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true })
  link.element.dispatchEvent(event)
  return event
}

/**
 * happy-dom lets any element take focus. A browser does not: an element that is not a control
 * and has no `tabindex` refuses it. This gives `target` the browser's rule.
 */
function focusLikeBrowser(target: HTMLElement) {
  const focus = target.focus.bind(target)
  vi.spyOn(target, 'focus').mockImplementation((options) => {
    if (target.hasAttribute('tabindex')) focus(options)
  })
}

// The test DOM does no layout, and may not define this at all. Restored after each test, so
// the stub does not reach other spec files in the same worker.
const scrollIntoView = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView')

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  if (scrollIntoView) Object.defineProperty(Element.prototype, 'scrollIntoView', scrollIntoView)
  else delete (Element.prototype as Partial<Element>).scrollIntoView
})

describe('the link', () => {
  it('points at the default id when no href arrives', () => {
    const link = mountSkipNav('<main></main>')
    expect(link.element.tagName).toBe('A')
    expect(link.attributes('href')).toBe(`#${MAIN_CONTENT_ID}`)
    expect(link.attributes('data-slot')).toBe('skip-nav')
  })

  it('names itself, and lets a consumer rename it', () => {
    expect(mountSkipNav('<main></main>').text()).toBe('Skip to main content')
    wrapper!.unmount()
    wrapper = mount(SkipNav, { props: { href: '#search' }, slots: { default: 'Skip to search' } })
    expect(wrapper.text()).toBe('Skip to search')
  })
})

describe('finding the Skip Target', () => {
  it('prefers the default id over the first <main>', async () => {
    const link = mountSkipNav(`<main></main><div id="${MAIN_CONTENT_ID}"></div>`)
    await link.trigger('click')
    expect(document.activeElement?.id).toBe(MAIN_CONTENT_ID)
  })

  // No page sets the id today, so every page that renders a <main> takes this path.
  it('falls back to the first <main> when no element has the default id', async () => {
    const link = mountSkipNav('<main data-first></main><main></main>')
    await link.trigger('click')
    expect(document.activeElement?.hasAttribute('data-first')).toBe(true)
  })

  it('follows an explicit href', async () => {
    const link = mountSkipNav('<main></main><footer id="footer"></footer>', { props: { href: '#footer' } })
    await link.trigger('click')
    expect(document.activeElement?.id).toBe('footer')
  })

  // An explicit id that matches nothing is a mistake, and <main> would hide it.
  it('does not fall back to <main> for an explicit href', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const link = mountSkipNav('<main></main>', { props: { href: '#footer' } })
    await link.trigger('click')
    expect(document.activeElement).not.toBe(document.querySelector('main'))
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('#footer'))
  })

  // Passing the default value is still an explicit choice of that id.
  it('does not fall back to <main> for an explicit default href', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const link = mountSkipNav('<main></main>', { props: { href: `#${MAIN_CONTENT_ID}` } })
    await link.trigger('click')
    expect(document.activeElement).not.toBe(document.querySelector('main'))
  })

  it('treats a malformed fragment as no Skip Target', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const link = mountSkipNav('<main></main>', { props: { href: '#%' } })
    await link.trigger('click')
    expect(document.activeElement).not.toBe(document.querySelector('main'))
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('#%'))
  })

  it('warns, stays put and keeps the hash when the page has no Skip Target', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const link = mountSkipNav('<div></div>')
    ;(link.element as HTMLElement).focus()

    expect(click(link).defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(link.element)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('[SkipNav]'))
  })

  it('stays silent outside dev', async () => {
    vi.stubEnv('DEV', false)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const link = mountSkipNav('<div></div>')
    await link.trigger('click')
    expect(warn).not.toHaveBeenCalled()
  })
})

describe('activation', () => {
  it('moves focus, scrolls the target to the top, and leaves the hash alone', () => {
    const hash = location.hash
    const link = mountSkipNav('<main></main>')
    const main = document.querySelector('main')!
    const focus = vi.spyOn(main, 'focus')

    expect(click(link).defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(main)
    expect(focus).toHaveBeenCalledWith({ preventScroll: true })
    expect(main.scrollIntoView).toHaveBeenCalledWith({ block: 'start' })
    expect(location.hash).toBe(hash)
  })

  it('makes the target focusable only until focus leaves it', async () => {
    const link = mountSkipNav('<main style="outline: 2px solid red"></main>')
    const main = document.querySelector('main')!
    focusLikeBrowser(main)
    await link.trigger('click')
    expect(main.getAttribute('tabindex')).toBe('-1')
    expect(main.style.outlineStyle).toBe('none')

    main.blur()
    expect(main.hasAttribute('tabindex')).toBe(false)
    expect(main.style.outline).toContain('solid')
  })

  // A hidden target refuses focus, so no `blur` would come to undo the change.
  it('undoes the change at once when the target refuses focus', async () => {
    const link = mountSkipNav('<main style="outline: 2px solid red"></main>')
    const main = document.querySelector('main')!
    vi.spyOn(main, 'focus').mockImplementation(() => {})
    await link.trigger('click')
    expect(main.hasAttribute('tabindex')).toBe(false)
    expect(main.style.outline).toContain('solid')
  })

  it('restores the own tabindex of a target that refuses focus', async () => {
    const link = mountSkipNav('<section id="panel" tabindex="0"></section>', { props: { href: '#panel' } })
    const panel = document.getElementById('panel')!
    vi.spyOn(panel, 'focus').mockImplementation(() => {})
    await link.trigger('click')
    expect(panel.getAttribute('tabindex')).toBe('0')
  })

  // `tabIndex` reads 0 on an `<a>` with no `href`, yet a browser does not focus it.
  it('focuses an anchor that has no href', async () => {
    const link = mountSkipNav('<a id="section">Section</a>', { props: { href: '#section' } })
    const anchor = document.getElementById('section')!
    focusLikeBrowser(anchor)
    await link.trigger('click')
    expect(document.activeElement).toBe(anchor)

    anchor.blur()
    expect(anchor.hasAttribute('tabindex')).toBe(false)
  })

  it.each([
    ['a natively focusable target', '<input id="search">'],
    ['a target that carries its own tabindex', '<section id="search" tabindex="-1"></section>'],
  ])('leaves %s exactly as found', async (_case, page) => {
    const link = mountSkipNav(page, { props: { href: '#search' } })
    const target = document.getElementById('search')!
    const before = target.outerHTML
    await link.trigger('click')
    expect(document.activeElement).toBe(target)
    expect(target.outerHTML).toBe(before)

    target.blur()
    expect(target.outerHTML).toBe(before)
  })
})

describe('standing aside', () => {
  it('does nothing when the consumer prevents the click', async () => {
    const link = mountSkipNav('<main></main>', {
      attrs: { onClick: (event: MouseEvent) => event.preventDefault() },
    })
    await link.trigger('click')
    expect(document.activeElement).not.toBe(document.querySelector('main'))
    expect(document.querySelector('main')!.hasAttribute('tabindex')).toBe(false)
  })

  it.each([['/about'], ['#']])('leaves %s to the browser', (href) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const link = mountSkipNav('<main></main>', { props: { href } })

    // The test DOM would try to follow the link; the component must not be what stops it.
    link.element.addEventListener('click', (e: Event) => expect(e.defaultPrevented).toBe(false), { once: true })
    document.body.addEventListener('click', (e: Event) => e.preventDefault(), { once: true })
    click(link)

    expect(document.activeElement).not.toBe(document.querySelector('main'))
    expect(warn).not.toHaveBeenCalled()
  })
})
