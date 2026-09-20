import { mount } from '@vue/test-utils'
import Select from './Select.vue'

/** Registered by a Nuxt plugin that unit mounts never run. */
const clickOutside = {}

interface Row { id: string, name: string, cat?: string }

/** Deliberately unclustered, so group ordering is actually exercised. */
const rows: Row[] = [
  { id: 'a1', name: 'Alpha', cat: 'Action' },
  { id: 'r1', name: 'Rune', cat: 'RPG' },
  { id: 'a2', name: 'Blast', cat: 'Action' },
  { id: 'u1', name: 'Loose' },
  { id: 'r2', name: 'Spell', cat: 'RPG' },
]

function mountGrouped(props: Record<string, any> = {}) {
  const host = document.createElement('div')
  host.className = 'popovers'
  document.body.appendChild(host)
  return mount(Select, {
    props: { items: rows, itemLabel: 'name', itemValue: 'id', itemGroup: 'cat', ...props },
    attachTo: document.body,
    global: { directives: { clickOutside } },
  })
}

function trigger(wrapper: ReturnType<typeof mountGrouped>) {
  return wrapper.get('[data-slot="select-trigger"]')
}

function optionLabels() {
  return [...document.querySelectorAll('[role="option"]')].map(o => o.textContent?.trim())
}

function groupLabels() {
  return [...document.querySelectorAll('[role="group"]')].map((g) => {
    const id = g.getAttribute('aria-labelledby')
    return id ? document.getElementById(id)?.textContent?.trim() : undefined
  })
}

function activeLabel(triggerEl: Element) {
  const id = triggerEl.getAttribute('aria-activedescendant')
  return id ? document.getElementById(id)?.textContent?.trim() : undefined
}

afterEach(() => {
  document.querySelectorAll('.popovers').forEach(n => n.remove())
})

describe('select — groups', () => {
  it('orders groups by first appearance and keeps item order within them', async () => {
    const wrapper = mountGrouped()
    await trigger(wrapper).trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    expect(groupLabels()).toEqual(['Action', 'RPG'])
    // Ungrouped rows form a group with an empty label, placed by first appearance too.
    expect(optionLabels()).toEqual(['Alpha', 'Blast', 'Rune', 'Spell', 'Loose'])
  })

  it('renders ungrouped options without a header', async () => {
    const wrapper = mountGrouped()
    await trigger(wrapper).trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    // Two real groups, five options — the fifth has no header.
    expect(document.querySelectorAll('[data-slot="group-label"]')).toHaveLength(2)
    expect(optionLabels()).toHaveLength(5)
  })

  it('labels each group with an aria-hidden header so it is announced once', async () => {
    const wrapper = mountGrouped()
    await trigger(wrapper).trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    const group = document.querySelector('[role="group"]')!
    const label = document.getElementById(group.getAttribute('aria-labelledby')!)!
    expect(label.getAttribute('aria-hidden')).toBe('true')
    // Options must be direct children of the group, not wrapped in filler elements.
    expect([...group.children].filter(c => c.getAttribute('role') === 'option')).toHaveLength(2)
  })

  it('drops a group entirely when filtering removes all of its options', async () => {
    const wrapper = mountGrouped({ searchable: true })
    // 'r' matches only Rune, so the Action and ungrouped groups must vanish entirely
    await trigger(wrapper).trigger('keydown', { key: 'r' })
    await nextTick()
    expect(optionLabels()).toEqual(['Rune'])
    expect(groupLabels()).toEqual(['RPG'])
    expect(document.querySelectorAll('[data-slot="group-label"]')).toHaveLength(1)
  })

  it('navigates across group boundaries in visual order, never onto a header', async () => {
    const wrapper = mountGrouped()
    const el = trigger(wrapper)
    await el.trigger('keydown', { key: 'ArrowDown' })
    const seen = [activeLabel(el.element)]
    for (let i = 0; i < 4; i++) {
      await el.trigger('keydown', { key: 'ArrowDown' })
      seen.push(activeLabel(el.element))
    }
    await nextTick()
    expect(seen).toEqual(['Alpha', 'Blast', 'Rune', 'Spell', 'Loose'])
  })
})

