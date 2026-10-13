import { mount } from '@vue/test-utils'
import Autocomplete from './Autocomplete.vue'

interface Game { gameId: string, gameName: string, retired?: boolean }

const games: Game[] = [
  { gameId: 'g1', gameName: 'Alpha Strike' },
  { gameId: 'g2', gameName: 'Battle Chasm' },
  { gameId: 'g3', gameName: 'Cobalt Drift', retired: true },
  { gameId: 'g4', gameName: 'Dune Racer' },
  { gameId: 'g5', gameName: 'Echo Valley' },
]

/** Registered by a Nuxt plugin that unit mounts never run. */
const clickOutside = {}

/** Everything mounted in this file, so `afterEach` can take it back out of the document. */
const mounted: { unmount: () => void }[] = []

/** The popover teleports to `.popovers`; give it somewhere to land. */
function mountAutocomplete(props: Record<string, any> = {}, attrs: Record<string, any> = {}) {
  const host = document.createElement('div')
  host.className = 'popovers'
  document.body.appendChild(host)
  const wrapper = mount(Autocomplete, {
    props: { items: games, itemLabel: 'gameName', itemValue: 'gameId', ...props },
    attrs,
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

function optionLabels() {
  return [...document.querySelectorAll('[role="option"]')].map(o => o.textContent?.trim())
}

/** Types into the input the way a browser does: set the value, then fire `input`. */
async function type(wrapper: Wrapper, value: string) {
  const field = input(wrapper)
  ;(field.element as HTMLInputElement).value = value
  await field.trigger('input')
}

afterEach(() => {
  // Each mount attaches to `document.body` and stays there until it is unmounted, and the
  // popover teleports to whichever `.popovers` host it finds. Leaving either behind lets one
  // test's options and comboboxes answer the next test's document-wide queries.
  mounted.forEach(w => w.unmount())
  mounted.length = 0
  document.querySelectorAll('.popovers').forEach(n => n.remove())
})

describe('autocomplete — the Query', () => {
  it('echoes the Label of a Value supplied by the parent', () => {
    const wrapper = mountAutocomplete({ modelValue: 'g5' })
    expect((input(wrapper).element as HTMLInputElement).value).toBe('Echo Valley')
  })

  it('echoes a Label that only resolves once `items` arrive', async () => {
    const wrapper = mountAutocomplete({ items: [], modelValue: 'g2' })
    expect((input(wrapper).element as HTMLInputElement).value).toBe('')
    await wrapper.setProps({ items: games })
    expect((input(wrapper).element as HTMLInputElement).value).toBe('Battle Chasm')
  })

  it('survives the popup closing, unlike a Select Search Query', async () => {
    const wrapper = mountAutocomplete({ freeform: true })
    await type(wrapper, 'zzz')
    await input(wrapper).trigger('keydown', { key: 'Escape' })
    expect((input(wrapper).element as HTMLInputElement).value).toBe('zzz')
  })

  it('is emitted on every keystroke, undebounced', async () => {
    const wrapper = mountAutocomplete()
    await type(wrapper, 'A')
    await type(wrapper, 'Al')
    expect(wrapper.emitted('update:query')).toEqual([['A'], ['Al']])
  })
})

describe('autocomplete — filtering', () => {
  it('narrows by a case-insensitive substring of the Label', async () => {
    const wrapper = mountAutocomplete()
    await type(wrapper, 'cHaS')
    expect(optionLabels()).toEqual(['Battle Chasm'])
  })

  it('shows every Option while a Value is set, so a filled field stays browsable', async () => {
    // The Query is an echo of the Label here, not a search. Filtering by it would leave the
    // one Option already chosen and make the chevron browse nothing.
    const wrapper = mountAutocomplete({ modelValue: 'g2' })
    await input(wrapper).trigger('keydown', { key: 'ArrowDown' })
    expect(optionLabels()).toHaveLength(games.length)
  })

  it('still filters when the user types a full Label by hand', async () => {
    // Typing never selects, so the model stays null and the rule above does not fire.
    const wrapper = mountAutocomplete()
    await type(wrapper, 'Dune Racer')
    expect(optionLabels()).toEqual(['Dune Racer'])
  })

  it('renders `items` untouched under `externalFilter`', async () => {
    const wrapper = mountAutocomplete({ externalFilter: true })
    await type(wrapper, 'zzz')
    expect(optionLabels()).toHaveLength(games.length)
  })

  it('uses `filterFn` when one is given', async () => {
    const wrapper = mountAutocomplete({
      filterFn: (item: Game, query: string) => item.gameId === query,
    })
    await type(wrapper, 'g4')
    expect(optionLabels()).toEqual(['Dune Racer'])
  })
})

describe('autocomplete — the two empty states', () => {
  it('does not announce "No results" while the first load is still running', async () => {
    // Ordered, not combined: a spinner is the true statement until something arrives.
    const wrapper = mountAutocomplete({ items: [], loading: true, externalFilter: true })
    await type(wrapper, 'a')
    expect(document.body.textContent).not.toContain('No results')
  })

  it('shows "No results" once a search has actually run', async () => {
    const wrapper = mountAutocomplete()
    await type(wrapper, 'zzz')
    expect(document.body.textContent).toContain('No results')
  })

  it('opens while loading rather than refusing, unlike Select', async () => {
    // The keystroke that starts the request is the one that should show the popup.
    const wrapper = mountAutocomplete({ items: [], loading: true, externalFilter: true })
    await type(wrapper, 'a')
    expect(document.querySelector('[data-slot="autocomplete-popup"]')).not.toBeNull()
  })
})

describe('autocomplete — groups', () => {
  interface Platform { label: string, entries: Game[] }
  const platforms: Platform[] = [
    { label: 'Console', entries: [games[0]!, games[1]!] },
    { label: 'Handheld', entries: [games[3]!] },
  ]

  it('flattens Groups and labels each run', async () => {
    const wrapper = mountAutocomplete({
      items: platforms,
      itemChildren: (p: Platform) => p.entries,
      itemGroup: 'label',
      itemLabel: 'gameName',
      itemValue: (g: Game) => g.gameId,
    })
    await input(wrapper).trigger('keydown', { key: 'ArrowDown' })
    expect(optionLabels()).toEqual(['Alpha Strike', 'Battle Chasm', 'Dune Racer'])
    const headings = [...document.querySelectorAll('[data-slot="group-label"]')]
      .map(n => n.textContent?.trim())
    expect(headings).toEqual(['Console', 'Handheld'])
  })

  it('drops a Group whose Options are all filtered out', async () => {
    const wrapper = mountAutocomplete({
      items: platforms,
      itemChildren: (p: Platform) => p.entries,
      itemGroup: 'label',
      itemLabel: 'gameName',
      itemValue: (g: Game) => g.gameId,
    })
    await type(wrapper, 'Dune')
    const headings = [...document.querySelectorAll('[data-slot="group-label"]')]
      .map(n => n.textContent?.trim())
    expect(headings).toEqual(['Handheld'])
  })
})

describe('autocomplete — accessibility', () => {
  it('makes the input the combobox, and never moves the role elsewhere', async () => {
    const wrapper = mountAutocomplete()
    expect(input(wrapper).attributes('role')).toBe('combobox')
    expect(input(wrapper).attributes('aria-autocomplete')).toBe('list')
    await input(wrapper).trigger('keydown', { key: 'ArrowDown' })
    expect(document.querySelectorAll('[role="combobox"]')).toHaveLength(1)
  })

  it('points `aria-controls` at the listbox only while one is rendered', async () => {
    const wrapper = mountAutocomplete({ items: [], loading: true, externalFilter: true })
    await type(wrapper, 'a')
    // The first load draws a spinner, so there is no listbox to point at.
    expect(input(wrapper).attributes('aria-controls')).toBeUndefined()
    await wrapper.setProps({ items: games, loading: false })
    const id = input(wrapper).attributes('aria-controls')
    expect(id).toBeTruthy()
    expect(document.getElementById(id!)).not.toBeNull()
  })

  it('reports expansion on the input', async () => {
    const wrapper = mountAutocomplete()
    expect(input(wrapper).attributes('aria-expanded')).toBe('false')
    await input(wrapper).trigger('keydown', { key: 'ArrowDown' })
    expect(input(wrapper).attributes('aria-expanded')).toBe('true')
  })
})
