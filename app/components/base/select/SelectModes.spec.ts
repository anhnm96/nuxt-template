import { mount } from '@vue/test-utils'
import Select from './Select.vue'

/** Registered by a Nuxt plugin that unit mounts never run. */
const clickOutside = {}

interface Game { gameId: string, gameName: string }

const games: Game[] = [
  { gameId: 'g1', gameName: 'Alpha Strike' },
  { gameId: 'g2', gameName: 'Battle Chasm' },
  { gameId: 'g3', gameName: 'Cobalt Drift' },
]

function mountSelect(props: Record<string, any> = {}) {
  const host = document.createElement('div')
  host.className = 'popovers'
  document.body.appendChild(host)
  return mount(Select, {
    props: { items: games, itemLabel: 'gameName', itemValue: 'gameId', ...props },
    attachTo: document.body,
    global: { directives: { clickOutside } },
  })
}

function trigger(wrapper: ReturnType<typeof mountSelect>) {
  return wrapper.get('[data-slot="select-trigger"]')
}

afterEach(() => {
  document.querySelectorAll('.popovers').forEach(n => n.remove())
})

describe('select — the Boolean casting that ADR-0002 was written about', () => {
  /**
   * The regression guard for the whole experiment. A bare `multiple?: M` compiles to
   * `type: null`, Vue skips Boolean casting, and the bare attribute `<Select multiple>`
   * arrives as `''` — falsy — so the component silently behaves as single-select.
   * `multiple?: M & boolean` emits `type: Boolean`, which casts `''` to `true`.
   */
  it('treats the bare `multiple` attribute as true, not the empty string', async () => {
    // '' is exactly what a valueless attribute yields before casting
    const wrapper = mountSelect({ multiple: '' })
    const el = trigger(wrapper)
    await el.trigger('keydown', { key: 'ArrowDown' })
    await el.trigger('keydown', { key: 'Enter' })
    await nextTick()
    // multiple => array, and the popup stays open
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([['g1']])
    expect(el.attributes('aria-expanded')).toBe('true')
  })

  it('announces itself as multi-selectable only when multiple', async () => {
    const single = mountSelect()
    await trigger(single).trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    expect(document.querySelector('[role="listbox"]')?.getAttribute('aria-multiselectable')).toBeNull()

    document.querySelectorAll('.popovers').forEach(n => n.remove())

    const multi = mountSelect({ multiple: true })
    await trigger(multi).trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    expect(document.querySelector('[role="listbox"]')?.getAttribute('aria-multiselectable')).toBe('true')
  })
})

describe('select — single mode', () => {
  it('commits a scalar on Enter and closes', async () => {
    const wrapper = mountSelect()
    const el = trigger(wrapper)
    await el.trigger('keydown', { key: 'ArrowDown' })
    await el.trigger('keydown', { key: 'Enter' })
    await nextTick()
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['g1'])
    expect(el.attributes('aria-expanded')).toBe('false')
  })

  it('clears to null', async () => {
    const wrapper = mountSelect({ modelValue: 'g2', clearable: true })
    await trigger(wrapper).trigger('keydown', { key: 'Delete' })
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([null])
  })

  it('resolves the selected label', () => {
    const wrapper = mountSelect({ modelValue: 'g2' })
    expect(trigger(wrapper).text()).toBe('Battle Chasm')
  })

  it('falls back to the single-mode placeholder', () => {
    const wrapper = mountSelect()
    expect(trigger(wrapper).text()).toBe('Select an option')
  })
})

describe('select — multiple mode', () => {
  it('toggles without closing and emits an array', async () => {
    const wrapper = mountSelect({ multiple: true })
    const el = trigger(wrapper)
    await el.trigger('keydown', { key: 'ArrowDown' })
    await el.trigger('keydown', { key: 'Enter' })
    await nextTick()
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([['g1']])
    expect(el.attributes('aria-expanded')).toBe('true')

    await el.trigger('keydown', { key: 'Enter' })
    await nextTick()
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([[]])
  })

  it('joins the labels of every resolved selection', () => {
    const wrapper = mountSelect({ multiple: true, modelValue: ['g1', 'g3'] })
    expect(trigger(wrapper).text()).toBe('Alpha Strike, Cobalt Drift')
  })

  it('clears to an empty array, not null', async () => {
    const wrapper = mountSelect({ multiple: true, modelValue: ['g1'], clearable: true })
    await trigger(wrapper).trigger('keydown', { key: 'Delete' })
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([[]])
  })

  it('falls back to the multiple-mode placeholder', () => {
    const wrapper = mountSelect({ multiple: true })
    expect(trigger(wrapper).text()).toBe('Select options')
  })
})

describe('select — behaviour shared across both modes', () => {
  it('still blocks opening while loading with no items', async () => {
    const wrapper = mountSelect({ items: [], loading: true })
    const el = trigger(wrapper)
    await el.trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    expect(el.attributes('aria-expanded')).toBe('false')
    expect(el.attributes('aria-disabled')).toBe('true')
  })

  it('still groups by first appearance', async () => {
    const rows = [
      { id: 'a1', name: 'Alpha', cat: 'Action' },
      { id: 'r1', name: 'Rune', cat: 'RPG' },
      { id: 'a2', name: 'Blast', cat: 'Action' },
    ]
    const wrapper = mountSelect({ items: rows, itemLabel: 'name', itemValue: 'id', itemGroup: 'cat' })
    await trigger(wrapper).trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    expect([...document.querySelectorAll('[role="option"]')].map(o => o.textContent?.trim()))
      .toEqual(['Alpha', 'Blast', 'Rune'])
  })
})
