import { mount } from '@vue/test-utils'
import Select from './Select.vue'

/**
 * The movement half of Select's keymap, which nothing covered before `useSelect` moved onto
 * `useListNavigation`. Written against the pre-migration implementation so the swap had to
 * reproduce it, rather than define it.
 *
 * One test here is deliberately not characterisation: "walks same-letter Labels" asserts the
 * APG behaviour the shared composable brings and the old `useSelect` did not have. It is the
 * single intended behaviour change of that migration.
 */

interface Row { id: string, name: string, off?: boolean }

/** Fourteen rows, so `PageDown` (10) lands mid-list and has somewhere to clamp. */
const rows: Row[] = [
  'Alpha',
  'Bravo',
  'Charlie',
  'Chess',
  'Chrome',
  'Delta',
  'Echo',
  'Foxtrot',
  'Golf',
  'Hotel',
  'India',
  'Juliet',
  'Kilo',
  'Lima',
].map((name, i) => ({ id: `r${i}`, name }))

/** A disabled row at each end, so the edge keys have a run to step over. */
const edgeDisabled: Row[] = [
  { id: 'e0', name: 'First', off: true },
  { id: 'e1', name: 'Second' },
  { id: 'e2', name: 'Third' },
  { id: 'e3', name: 'Fourth', off: true },
  { id: 'e4', name: 'Fifth', off: true },
]

/** Registered by a Nuxt plugin that unit mounts never run. */
const clickOutside = {}

/**
 * Mounts attach to `document.body` and `active()` queries the whole document, so a mount
 * left behind is read by the next test instead of its own.
 */
const mounted: { unmount: () => void }[] = []

function mountSelect(items: Row[] = rows, props: Record<string, any> = {}) {
  const host = document.createElement('div')
  host.className = 'popovers'
  document.body.appendChild(host)
  const wrapper = mount(Select, {
    props: { items, itemLabel: 'name', itemValue: 'id', itemDisabled: 'off', ...props },
    attachTo: document.body,
    global: { directives: { clickOutside } },
  })
  mounted.push(wrapper)
  return wrapper
}

type Wrapper = ReturnType<typeof mountSelect>

function trigger(wrapper: Wrapper) {
  return wrapper.get('[data-slot="select-trigger"]')
}

/**
 * The Active Option, read the way a screen reader would. The attribute sits on whichever
 * element holds DOM focus — the trigger normally, the search field when `searchable`.
 */
function active() {
  const owner = [...document.querySelectorAll('[aria-activedescendant]')]
    .find(el => el.getAttribute('aria-activedescendant'))
  const id = owner?.getAttribute('aria-activedescendant')
  return id ? document.getElementById(id)?.textContent?.trim() : undefined
}

function isOpen() {
  return document.querySelector('[role="listbox"]') !== null
}

async function press(wrapper: Wrapper, key: string, init: Record<string, any> = {}) {
  await trigger(wrapper).trigger('keydown', { key, ...init })
  await nextTick()
}

/** Opens the popup positioned the way `ArrowDown` does, then returns the wrapper. */
async function open(items?: Row[], props?: Record<string, any>) {
  const wrapper = mountSelect(items, props)
  ;(trigger(wrapper).element as HTMLElement).focus()
  await press(wrapper, 'ArrowDown')
  return wrapper
}

afterEach(() => {
  while (mounted.length) mounted.pop()!.unmount()
  document.body.innerHTML = ''
})

describe('select — edge keys', () => {
  it('Home moves to the first option', async () => {
    const wrapper = await open()
    await press(wrapper, 'End')
    await press(wrapper, 'Home')
    expect(active()).toBe('Alpha')
  })

  it('End moves to the last option', async () => {
    const wrapper = await open()
    await press(wrapper, 'End')
    expect(active()).toBe('Lima')
  })

  it('Home steps over a disabled run at the start', async () => {
    const wrapper = await open(edgeDisabled)
    // The popup already opens on Second, so `Home` has to be asked to move off it —
    // otherwise this passes with no `Home` handling at all.
    await press(wrapper, 'End')
    expect(active()).toBe('Third')
    await press(wrapper, 'Home')
    expect(active()).toBe('Second')
  })

  it('End steps over a disabled run at the end', async () => {
    const wrapper = await open(edgeDisabled)
    await press(wrapper, 'End')
    expect(active()).toBe('Third')
  })
})

