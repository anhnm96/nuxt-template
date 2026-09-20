import { mount } from '@vue/test-utils'
import Select from './Select.vue'

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

/** The popover teleports to `.popovers`; give it somewhere to land. */
function mountSelect(props: Record<string, any> = {}, attrs: Record<string, any> = {}) {
  const host = document.createElement('div')
  host.className = 'popovers'
  document.body.appendChild(host)
  return mount(Select, {
    props: { items: games, itemLabel: 'gameName', itemValue: 'gameId', ...props },
    attrs,
    attachTo: document.body,
    global: { directives: { clickOutside } },
  })
}

function trigger(wrapper: ReturnType<typeof mountSelect>) {
  return wrapper.get('[data-slot="select-trigger"]')
}

function optionLabels() {
  return [...document.querySelectorAll('[role="option"]')].map(o => o.textContent?.trim())
}

function activeLabel(triggerEl: Element) {
  const id = triggerEl.getAttribute('aria-activedescendant')
  return id ? document.getElementById(id)?.textContent?.trim() : undefined
}

afterEach(() => {
  document.querySelectorAll('.popovers').forEach(n => n.remove())
})

describe('select — Key vs Value', () => {
  it('resolves a Value that is a different object with the same contents', async () => {
    // A saved search restored from JSON is never reference-equal to an item in `items`.
    // Matching on Key is the only thing that makes this work.
    const restored = JSON.parse(JSON.stringify(games[4]))
    const wrapper = mount(Select, {
      props: {
        items: games,
        itemLabel: 'gameName',
        itemKey: 'gameId',
        modelValue: restored,
      },
      global: { directives: { clickOutside } },
    })
    expect(restored).not.toBe(games[4])
    expect(trigger(wrapper as any).text()).toBe('Echo Valley')
  })

  it('renders the placeholder for a Value that matches no Item', () => {
    const wrapper = mountSelect({ modelValue: 'nope', placeholder: 'Pick one' })
    expect(trigger(wrapper).text()).toBe('Pick one')
  })
})

describe('select — filtering', () => {
  /**
   * Regression guard for a silent Vue prop-typing trap: a `false | Function` prop union
   * compiles to `type: [Boolean, Function]`, and Vue's Boolean casting then defaults the
   * absent* prop to `false`. A `false` sentinel meaning "the parent filters" would
   * therefore disable filtering at every call site that never passed one.
   * See docs/specs/select/design.md — "Search and filtering".
   */
  it('filters by default when no filter props are passed', async () => {
    const wrapper = mountSelect({ searchable: true })
    // The typed character seeds the query, so this also covers the seeded-character path.
    await trigger(wrapper).trigger('keydown', { key: 'c' })
    await nextTick()
    expect(optionLabels()).toEqual(['Battle Chasm', 'Cobalt Drift', 'Dune Racer', 'Echo Valley'])
  })

  it('leaves items untouched when the parent owns filtering', async () => {
    const wrapper = mountSelect({ searchable: true, externalFilter: true })
    await trigger(wrapper).trigger('keydown', { key: 'c' })
    await nextTick()
    expect(optionLabels()).toHaveLength(games.length)
  })
})

describe('select — keyboard', () => {
  it('opens on ArrowDown without moving DOM focus off the trigger', async () => {
    const wrapper = mountSelect()
    const el = trigger(wrapper)
    ;(el.element as HTMLElement).focus()
    await el.trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    expect(el.attributes('aria-expanded')).toBe('true')
    expect(activeLabel(el.element)).toBe('Alpha Strike')
    // The whole point of aria-activedescendant: the highlight moved, focus did not.
    expect(document.activeElement).toBe(el.element)
  })

  it('skips disabled options and clamps instead of wrapping', async () => {
    const wrapper = mountSelect({ itemDisabled: 'retired' })
    const el = trigger(wrapper)
    await el.trigger('keydown', { key: 'ArrowDown' })
    await el.trigger('keydown', { key: 'ArrowDown' })
    await el.trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    // g3 is disabled, so two steps from g1 lands on g4
    expect(activeLabel(el.element)).toBe('Dune Racer')

    for (let i = 0; i < 10; i++) await el.trigger('keydown', { key: 'ArrowUp' })
    await nextTick()
    expect(activeLabel(el.element)).toBe('Alpha Strike')
  })

  it('jumps to a matching label on a printable character', async () => {
    const wrapper = mountSelect()
    const el = trigger(wrapper)
    await el.trigger('keydown', { key: 'e' })
    await nextTick()
    expect(el.attributes('aria-expanded')).toBe('true')
    expect(activeLabel(el.element)).toBe('Echo Valley')
  })

  it('commits on Enter and closes', async () => {
    const wrapper = mountSelect()
    const el = trigger(wrapper)
    await el.trigger('keydown', { key: 'ArrowDown' })
    await el.trigger('keydown', { key: 'Enter' })
    await nextTick()
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['g1'])
    expect(el.attributes('aria-expanded')).toBe('false')
  })

  it('closes on Tab without committing', async () => {
    const wrapper = mountSelect()
    const el = trigger(wrapper)
    await el.trigger('keydown', { key: 'ArrowDown' })
    await el.trigger('keydown', { key: 'Tab' })
    await nextTick()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(el.attributes('aria-expanded')).toBe('false')
  })
})

describe('select — attrs split', () => {
  /**
   * This one fails silently in a browser: `aria-labelledby` landing on the wrapper div
   * instead of the combobox means a screen reader announces nothing at all.
   */
  it('puts class on the control box and everything else on the trigger', () => {
    const wrapper = mountSelect({}, {
      'class': 'max-w-60',
      'aria-describedby': 'hint',
      'data-probe': 'x',
    })
    const box = wrapper.get('[data-slot="select-control"]')
    const el = trigger(wrapper)

    expect(box.classes()).toContain('max-w-60')
    expect(box.attributes('aria-describedby')).toBeUndefined()
    expect(box.attributes('data-probe')).toBeUndefined()

    expect(el.attributes('aria-describedby')).toBe('hint')
    expect(el.attributes('data-probe')).toBe('x')
    expect(el.classes()).not.toContain('max-w-60')
  })
})

describe('select — multiple', () => {
  it('toggles without closing, and clears', async () => {
    const host = document.createElement('div')
    host.className = 'popovers'
    document.body.appendChild(host)
    const wrapper = mount(Select, {
      props: { items: games, itemLabel: 'gameName', itemValue: 'gameId', multiple: true, clearable: true },
      attachTo: document.body,
      global: { directives: { clickOutside } },
    })
    const el = wrapper.get('[data-slot="select-trigger"]')

    await el.trigger('keydown', { key: 'ArrowDown' })
    await el.trigger('keydown', { key: 'Enter' })
    await nextTick()
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([['g1']])
    expect(el.attributes('aria-expanded')).toBe('true')

    await el.trigger('keydown', { key: 'Enter' })
    await nextTick()
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([[]])
  })

  it('renders no clear button when there is nothing to clear', () => {
    const wrapper = mount(Select, {
      props: { items: games, itemLabel: 'gameName', itemValue: 'gameId', multiple: true, clearable: true },
      global: { directives: { clickOutside } },
    })
    // An empty select must not add a tab stop between fields.
    expect(wrapper.find('[data-slot="clear"]').exists()).toBe(false)
  })
})
