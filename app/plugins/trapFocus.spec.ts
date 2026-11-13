/**
 * `v-trap-focus` is shared by `DialogPanel`, `SidebarMobile`, `ColorPickerField` and
 * `DatePicker`, so the tab ring it computes needs a spec of its own — a change to it is
 * felt in four places at once, and three of them are hard to reach from a component test.
 */
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { trapFocus } from './trapFocus'

enableAutoUnmount(afterEach)

/** Mounts `html` inside a trapped container, attached so focus is real. */
function mountTrap(html: string) {
  return mount(
    { template: `<div v-trap-focus>${html}</div>` },
    { global: { directives: { trapFocus } }, attachTo: document.body },
  )
}

function tab(el: Element, shiftKey = false) {
  return el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true }))
}

describe('wrapping ordinary content', () => {
  it('sends Tab from the last stop back to the first', () => {
    const wrapper = mountTrap('<button>a</button><button>b</button><button>c</button>')
    const buttons = wrapper.findAll('button').map(b => b.element)

    tab(buttons[2]!)
    expect(document.activeElement).toBe(buttons[0])
  })

  it('sends Shift+Tab from the first stop to the last', () => {
    const wrapper = mountTrap('<button>a</button><button>b</button><button>c</button>')
    const buttons = wrapper.findAll('button').map(b => b.element)

    tab(buttons[0]!, true)
    expect(document.activeElement).toBe(buttons[2])
  })

  it('leaves the middle alone, so the browser moves focus itself', () => {
    const wrapper = mountTrap('<button>a</button><button>b</button><button>c</button>')
    const buttons = wrapper.findAll('button').map(b => b.element)

    // Not cancelled: the trap only acts at the two boundaries.
    expect(tab(buttons[1]!)).toBe(true)
  })

  it('skips a disabled button when picking the boundary', () => {
    const wrapper = mountTrap('<button>a</button><button>b</button><button disabled>c</button>')
    const buttons = wrapper.findAll('button').map(b => b.element)

    tab(buttons[1]!)
    expect(document.activeElement).toBe(buttons[0])
  })
})

describe('which elements count as stops', () => {
  it('ignores hidden, inert and non-form disabled elements at the boundary', () => {
    const wrapper = mountTrap(`
      <button id="a">a</button>
      <button id="b">b</button>
      <button id="hidden" hidden>c</button>
      <div inert><button id="inert">d</button></div>
      <div id="disabled" tabindex="0" disabled>e</div>
    `)

    tab(wrapper.get('#b').element)
    expect(document.activeElement).toBe(wrapper.get('#a').element)
  })

  it('visits a positive tabindex before the natural order', () => {
    const wrapper = mountTrap('<button id="natural">n</button><button id="late" tabindex="2">l</button><button id="early" tabindex="1">e</button>')

    // `early` is the first stop, `natural` the last
    tab(wrapper.get('#early').element, true)
    expect(document.activeElement).toBe(wrapper.get('#natural').element)
    tab(wrapper.get('#natural').element)
    expect(document.activeElement).toBe(wrapper.get('#early').element)
  })

  it('does nothing when the element holds no stop', () => {
    const wrapper = mountTrap('<span>text</span>')
    expect(tab(wrapper.get('span').element)).toBe(true)
  })
})

/** A named radio group is one stop, and the browser enters an unchecked group at one end. */
describe('wrapping around a radio group', () => {
  it('lands on the first radio of an unchecked group when Tab wraps forward', () => {
    const wrapper = mountTrap('<input id="r1" type="radio" name="g"><input id="r2" type="radio" name="g"><button id="end">end</button>')

    tab(wrapper.get('#end').element)
    expect(document.activeElement).toBe(wrapper.get('#r1').element)
  })

  it('lands on the last radio of an unchecked group when Shift+Tab wraps back', () => {
    const wrapper = mountTrap('<button id="start">start</button><input id="r1" type="radio" name="g"><input id="r2" type="radio" name="g">')

    tab(wrapper.get('#start').element, true)
    expect(document.activeElement).toBe(wrapper.get('#r2').element)
  })

  it('wraps from the radio that has focus', () => {
    const wrapper = mountTrap('<button id="start">start</button><input id="r1" type="radio" name="g"><input id="r2" type="radio" name="g">')
    wrapper.get<HTMLElement>('#r2').element.focus()

    tab(wrapper.get('#r2').element)
    expect(document.activeElement).toBe(wrapper.get('#start').element)
  })
})