describe('select — page keys', () => {
  it('PageDown moves by ten', async () => {
    const wrapper = await open()
    expect(active()).toBe('Alpha')
    await press(wrapper, 'PageDown')
    expect(active()).toBe('India')
  })

  it('PageDown clamps at the end rather than wrapping', async () => {
    const wrapper = await open()
    await press(wrapper, 'PageDown')
    await press(wrapper, 'PageDown')
    expect(active()).toBe('Lima')
  })

  it('PageUp clamps at the start rather than wrapping', async () => {
    const wrapper = await open()
    await press(wrapper, 'End')
    await press(wrapper, 'PageUp')
    // Lima is index 13, so ten back is Chess at index 3.
    expect(active()).toBe('Chess')
    await press(wrapper, 'PageUp')
    expect(active()).toBe('Alpha')
  })
})

describe('select — arrows clamp, they do not wrap', () => {
  /** The opposite of Menu, deliberately. ADR-0009, and select/DESIGN.md — "Clamp, not wrap". */
  it('ArrowUp on the first option stays put', async () => {
    const wrapper = await open()
    expect(active()).toBe('Alpha')
    await press(wrapper, 'ArrowUp')
    expect(active()).toBe('Alpha')
  })

  it('ArrowDown on the last option stays put', async () => {
    const wrapper = await open()
    await press(wrapper, 'End')
    await press(wrapper, 'ArrowDown')
    expect(active()).toBe('Lima')
  })
})

describe('select — Alt arrows', () => {
  it('Alt+ArrowDown opens with nothing active', async () => {
    const wrapper = mountSelect()
    await press(wrapper, 'ArrowDown', { altKey: true })
    expect(isOpen()).toBe(true)
    expect(active()).toBeUndefined()
  })

  it('Alt+ArrowUp closes an open popup instead of moving', async () => {
    const wrapper = await open()
    await press(wrapper, 'ArrowDown')
    expect(active()).toBe('Bravo')
    await press(wrapper, 'ArrowUp', { altKey: true })
    expect(isOpen()).toBe(false)
  })
})

describe('select — typeahead', () => {
  it('jumps to the first Label starting with the character', async () => {
    const wrapper = await open()
    await press(wrapper, 'd')
    expect(active()).toBe('Delta')
  })

  /**
   * The search starts at the row *after* the cursor for a multi-character buffer too, so
   * `c` lands on Charlie and the `h` then looks past it and finds Chess. This is what APG's
   * select-only combobox does — it passes `activeIndex + 1` for every search, whatever the
   * buffer length. Radix and react-aria keep Charlie instead, by including the current row
   * once the buffer grows; that is a deliberate divergence from APG, not a fix.
   */
  it('searches from after the cursor, even for a multi-character buffer', async () => {
    const wrapper = await open()
    await press(wrapper, 'c')
    await press(wrapper, 'h')
    expect(active()).toBe('Chess')
  })

  /**
   * The one intended behaviour change of the `useListNavigation` migration. Repeating a
   * letter is how a user walks same-letter rows and APG requires it; the old `useSelect`
   * searched the buffer as typed, so `cc` matched nothing and the cursor stuck on Charlie.
   */
  it('walks same-letter Labels when the character repeats', async () => {
    const wrapper = await open()
    await press(wrapper, 'c')
    expect(active()).toBe('Charlie')
    await press(wrapper, 'c')
    expect(active()).toBe('Chess')
    await press(wrapper, 'c')
    expect(active()).toBe('Chrome')
  })

  it('does not run while searchable — the character belongs to the query', async () => {
    const wrapper = await open(rows, { searchable: true })
    await press(wrapper, 'd')
    // Still on the first option: the keystroke went to the search field, not the cursor.
    expect(active()).toBe('Alpha')
  })
})
