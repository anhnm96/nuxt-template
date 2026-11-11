import { getTabEnds, getTabStops } from './getTabStops'

function mountHtml(html: string) {
  const container = document.body.appendChild(document.createElement('div'))
  container.innerHTML = html
  return container
}

function ids(elements: HTMLElement[]) {
  return elements.map(element => element.id)
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('getTabStops', () => {
  it('lists the elements in DOM order', () => {
    const container = mountHtml('<a id="link" href="#">Link</a><button id="button">Button</button><input id="input">')
    expect(ids(getTabStops(container))).toEqual(['link', 'button', 'input'])
  })

  it('leaves out an element that is not in the tab order', () => {
    const container = mountHtml(`
      <button id="first">First</button>
      <button id="roving" tabindex="-1">Roving</button>
      <button id="disabled" disabled>Disabled</button>
      <button id="hidden" hidden>Hidden</button>
      <button id="none" style="display: none">None</button>
      <button id="invisible" style="visibility: hidden">Invisible</button>
      <div inert><button id="inert">Inert</button></div>
      <div id="disabled-div" tabindex="0" disabled>Disabled div</div>
      <a id="anchor-without-href">Not a link</a>
      <input id="hidden-input" type="hidden">
      <button id="last">Last</button>
    `)
    expect(ids(getTabStops(container))).toEqual(['first', 'last'])
  })

  it('lists a positive tabindex before the natural order, lowest first', () => {
    const container = mountHtml('<button id="natural">Natural</button><button id="two" tabindex="2">Two</button><button id="one" tabindex="1">One</button>')
    expect(ids(getTabStops(container))).toEqual(['one', 'two', 'natural'])
  })

  describe('radio groups', () => {
    const group = (checked = '') => `
      <button id="before">Before</button>
      <input id="r1" type="radio" name="size" ${checked === 'r1' ? 'checked' : ''}>
      <input id="r2" type="radio" name="size" ${checked === 'r2' ? 'checked' : ''}>
      <input id="r3" type="radio" name="size" ${checked === 'r3' ? 'checked' : ''}>
      <button id="after">After</button>
    `

    it('counts a group as one stop at the end the user enters from', () => {
      const container = mountHtml(group())
      expect(ids(getTabStops(container))).toEqual(['before', 'r1', 'after'])
      expect(ids(getTabStops(container, true))).toEqual(['before', 'r3', 'after'])
    })

    it('uses the checked radio, whichever way the user enters', () => {
      const container = mountHtml(group('r2'))
      expect(ids(getTabStops(container))).toEqual(['before', 'r2', 'after'])
      expect(ids(getTabStops(container, true))).toEqual(['before', 'r2', 'after'])
    })

    it('uses the focused radio when none is checked', () => {
      const container = mountHtml(group())
      container.querySelector<HTMLElement>('#r3')!.focus()
      expect(ids(getTabStops(container))).toEqual(['before', 'r3', 'after'])
    })

    it('keeps groups with different names apart', () => {
      const container = mountHtml(`
        <input id="a1" type="radio" name="a"><input id="a2" type="radio" name="a">
        <input id="b1" type="radio" name="b"><input id="b2" type="radio" name="b">
      `)
      expect(ids(getTabStops(container))).toEqual(['a1', 'b1'])
    })

    it('treats a radio without a name as its own stop', () => {
      const container = mountHtml('<input id="x" type="radio"><input id="y" type="radio">')
      expect(ids(getTabStops(container))).toEqual(['x', 'y'])
    })
  })
})

describe('getTabEnds', () => {
  it('returns the first and last stops', () => {
    const container = mountHtml('<span>text</span><button id="a">A</button><button id="b">B</button><button id="c">C</button>')
    const { first, last } = getTabEnds(container)
    expect([first?.id, last?.id]).toEqual(['a', 'c'])
  })

  it('returns nothing when the container holds no stop', () => {
    const container = mountHtml('<span>text</span><button disabled>off</button>')
    expect(getTabEnds(container)).toEqual({ first: undefined, last: undefined })
  })

  it('enters an unchecked radio group at the end the browser enters from', () => {
    const container = mountHtml('<input id="r1" type="radio" name="g"><input id="r2" type="radio" name="g">')
    const { first, last } = getTabEnds(container)
    // forward Tab arrives at the first radio, Shift+Tab at the last
    expect([first?.id, last?.id]).toEqual(['r1', 'r2'])
  })
})
