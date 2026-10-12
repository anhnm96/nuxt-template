import { mount } from '@vue/test-utils'
import Autocomplete from './Autocomplete.vue'

/**
 * The keymap, and the three places it diverges from Select on purpose: `Home`/`End` are caret
 * keys, `Delete`/`Backspace` edit text, and `Escape` is two-stage. See ADR-0012.
 */

interface Game { gameId: string, gameName: string, retired?: boolean }

const games: Game[] = [
  { gameId: 'g1', gameName: 'Alpha Strike' },
  { gameId: 'g2', gameName: 'Battle Chasm' },
  { gameId: 'g3', gameName: 'Cobalt Drift', retired: true },
  { gameId: 'g4', gameName: 'Dune Racer' },
  { gameId: 'g5', gameName: 'Echo Valley' },
]

const clickOutside = {}

/** Everything mounted in this file, so `afterEach` can take it back out of the document. */
const mounted: { unmount: () => void }[] = []

function mountAutocomplete(props: Record<string, any> = {}) {
  const host = document.createElement('div')
  host.className = 'popovers'
  document.body.appendChild(host)
  const wrapper = mount(Autocomplete, {
    props: {
      items: games,
      itemLabel: 'gameName',
      itemValue: 'gameId',
      itemDisabled: 'retired',
      ...props,
    },
    attachTo: document.body,
    global: { directives: { clickOutside } },
  })
  mounted.push(wrapper)
  return wrapper
}

type Wrapper = ReturnType<typeof mountAutocomplete>

function input(wrapper: Wrapper) {
  return wrapper.get('[data-slot="autocomplete-input"]')
}

function text(wrapper: Wrapper) {
  return (input(wrapper).element as HTMLInputElement).value
}

function isOpen(wrapper: Wrapper) {
  return input(wrapper).attributes('aria-expanded') === 'true'
}

function activeLabel(wrapper: Wrapper) {
  const id = input(wrapper).attributes('aria-activedescendant')
  return id ? document.getElementById(id)?.textContent?.trim() : undefined
}

async function key(wrapper: Wrapper, name: string, init: KeyboardEventInit = {}) {
  await input(wrapper).trigger('keydown', { key: name, ...init })
}

async function type(wrapper: Wrapper, value: string) {
  const field = input(wrapper)
  ;(field.element as HTMLInputElement).value = value
  await field.trigger('input')
}

function lastValue(wrapper: Wrapper) {
  return wrapper.emitted('update:modelValue')?.at(-1)?.[0]
}

afterEach(() => {
  // Each mount attaches to `document.body` and stays there until it is unmounted, and the
  // popover teleports to whichever `.popovers` host it finds. Leaving either behind lets one
  // test's options and comboboxes answer the next test's document-wide queries.
  mounted.forEach(w => w.unmount())
  mounted.length = 0
  document.querySelectorAll('.popovers').forEach(n => n.remove())
})

describe('autocomplete keymap — closed', () => {
  it('opens on ArrowDown with the first enabled Option Active', async () => {
    const wrapper = mountAutocomplete()
    await key(wrapper, 'ArrowDown')
    expect(isOpen(wrapper)).toBe(true)
    expect(activeLabel(wrapper)).toBe('Alpha Strike')
  })

  it('opens on ArrowUp with the last enabled Option Active', async () => {
    const wrapper = mountAutocomplete()
    await key(wrapper, 'ArrowUp')
    expect(activeLabel(wrapper)).toBe('Echo Valley')
  })

  it('opens on Alt+ArrowDown with nothing Active', async () => {
    const wrapper = mountAutocomplete()
    await key(wrapper, 'ArrowDown', { altKey: true })
    expect(isOpen(wrapper)).toBe(true)
    expect(activeLabel(wrapper)).toBeUndefined()
  })

  it('opens on the Selected Option when one is set', async () => {
    const wrapper = mountAutocomplete({ modelValue: 'g4' })
    await key(wrapper, 'ArrowDown')
    expect(activeLabel(wrapper)).toBe('Dune Racer')
  })

  it('opens by typing, through the input event rather than a seeded keystroke', async () => {
    const wrapper = mountAutocomplete()
    await type(wrapper, 'b')
    expect(isOpen(wrapper)).toBe(true)
    expect(text(wrapper)).toBe('b')
  })
})

