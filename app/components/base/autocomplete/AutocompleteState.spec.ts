import { mount } from '@vue/test-utils'
import Autocomplete from './Autocomplete.vue'

/**
 * The (A) invariant and everything derived from it: Dirty Query, Last Commit, Abandon, clear.
 * See ADR-0012 — these are the rules every exit path shares, and they are the reason the
 * component can carry two models without them disagreeing.
 */

interface Game { gameId: string, gameName: string }

const games: Game[] = [
  { gameId: 'g1', gameName: 'Alpha Strike' },
  { gameId: 'g2', gameName: 'Battle Chasm' },
  { gameId: 'g4', gameName: 'Dune Racer' },
]

const clickOutside = {}

/** Everything mounted in this file, so `afterEach` can take it back out of the document. */
const mounted: { unmount: () => void }[] = []

function mountAutocomplete(props: Record<string, any> = {}) {
  const host = document.createElement('div')
  host.className = 'popovers'
  document.body.appendChild(host)
  const wrapper = mount(Autocomplete, {
    props: { items: games, itemLabel: 'gameName', itemValue: 'gameId', ...props },
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

function value(wrapper: Wrapper) {
  return (input(wrapper).element as HTMLInputElement).value
}

async function type(wrapper: Wrapper, text: string) {
  const field = input(wrapper)
  ;(field.element as HTMLInputElement).value = text
  await field.trigger('input')
}

/** Picks the first Visible Option by clicking it, as a mouse user would. */
async function clickOption(label: string) {
  const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')]
    .find(o => o.textContent?.trim() === label)
  option!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await nextTick()
}

/** The last Value the component emitted, or `undefined` if it never emitted one. */
function lastValue(wrapper: Wrapper) {
  const emitted = wrapper.emitted('update:modelValue')
  return emitted?.at(-1)?.[0]
}

afterEach(() => {
  // Each mount attaches to `document.body` and stays there until it is unmounted, and the
  // popover teleports to whichever `.popovers` host it finds. Leaving either behind lets one
  // test's options and comboboxes answer the next test's document-wide queries.
  mounted.forEach(w => w.unmount())
  mounted.length = 0
  document.querySelectorAll('.popovers').forEach(n => n.remove())
})

describe('autocomplete — the (A) invariant', () => {
  it('sets both models when an Option is committed', async () => {
    const wrapper = mountAutocomplete()
    await type(wrapper, 'Dune')
    await clickOption('Dune Racer')
    expect(lastValue(wrapper)).toBe('g4')
    expect(value(wrapper)).toBe('Dune Racer')
  })

  it('clears the Value the moment the text stops describing it', async () => {
    const wrapper = mountAutocomplete({ modelValue: 'g1' })
    expect(value(wrapper)).toBe('Alpha Strike')
    await type(wrapper, 'Alpha Strik')
    expect(lastValue(wrapper)).toBeNull()
  })

  it('does not clear the Value when nothing was set', async () => {
    const wrapper = mountAutocomplete()
    await type(wrapper, 'Al')
    // (A) only has something to undo when the model holds a Value.
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('re-echoes the Label when the parent changes the Value', async () => {
    const wrapper = mountAutocomplete({ modelValue: 'g1' })
    await wrapper.setProps({ modelValue: 'g2' })
    expect(value(wrapper)).toBe('Battle Chasm')
  })
})

describe('autocomplete — Abandon', () => {
  it('restores the Last Commit when a Dirty Query is abandoned', async () => {
    const wrapper = mountAutocomplete({ modelValue: 'g1' })
    await type(wrapper, 'Alph')
    expect(lastValue(wrapper)).toBeNull()
    await input(wrapper).trigger('blur')
    expect(lastValue(wrapper)).toBe('g1')
    expect(value(wrapper)).toBe('Alpha Strike')
  })

  it('keeps the text in Freeform instead of restoring', async () => {
    const wrapper = mountAutocomplete({ modelValue: 'g1', freeform: true })
    await type(wrapper, 'Something else')
    await input(wrapper).trigger('blur')
    expect(value(wrapper)).toBe('Something else')
    expect(lastValue(wrapper)).toBeNull()
  })

  it('treats an empty Query as an intentional clear, never as a slip', async () => {
    // Select-all then Delete is the keyboard path to clearing. Restoring over it would mean
    // the field had no "off".
    const wrapper = mountAutocomplete({ modelValue: 'g1' })
    await type(wrapper, '')
    await input(wrapper).trigger('blur')
    expect(value(wrapper)).toBe('')
    expect(lastValue(wrapper)).toBeNull()
  })

  it('does not resurrect a Last Commit that an empty Query discarded', async () => {
    const wrapper = mountAutocomplete({ modelValue: 'g1' })
    await type(wrapper, '')
    await input(wrapper).trigger('blur')
    await type(wrapper, 'zzz')
    await input(wrapper).trigger('blur')
    expect(value(wrapper)).toBe('')
    expect(lastValue(wrapper)).toBeNull()
  })

  it('empties a Dirty Query that never had a Last Commit', async () => {
    const wrapper = mountAutocomplete()
    await type(wrapper, 'zzz')
    await input(wrapper).trigger('blur')
    expect(value(wrapper)).toBe('')
  })

  it('leaves a coherent field alone', async () => {
    const wrapper = mountAutocomplete({ modelValue: 'g2' })
    await input(wrapper).trigger('blur')
    expect(value(wrapper)).toBe('Battle Chasm')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})

describe('autocomplete — clearing', () => {
  it('empties both models', async () => {
    const wrapper = mountAutocomplete({ modelValue: 'g1', clearable: true })
    await wrapper.get('[data-slot="clear"]').trigger('click')
    expect(lastValue(wrapper)).toBeNull()
    expect(value(wrapper)).toBe('')
  })

  it('discards the Last Commit, so the next Abandon cannot undo it', async () => {
    const wrapper = mountAutocomplete({ modelValue: 'g1', clearable: true })
    await wrapper.get('[data-slot="clear"]').trigger('click')
    await type(wrapper, 'zz')
    await input(wrapper).trigger('blur')
    expect(value(wrapper)).toBe('')
  })

  it('offers the clear button for Freeform text with no Value', async () => {
    const wrapper = mountAutocomplete({ freeform: true, clearable: true })
    await type(wrapper, 'custom')
    expect(wrapper.find('[data-slot="clear"]').exists()).toBe(true)
  })
})

describe('autocomplete — opening a filled field', () => {
  it('makes the selected Option Active', async () => {
    const wrapper = mountAutocomplete({ modelValue: 'g2' })
    await input(wrapper).trigger('keydown', { key: 'ArrowDown' })
    const id = input(wrapper).attributes('aria-activedescendant')
    expect(document.getElementById(id!)?.textContent?.trim()).toBe('Battle Chasm')
  })

  it('leaves no Active Option when the chevron opens an empty field', async () => {
    // Browsing is not navigating: `Enter` must still mean "use my text".
    const wrapper = mountAutocomplete()
    await wrapper.get('[data-slot="autocomplete-toggle"]').trigger('click')
    expect(input(wrapper).attributes('aria-activedescendant')).toBeUndefined()
  })

  it('closes on a second chevron click', async () => {
    const wrapper = mountAutocomplete()
    const toggle = wrapper.get('[data-slot="autocomplete-toggle"]')
    await toggle.trigger('click')
    expect(input(wrapper).attributes('aria-expanded')).toBe('true')
    await toggle.trigger('click')
    expect(input(wrapper).attributes('aria-expanded')).toBe('false')
  })
})

describe('autocomplete — auto-highlight', () => {
  function activeLabel(wrapper: Wrapper) {
    const id = input(wrapper).attributes('aria-activedescendant')
    return id ? document.getElementById(id)?.textContent?.trim() : undefined
  }

  it('highlights the first prefix match by default', async () => {
    const wrapper = mountAutocomplete()
    await type(wrapper, 'Al')
    expect(activeLabel(wrapper)).toBe('Alpha Strike')
  })

  it('highlights nothing when the match is only a substring', async () => {
    // `Chasm` contains `has`, but nothing starts with it — so `Enter` means "use my text".
    const wrapper = mountAutocomplete()
    await type(wrapper, 'has')
    expect(activeLabel(wrapper)).toBeUndefined()
  })

  it('is off by default in Freeform', async () => {
    const wrapper = mountAutocomplete({ freeform: true })
    await type(wrapper, 'Al')
    expect(activeLabel(wrapper)).toBeUndefined()
  })

  it('can be turned back on in Freeform', async () => {
    const wrapper = mountAutocomplete({ freeform: true, autoHighlight: true })
    await type(wrapper, 'Al')
    expect(activeLabel(wrapper)).toBe('Alpha Strike')
  })

  it('can be turned off outside Freeform', async () => {
    const wrapper = mountAutocomplete({ autoHighlight: false })
    await type(wrapper, 'Al')
    expect(activeLabel(wrapper)).toBeUndefined()
  })

  it('tells an absent prop apart from an explicit false', () => {
    /**
     * Load-bearing, like ADR-0003's `multiple: ''` case. A `boolean` prop compiles to
     * `type: Boolean`, and Vue casts an absent one to `false` unless the props object
     * carries a `default` key — which would collapse "not set" into "off" and make the
     * `!freeform` default unreachable. Nothing else fails when that regresses: the
     * component merely stops highlighting, which reads as a missing feature.
     */
    const wrapper = mountAutocomplete()
    expect(wrapper.props('autoHighlight')).toBeUndefined()
  })

  it('applies once server-filtered items arrive after the keystroke', async () => {
    const wrapper = mountAutocomplete({ items: [], externalFilter: true })
    await type(wrapper, 'Al')
    expect(activeLabel(wrapper)).toBeUndefined()
    await wrapper.setProps({ items: games })
    expect(activeLabel(wrapper)).toBe('Alpha Strike')
  })
})

describe('autocomplete — closing', () => {
  it('does not pull focus back to the input', () => {
    /**
     * `Dropdown` restores focus to whatever held it when the popover opened. Here that is the
     * input itself, so restoring would grab focus back from wherever the user just clicked.
     * Escape needs no restore either: focus never leaves the input.
     */
    const dropdown = mountAutocomplete().findComponent({ name: 'Dropdown' })
    expect(dropdown.props('restoreFocus')).toBe(false)
  })

  it('keeps click-outside dismissal despite driving its own opening', () => {
    const dropdown = mountAutocomplete().findComponent({ name: 'Dropdown' })
    expect(dropdown.props('triggers')).toEqual([])
    expect(dropdown.props('dismissOnClickOutside')).toBe(true)
  })

  it('closes on blur before Abandon runs', async () => {
    /**
     * Blur fires on `mousedown` and click-outside on `click`, so Abandon would otherwise
     * restore the Last Commit while the popup was still open — flipping the list from
     * "No results" to every Option in the gap between the two events.
     */
    const wrapper = mountAutocomplete({ modelValue: 'g1' })
    await type(wrapper, 'zzz')
    expect(input(wrapper).attributes('aria-expanded')).toBe('true')
    await input(wrapper).trigger('blur')
    expect(input(wrapper).attributes('aria-expanded')).toBe('false')
    expect(value(wrapper)).toBe('Alpha Strike')
  })
})

describe('autocomplete — Abandon with an unresolved Value', () => {
  /**
   * A Value set before its Items arrive resolves to no Option, so there is no Last Commit to
   * restore. Abandoning must still put the Value back: the consumer loaded `items`
   * asynchronously, which is a supported shape, and the field looks empty for that whole
   * window — so a stray keystroke inside it would otherwise destroy the Value for good.
   */
  it('restores a Value whose Item never arrived', async () => {
    const wrapper = mountAutocomplete({ items: [], modelValue: 'g1', loading: true })
    expect(value(wrapper)).toBe('')

    await type(wrapper, 'x')
    expect(lastValue(wrapper)).toBeNull()

    await input(wrapper).trigger('blur')
    expect(lastValue(wrapper)).toBe('g1')
    // Nothing knows the Label yet, so the field goes back to exactly where it was.
    expect(value(wrapper)).toBe('')
  })

  it('labels the restored Value once the Items land', async () => {
    const wrapper = mountAutocomplete({ items: [], modelValue: 'g1', loading: true })
    await type(wrapper, 'x')
    await input(wrapper).trigger('blur')

    await wrapper.setProps({ items: games, loading: false })
    expect(value(wrapper)).toBe('Alpha Strike')
    expect(lastValue(wrapper)).toBe('g1')
  })

  it('prefers the resolved Option when there is one', async () => {
    const wrapper = mountAutocomplete({ modelValue: 'g1' })
    await type(wrapper, 'zz')
    await input(wrapper).trigger('blur')
    expect(value(wrapper)).toBe('Alpha Strike')
  })

  it('does not restore in Freeform, where the text is the value', async () => {
    const wrapper = mountAutocomplete({ items: [], modelValue: 'g1', loading: true, freeform: true })
    await type(wrapper, 'my own text')
    await input(wrapper).trigger('blur')
    expect(value(wrapper)).toBe('my own text')
    expect(lastValue(wrapper)).toBeNull()
  })

  it('does not restore after an empty Query cleared the field', async () => {
    const wrapper = mountAutocomplete({ items: [], modelValue: 'g1', loading: true })
    await type(wrapper, '')
    await input(wrapper).trigger('blur')
    await type(wrapper, 'x')
    await input(wrapper).trigger('blur')
    expect(lastValue(wrapper)).toBeNull()
  })

  it('does not restore after the clear button emptied the field', async () => {
    const wrapper = mountAutocomplete({ items: [], modelValue: 'g1', loading: true, clearable: true })
    await wrapper.get('[data-slot="clear"]').trigger('click')
    await type(wrapper, 'x')
    await input(wrapper).trigger('blur')
    expect(lastValue(wrapper)).toBeNull()
    expect(value(wrapper)).toBe('')
  })
})

describe('autocomplete — the parent clears the Value', () => {
  it('clears the Query with it', async () => {
    // Leaving the Label behind would show a filled field over an empty model.
    const wrapper = mountAutocomplete({ modelValue: 'g1' })
    expect(value(wrapper)).toBe('Alpha Strike')
    await wrapper.setProps({ modelValue: null })
    expect(value(wrapper)).toBe('')
  })

  it('does not restore the Value the parent cleared', async () => {
    // The stale Label made this a Dirty Query, so Abandon used to undo the parent's reset.
    const wrapper = mountAutocomplete({ modelValue: 'g1' })
    await wrapper.setProps({ modelValue: null })
    await input(wrapper).trigger('blur')
    expect(lastValue(wrapper)).toBeUndefined()
    expect(value(wrapper)).toBe('')
  })

  it('does not restore it after the user types again either', async () => {
    const wrapper = mountAutocomplete({ modelValue: 'g1' })
    await wrapper.setProps({ modelValue: null })
    await type(wrapper, 'zz')
    await input(wrapper).trigger('blur')
    expect(lastValue(wrapper)).toBeUndefined()
    expect(value(wrapper)).toBe('')
  })

  it('does not restore an Option from a dataset that was swapped out', async () => {
    const other = [{ gameId: 'x1', gameName: 'Xenon Rally' }]
    const wrapper = mountAutocomplete({ modelValue: 'g1' })
    // A dependent field: the parent swaps the list and resets the model together.
    await wrapper.setProps({ items: other, modelValue: null })
    expect(value(wrapper)).toBe('')
    await type(wrapper, 'Xen')
    await input(wrapper).trigger('blur')
    expect(lastValue(wrapper)).toBeUndefined()
  })

  it('leaves a Query the user is already editing alone', async () => {
    // The model is null before and after, so there is no transition and nothing to repair.
    const wrapper = mountAutocomplete()
    await type(wrapper, 'half typed')
    await wrapper.setProps({ modelValue: null })
    expect(value(wrapper)).toBe('half typed')
  })

  it('does not wipe a restored Query that never had a Value', async () => {
    // Freeform state restored from a draft: query set, model null from the start.
    const wrapper = mountAutocomplete({ freeform: true, query: 'my own text' })
    expect(value(wrapper)).toBe('my own text')
  })

  it('still restores the Last Commit when the user cleared it, not the parent', async () => {
    const wrapper = mountAutocomplete({ modelValue: 'g1' })
    await type(wrapper, 'Alph')
    await input(wrapper).trigger('blur')
    expect(lastValue(wrapper)).toBe('g1')
  })

  it('still restores across an externalFilter search that replaced items', async () => {
    // `items` is the current results, not the dataset — a Last Commit missing from them is
    // normal here and must not be mistaken for a swapped dataset.
    const wrapper = mountAutocomplete({ externalFilter: true, modelValue: 'g1' })
    expect(value(wrapper)).toBe('Alpha Strike')
    await type(wrapper, 'dun')
    await wrapper.setProps({ items: [games[2]!] })
    await input(wrapper).trigger('blur')
    expect(lastValue(wrapper)).toBe('g1')
    expect(value(wrapper)).toBe('Alpha Strike')
  })
})