describe('select — nested items', () => {
  interface Game { id: string, name: string }
  interface Category { title: string, games: Game[] }

  const categories: Category[] = [
    { title: 'Consoles', games: [{ id: 'c1', name: 'Switch Party' }, { id: 'c2', name: 'Pad Master' }] },
    { title: 'Handhelds', games: [{ id: 'h1', name: 'Pocket Quest' }] },
  ]

  function mountNested(props: Record<string, any> = {}) {
    const host = document.createElement('div')
    host.className = 'popovers'
    document.body.appendChild(host)
    return mount(Select, {
      props: {
        items: categories,
        itemChildren: 'games',
        itemGroup: 'title',
        itemLabel: 'name',
        itemValue: 'id',
        ...props,
      },
      attachTo: document.body,
      global: { directives: { clickOutside } },
    })
  }

  it('expands groups into options and labels each group', async () => {
    const wrapper = mountNested()
    await trigger(wrapper as any).trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    expect(groupLabels()).toEqual(['Consoles', 'Handhelds'])
    expect(optionLabels()).toEqual(['Switch Party', 'Pad Master', 'Pocket Quest'])
  })

  it('emits the child value, never the group', async () => {
    const wrapper = mountNested()
    const el = trigger(wrapper as any)
    await el.trigger('keydown', { key: 'ArrowDown' })
    await el.trigger('keydown', { key: 'Enter' })
    await nextTick()
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['c1'])
  })

  it('navigates across group boundaries as one flat list', async () => {
    const wrapper = mountNested()
    const el = trigger(wrapper as any)
    await el.trigger('keydown', { key: 'ArrowDown' }) // open (End is ignored while closed)
    await el.trigger('keydown', { key: 'ArrowDown' })
    await el.trigger('keydown', { key: 'ArrowDown' }) // crosses from Consoles into Handhelds
    await nextTick()
    expect(activeLabel(el.element)).toBe('Pocket Quest')
  })

  it('drops a group whose options all filter out', async () => {
    const wrapper = mountNested({ searchable: true })
    await trigger(wrapper as any).trigger('keydown', { key: 'q' })
    await nextTick()
    expect(optionLabels()).toEqual(['Pocket Quest'])
    expect(groupLabels()).toEqual(['Handhelds'])
  })

  it('produces the same result as the equivalent pre-flattened input', async () => {
    const flat = [
      { id: 'c1', name: 'Switch Party', cat: 'Consoles' },
      { id: 'c2', name: 'Pad Master', cat: 'Consoles' },
      { id: 'h1', name: 'Pocket Quest', cat: 'Handhelds' },
    ]
    const host = document.createElement('div')
    host.className = 'popovers'
    document.body.appendChild(host)
    const wrapper = mount(Select, {
      props: { items: flat, itemLabel: 'name', itemValue: 'id', itemGroup: 'cat' },
      attachTo: document.body,
      global: { directives: { clickOutside } },
    })
    await trigger(wrapper as any).trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    expect(groupLabels()).toEqual(['Consoles', 'Handhelds'])
    expect(optionLabels()).toEqual(['Switch Party', 'Pad Master', 'Pocket Quest'])
  })
})

describe('select — the DOM shape the group separator CSS depends on', () => {
  /**
   * `.select-list > *:not(:first-child) > .select-group-label` draws the divider between
   * consecutive groups. The obvious `.select-group-label:not(:first-child)` matched nothing,
   * because the label is always the first child of its own group wrapper — so the rule has
   * to read position off the wrapper. This pins that nesting.
   */
  it('makes every group label reachable by the wrapper-keyed selector', async () => {
    const wrapper = mountGrouped()
    await trigger(wrapper).trigger('keydown', { key: 'ArrowDown' })
    await nextTick()

    const labels = [...document.querySelectorAll('[data-slot="group-label"]')]
    expect(labels).toHaveLength(2)

    // The label is its wrapper's first child, which is why the old selector was dead.
    expect(labels.every(l => l.matches(':first-child'))).toBe(true)
    expect(labels.some(l => l.matches(':not(:first-child)'))).toBe(false)

    // Exactly one group follows another, so exactly one label takes the divider.
    const separated = labels.filter(l =>
      l.matches('.select-list > *:not(:first-child) > .select-group-label'))
    expect(separated).toHaveLength(1)
    expect(separated[0]!.textContent?.trim()).toBe('RPG')
  })
})