describe('autocomplete keymap — open', () => {
  it('steps and clamps at the ends', async () => {
    const wrapper = mountAutocomplete()
    await key(wrapper, 'ArrowDown')
    await key(wrapper, 'ArrowUp')
    expect(activeLabel(wrapper)).toBe('Alpha Strike')
  })

  it('skips a disabled Option', async () => {
    const wrapper = mountAutocomplete()
    await key(wrapper, 'ArrowDown')
    await key(wrapper, 'ArrowDown')
    await key(wrapper, 'ArrowDown')
    expect(activeLabel(wrapper)).toBe('Dune Racer')
  })

  it('jumps with PageDown, which is the only key that jumps the list', async () => {
    const wrapper = mountAutocomplete()
    await key(wrapper, 'ArrowDown')
    await key(wrapper, 'PageDown')
    expect(activeLabel(wrapper)).toBe('Echo Valley')
  })

  it('commits the Active Option on Enter and closes', async () => {
    const wrapper = mountAutocomplete()
    await key(wrapper, 'ArrowDown')
    await key(wrapper, 'Enter')
    expect(lastValue(wrapper)).toBe('g1')
    expect(text(wrapper)).toBe('Alpha Strike')
    expect(isOpen(wrapper)).toBe(false)
  })

  it('closes on Alt+ArrowUp without committing', async () => {
    const wrapper = mountAutocomplete()
    await key(wrapper, 'ArrowDown')
    await key(wrapper, 'ArrowUp', { altKey: true })
    expect(isOpen(wrapper)).toBe(false)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('closes on Tab without committing', async () => {
    const wrapper = mountAutocomplete()
    await key(wrapper, 'ArrowDown')
    await key(wrapper, 'Tab')
    expect(isOpen(wrapper)).toBe(false)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})

describe('autocomplete keymap — Home and End are caret keys', () => {
  it('does not move the Active Option on Home', async () => {
    const wrapper = mountAutocomplete()
    await key(wrapper, 'ArrowDown')
    await key(wrapper, 'ArrowDown')
    expect(activeLabel(wrapper)).toBe('Battle Chasm')
    await key(wrapper, 'Home')
    expect(activeLabel(wrapper)).toBe('Battle Chasm')
  })

  it('does not move the Active Option on End', async () => {
    const wrapper = mountAutocomplete()
    await key(wrapper, 'ArrowDown')
    await key(wrapper, 'End')
    expect(activeLabel(wrapper)).toBe('Alpha Strike')
  })

  it('leaves Home for the browser to handle', async () => {
    const wrapper = mountAutocomplete()
    await key(wrapper, 'ArrowDown')
    const event = new KeyboardEvent('keydown', { key: 'Home', cancelable: true, bubbles: true })
    input(wrapper).element.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })
})

describe('autocomplete keymap — Enter with no Active Option', () => {
  it('passes the key through so a form can submit', async () => {
    const wrapper = mountAutocomplete({ freeform: true })
    await type(wrapper, 'anything')
    expect(activeLabel(wrapper)).toBeUndefined()
    const event = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true, bubbles: true })
    input(wrapper).element.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })

  it('commits nothing', async () => {
    const wrapper = mountAutocomplete({ freeform: true })
    await type(wrapper, 'anything')
    await key(wrapper, 'Enter')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(text(wrapper)).toBe('anything')
  })
})

describe('autocomplete keymap — Escape is two-stage', () => {
  it('dismisses the popup and leaves the text alone', async () => {
    const wrapper = mountAutocomplete({ modelValue: 'g1' })
    await type(wrapper, 'Fra')
    expect(isOpen(wrapper)).toBe(true)
    await key(wrapper, 'Escape')
    expect(isOpen(wrapper)).toBe(false)
    expect(text(wrapper)).toBe('Fra')
  })

  it('reverts to the Last Commit on the second press', async () => {
    const wrapper = mountAutocomplete({ modelValue: 'g1' })
    await type(wrapper, 'Fra')
    await key(wrapper, 'Escape')
    await key(wrapper, 'Escape')
    expect(text(wrapper)).toBe('Alpha Strike')
    expect(lastValue(wrapper)).toBe('g1')
  })

  it('keeps Freeform text on the second press', async () => {
    const wrapper = mountAutocomplete({ modelValue: 'g1', freeform: true })
    await type(wrapper, 'Fra')
    await key(wrapper, 'Escape')
    await key(wrapper, 'Escape')
    expect(text(wrapper)).toBe('Fra')
  })

  it('leaves a clean closed field to whatever encloses it', async () => {
    // Nothing to undo, so a dialog behind the Autocomplete still sees the key.
    const wrapper = mountAutocomplete({ modelValue: 'g1' })
    const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true, bubbles: true })
    input(wrapper).element.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })
})

describe('autocomplete keymap — disabled', () => {
  it('ignores every key', async () => {
    const wrapper = mountAutocomplete({ disabled: true })
    await key(wrapper, 'ArrowDown')
    expect(isOpen(wrapper)).toBe(false)
  })
})
