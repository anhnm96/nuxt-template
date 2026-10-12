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

describe('autocomplete — the three empty states', () => {
  it('asks for more characters below `minQueryLength`', async () => {
    const wrapper = mountAutocomplete({ minQueryLength: 2 })
    await type(wrapper, 'a')
    expect(optionLabels()).toEqual([])
    expect(document.body.textContent).toContain('Type at least 2 characters')
  })

  it('offers Options once the threshold is met', async () => {
    const wrapper = mountAutocomplete({ minQueryLength: 2 })
    await type(wrapper, 'alp')
    expect(optionLabels()).toEqual(['Alpha Strike'])
  })

  it('does not announce "No results" before anything has been asked for', async () => {
    const wrapper = mountAutocomplete({ minQueryLength: 2, emptyText: 'No results' })
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
    const wrapper = mountAutocomplete({ minQueryLength: 2 })
    await type(wrapper, 'a')
    // Below the threshold the popup shows a hint, so there is no listbox to point at.
    expect(input(wrapper).attributes('aria-controls')).toBeUndefined()
    await type(wrapper, 'al')
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

describe('autocomplete — minQueryLength and a set Value', () => {
  /** Short Labels, as a language picker has. */
  interface Lang { id: string, name: string }
  const langs: Lang[] = [
    { id: 'go', name: 'Go' },
    { id: 'cs', name: 'C#' },
    { id: 'sql', name: 'SQL' },
    { id: 'ts', name: 'TypeScript' },
  ]
  const langProps = { items: langs, itemLabel: 'name', itemValue: 'id', minQueryLength: 3 }

  it('browses a filled field whose Label is shorter than the threshold', async () => {
    /**
     * The threshold is about searching. A set Value makes the Query an echo of its Label, so
     * applying the threshold to it tells someone who has already chosen to keep typing.
     */
    const wrapper = mountAutocomplete({ ...langProps, modelValue: 'go' })
    expect((input(wrapper).element as HTMLInputElement).value).toBe('Go')
    await input(wrapper).trigger('keydown', { key: 'ArrowDown' })
    expect(optionLabels()).toHaveLength(langs.length)
    expect(document.body.textContent).not.toContain('Type at least')
  })

  it('points `aria-controls` at the listbox it is rendering', async () => {
    const wrapper = mountAutocomplete({ ...langProps, modelValue: 'go' })
    await input(wrapper).trigger('keydown', { key: 'ArrowDown' })
    const id = input(wrapper).attributes('aria-controls')
    expect(id).toBeTruthy()
    expect(document.getElementById(id!)).not.toBeNull()
  })

  it('still asks for more characters when nothing is selected', async () => {
    const wrapper = mountAutocomplete(langProps)
    await type(wrapper, 'g')
    expect(optionLabels()).toEqual([])
    expect(document.body.textContent).toContain('Type at least 3 characters')
  })

  it('asks again once the Value is cleared', async () => {
    const wrapper = mountAutocomplete({ ...langProps, modelValue: 'go', clearable: true })
    await wrapper.get('[data-slot="clear"]').trigger('click')
    await input(wrapper).trigger('keydown', { key: 'ArrowDown' })
    expect(optionLabels()).toEqual([])
    expect(document.body.textContent).toContain('Type at least 3 characters')
  })

  it('applies the threshold again as soon as the user edits the Label', async () => {
    // Typing clears the Value under (A), so the Query is a search once more.
    const wrapper = mountAutocomplete({ ...langProps, modelValue: 'go' })
    await type(wrapper, 'G')
    expect(optionLabels()).toEqual([])
    expect(document.body.textContent).toContain('Type at least 3 characters')
  })
})

describe('autocomplete — minQueryLength and an unresolved Value', () => {
  /**
   * A Value whose Item has not arrived offers nothing to browse, so the threshold still
   * applies. Keying this off the raw model rather than the resolved Option turned the async
   * window into "No results" before the user had typed anything.
   */
  const asyncProps = { items: [], minQueryLength: 3, externalFilter: true }

  it('still asks for a longer Query while the Item has not arrived', async () => {
    const wrapper = mountAutocomplete({ ...asyncProps, modelValue: 'g1' })
    expect((input(wrapper).element as HTMLInputElement).value).toBe('')
    await input(wrapper).trigger('keydown', { key: 'ArrowDown' })
    expect(document.body.textContent).toContain('Type at least 3 characters')
    expect(document.body.textContent).not.toContain('No results')
  })

  it('browses once the Item resolves, however short its Label', async () => {
    const wrapper = mountAutocomplete({ ...asyncProps, modelValue: 'g1' })
    await wrapper.setProps({ items: games })
    await input(wrapper).trigger('keydown', { key: 'ArrowDown' })
    expect(optionLabels()).toHaveLength(games.length)
    expect(document.body.textContent).not.toContain('Type at least')
  })

  it('keeps the threshold ahead of the spinner while the first load runs', async () => {
    /**
     * The states are ordered, and the threshold outranks loading. The hint is a true statement
     * about what the user must do; a spinner would promise results for a Query too short to
     * have asked for any. What must never appear either way is "No results".
     */
    const wrapper = mountAutocomplete({ ...asyncProps, modelValue: 'g1', loading: true })
    await input(wrapper).trigger('keydown', { key: 'ArrowDown' })
    expect(document.body.textContent).toContain('Type at least 3 characters')
    expect(document.body.textContent).not.toContain('No results')
  })
})