/**
 * `Calendar` is a roving tabindex: every day is a `<button>`, but only one is in the tab
 * order. The selector's `button:not([disabled])` clause has no `tabindex` exclusion, so
 * before the `tabIndex >= 0` filter the trap named a `tabindex="-1"` cell as its last stop
 * — and `Tab` from the real roving cell matched neither boundary and escaped the trap.
 */
describe('wrapping a roving tabindex', () => {
  const ROVING = `
    <button aria-label="nav">nav</button>
    <button tabindex="-1">1</button>
    <button tabindex="0" aria-label="roving">2</button>
    <button tabindex="-1">3</button>
    <button tabindex="-1">4</button>
  `

  it('treats the one tabbable cell as the last stop, not the last cell', () => {
    const wrapper = mountTrap(ROVING)
    const roving = wrapper.get('[aria-label="roving"]').element
    const nav = wrapper.get('[aria-label="nav"]').element

    tab(roving)
    expect(document.activeElement).toBe(nav)
  })

  it('wraps backwards from the nav button onto the roving cell', () => {
    const wrapper = mountTrap(ROVING)
    const roving = wrapper.get('[aria-label="roving"]').element
    const nav = wrapper.get('[aria-label="nav"]').element

    tab(nav, true)
    expect(document.activeElement).toBe(roving)
  })

  it('never lands on an untabbable cell', () => {
    const wrapper = mountTrap(ROVING)
    const roving = wrapper.get('[aria-label="roving"]').element

    tab(roving)
    expect((document.activeElement as HTMLElement).tabIndex).toBeGreaterThanOrEqual(0)
  })
})

describe('who places focus on mount', () => {
  /** A modal dialog should take focus the moment it appears. */
  it('focuses the trapped root by default', () => {
    const outside = document.createElement('button')
    document.body.appendChild(outside)
    outside.focus()

    const wrapper = mount(
      { template: `<div tabindex="-1" v-trap-focus><button>a</button></div>` },
      { global: { directives: { trapFocus } }, attachTo: document.body },
    )

    expect(document.activeElement).toBe(wrapper.element)
    outside.remove()
  })

  /**
   * `.manual` is what keeps `DatePicker`'s text field focused while its popover is open.
   * The root is given a `tabindex` here deliberately: without one the default is a no-op
   * in a browser anyway, so the test would pass against a directive that ignored `.manual`.
   */
  it('leaves focus alone with .manual', () => {
    const outside = document.createElement('button')
    document.body.appendChild(outside)
    outside.focus()

    mount(
      { template: `<div tabindex="-1" v-trap-focus.manual><button>a</button></div>` },
      { global: { directives: { trapFocus } }, attachTo: document.body },
    )

    expect(document.activeElement).toBe(outside)
    outside.remove()
  })

  it('still traps the tab ring under .manual', () => {
    const wrapper = mount(
      { template: `<div v-trap-focus.manual><button>a</button><button>b</button></div>` },
      { global: { directives: { trapFocus } }, attachTo: document.body },
    )
    const buttons = wrapper.findAll('button').map(b => b.element)

    tab(buttons[1]!)
    expect(document.activeElement).toBe(buttons[0])
  })
})

describe('restoring focus on teardown', () => {
  it('hands focus back to whatever opened the trap', async () => {
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()

    const wrapper = mountTrap('<button>a</button>')
    wrapper.get('button').element.focus()
    wrapper.unmount()
    await nextTick()

    expect(document.activeElement).toBe(opener)
    opener.remove()
  })

  /**
   * Closing a non-modal popover by clicking straight into another field must not yank
   * focus back out of it. `Dropdown` guards its own restore the same way.
   */
  it('leaves focus where it went if something else claimed it', async () => {
    const opener = document.createElement('button')
    const elsewhere = document.createElement('input')
    document.body.append(opener, elsewhere)
    opener.focus()

    const wrapper = mountTrap('<button>a</button>')
    elsewhere.focus()
    wrapper.unmount()
    await nextTick()

    expect(document.activeElement).toBe(elsewhere)
    opener.remove()
    elsewhere.remove()
  })
})

describe('.no-restore', () => {
  /**
   * For a host whose own Popover already restores focus under a narrower rule. `DatePicker`
   * uses it, so a click on empty page space leaves focus on `<body>`.
   */
  it('leaves focus where it is on teardown', async () => {
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()

    const wrapper = mount(
      { template: `<div v-trap-focus.manual.no-restore><button>a</button></div>` },
      { global: { directives: { trapFocus } }, attachTo: document.body },
    )
    wrapper.get('button').element.focus()
    wrapper.unmount()
    await nextTick()

    expect(document.activeElement).not.toBe(opener)
    opener.remove()
  })
})
