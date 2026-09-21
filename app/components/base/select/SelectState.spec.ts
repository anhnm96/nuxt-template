import { mount } from '@vue/test-utils'
import Select from './Select.vue'

/** Registered by a Nuxt plugin that unit mounts never run. */
const clickOutside = {}

interface Game { gameId: string, gameName: string }

const games: Game[] = [
  { gameId: 'g1', gameName: 'Alpha Strike' },
  { gameId: 'g2', gameName: 'Battle Chasm' },
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

describe('select — blocked while loading', () => {
  it('refuses to open when loading with no items, and says so without disabling', async () => {
    const wrapper = mountSelect({ items: [], loading: true })
    const el = trigger(wrapper)
    await el.trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    expect(el.attributes('aria-expanded')).toBe('false')
    expect(el.attributes('aria-disabled')).toBe('true')
    expect(el.attributes('aria-busy')).toBe('true')
    // aria-disabled, never the native attribute — it must stay focusable so a keyboard
    // user can land on it and hear that it is not ready.
    expect(el.attributes('disabled')).toBeUndefined()
  })

  it('opens normally once items arrive', async () => {
    const wrapper = mountSelect({ items: [], loading: true })
    const el = trigger(wrapper)
    await wrapper.setProps({ items: games, loading: false })
    await el.trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    expect(el.attributes('aria-expanded')).toBe('true')
    expect(el.attributes('aria-disabled')).toBeUndefined()
  })

  it('still opens while loading if there are stale items worth showing', async () => {
    const wrapper = mountSelect({ loading: true })
    const el = trigger(wrapper)
    await el.trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    expect(el.attributes('aria-expanded')).toBe('true')
  })
})

describe('select — clearing', () => {
  it('clears on Delete while closed', async () => {
    const wrapper = mountSelect({ modelValue: 'g2', clearable: true })
    await trigger(wrapper).trigger('keydown', { key: 'Delete' })
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([null])
  })

  it('does not clear on Backspace while open — there it belongs to the query', async () => {
    const wrapper = mountSelect({ modelValue: 'g2', clearable: true, searchable: true })
    const el = trigger(wrapper)
    await el.trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    await el.trigger('keydown', { key: 'Backspace' })
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('ignores Delete when there is nothing to clear', async () => {
    const wrapper = mountSelect({ clearable: true })
    await trigger(wrapper).trigger('keydown', { key: 'Delete' })
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})

describe('select — selected vs active are distinct signals', () => {
  it('marks Selected with a tick and Active with data-active, never the same signal', async () => {
    const wrapper = mountSelect({ modelValue: 'g1' })
    const el = trigger(wrapper)
    await el.trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    const options = [...document.querySelectorAll('[role="option"]')]
    const selected = options.find(o => o.getAttribute('aria-selected') === 'true')!
    expect(selected.querySelector('[class*="select-option-check"] svg, [class*="select-option-check"] *')).toBeTruthy()

    // move the keyboard off the selected row: the two states must now sit on different rows
    await el.trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    const after = [...document.querySelectorAll('[role="option"]')]
    const sel = after.find(o => o.getAttribute('aria-selected') === 'true')!
    const act = after.find(o => o.hasAttribute('data-active'))!
    expect(sel).not.toBe(act)
    expect(sel.hasAttribute('data-active')).toBe(false)
  })

  it('does not reuse .list-select-item, whose aria-selected rule paints hover colour', async () => {
    const wrapper = mountSelect()
    await trigger(wrapper).trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    const option = document.querySelector('[role="option"]')!
    expect(option.className).toContain('select-option')
    expect(option.className).not.toContain('list-select-item')
  })

  it('reserves the tick slot on unselected options so selecting never shifts labels', async () => {
    const wrapper = mountSelect()
    await trigger(wrapper).trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    const options = [...document.querySelectorAll('[role="option"]')]
    // every option has the slot, selected or not
    expect(options.every(o => o.querySelector('[class*="select-option-check"]'))).toBe(true)
  })
})

describe('select — clear button is out of the Tab order', () => {
  it('keeps the button in the a11y tree but not in Tab order, and advertises the shortcut', () => {
    const wrapper = mountSelect({ modelValue: 'g1', clearable: true })
    const clear = wrapper.get('[data-slot="clear"]')
    expect(clear.attributes('tabindex')).toBe('-1')
    expect(clear.attributes('aria-label')).toBe('Clear selection')
    expect(clear.attributes('title')).toContain('Delete')
    // the shortcut is the only keyboard path now, so it has to be announced
    expect(trigger(wrapper).attributes('aria-keyshortcuts')).toBe('Delete')
  })

  it('does not advertise the shortcut when there is nothing to clear', () => {
    const wrapper = mountSelect({ clearable: true })
    expect(trigger(wrapper).attributes('aria-keyshortcuts')).toBeUndefined()
  })
})

describe('select — review regressions', () => {
  it('positions on the selected option when opened by click, not just by keyboard', async () => {
    // A mouse click reaches Dropdown directly and never calls `useSelect.open()`, so the
    // Active Option has to be established by the isOpen watcher instead.
    const wrapper = mountSelect({ modelValue: 'g2' })
    const el = trigger(wrapper)
    // Dropdown renders its trigger through `Slot`, so its click handler is merged onto this
    // very button rather than onto a wrapper. It still flips `open` without ever going
    // through `useSelect.open()`, which is the path under test.
    await el.trigger('click')
    await nextTick()
    const id = el.attributes('aria-activedescendant')
    expect(id).toBeTruthy()
    expect(document.getElementById(id!)?.textContent?.trim()).toBe('Battle Chasm')
  })

  it('keeps the combobox aria when Dropdown merges its own onto the trigger', () => {
    // Dropdown contributes `aria-haspopup="true"` through `Slot`. SelectControl spreads
    // `{ ...triggerAttrs, ...triggerAria }` in that order so the combobox values win; swap
    // the two and a screen reader is told the popup is a menu, with nothing else failing.
    const wrapper = mountSelect()
    const el = trigger(wrapper)
    expect(el.attributes('role')).toBe('combobox')
    expect(el.attributes('aria-haspopup')).toBe('listbox')
    expect(el.attributes('data-slot')).toBe('select-trigger')
  })

  it('leaves no query behind when a printable key is refused', async () => {
    // loading + no items => open() refuses. Seeding the query anyway would survive until
    // the next close and silently filter the list the first time it genuinely opens.
    const wrapper = mountSelect({ items: [], loading: true, searchable: true })
    const el = trigger(wrapper)
    await el.trigger('keydown', { key: 'p' })
    await nextTick()
    expect(el.attributes('aria-expanded')).toBe('false')

    await wrapper.setProps({ items: games, loading: false })
    await el.trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    // every option still visible: a stale 'p' would have narrowed this to Alpha Strike
    expect(document.querySelectorAll('[role="option"]')).toHaveLength(games.length)
  })

  it('gives every option a unique id even when the Key is not primitive', async () => {
    // whole-Item mode with `itemKey` omitted: the Key is the item object, which used to
    // stringify to the same DOM id for every row and break aria-activedescendant.
    const host = document.createElement('div')
    host.className = 'popovers'
    document.body.appendChild(host)
    const wrapper = mount(Select, {
      props: { items: games, itemLabel: 'gameName' },
      attachTo: document.body,
      global: { directives: { clickOutside } },
    })
    const el = wrapper.get('[data-slot="select-trigger"]')
    await el.trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    const ids = [...document.querySelectorAll('[role="option"]')].map(o => o.id)
    expect(ids).toHaveLength(games.length)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('select — review regressions, round 2', () => {
  it('reports selections whose Items have not arrived instead of joining only the resolved ones', async () => {
    // The form would submit two values while the trigger claimed one.
    const wrapper = mountSelect({ multiple: true, modelValue: ['g1', 'g99'] })
    // No space in textContent: the gap is the trigger's flex `gap-1`, not a character.
    expect(trigger(wrapper).text()).toBe('Alpha Strike+1')

    // Once the missing Item arrives the affix has to go away on its own.
    await wrapper.setProps({ items: [...games, { gameId: 'g99', gameName: 'Zenith Run' }] })
    expect(trigger(wrapper).text()).toBe('Alpha Strike, Zenith Run')
  })

  it('does not count a Value the parent passed twice as unresolved', () => {
    const wrapper = mountSelect({ multiple: true, modelValue: ['g1', 'g1'] })
    expect(trigger(wrapper).text()).toBe('Alpha Strike')
  })

  it('does not render a negative affix when two Items share a Key', () => {
    // Duplicate rows are ordinary API data. `selectedKeys` is a Set (1) but `selectedOptions`
    // matches both rows (2), so the raw subtraction was -1 — and `v-if` treats -1 as truthy.
    const wrapper = mountSelect({
      multiple: true,
      modelValue: ['g1'],
      items: [games[0], games[0], games[1]],
    })
    expect(trigger(wrapper).text()).toBe('Alpha Strike, Alpha Strike')
  })

  it('still falls through to the placeholder when nothing resolves at all', () => {
    const wrapper = mountSelect({ multiple: true, modelValue: ['g98', 'g99'] })
    // Not '+2': with no resolved label to qualify, a bare count says nothing useful.
    expect(trigger(wrapper).text()).toBe('Select options')
  })

  it('drops aria-controls when the listbox is swapped out for the spinner', async () => {
    // Dropdown only gates *opening*, so a refetch that empties `items` leaves the popover
    // up while SelectPopup replaces the listbox — the id would resolve to nothing.
    const wrapper = mountSelect()
    const el = trigger(wrapper)
    await el.trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    const listboxId = el.attributes('aria-controls')!
    expect(document.getElementById(listboxId)).toBeTruthy()

    await wrapper.setProps({ items: [], loading: true })
    await nextTick()
    expect(el.attributes('aria-expanded')).toBe('true')
    expect(document.getElementById(listboxId)).toBeNull()
    expect(el.attributes('aria-controls')).toBeUndefined()
  })
})

describe('select — custom #search slot', () => {
  const customSearch = `
    <template #search="{ query }">
      <input data-testid="custom-search" class="custom" :value="query.value">
    </template>
  `

  function mountWithCustomSearch() {
    const host = document.createElement('div')
    host.className = 'popovers'
    document.body.appendChild(host)
    return mount(Select, {
      props: { items: games, itemLabel: 'gameName', itemValue: 'gameId', searchable: true },
      slots: { search: customSearch },
      attachTo: document.body,
      global: { directives: { clickOutside } },
    })
  }

  it('focuses a consumer-supplied field, not just the default one', async () => {
    const wrapper = mountWithCustomSearch()
    await trigger(wrapper).trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    const custom = document.querySelector('[data-testid="custom-search"]')
    expect(custom).toBeTruthy()
    // Without this, focus stays on the trigger and typing goes nowhere: printable keys are
    // ignored by handleOpenKeydown while `searchable`.
    expect(document.activeElement).toBe(custom)
  })

  it('navigates from a custom field without the consumer wiring keydown', async () => {
    const wrapper = mountWithCustomSearch()
    await trigger(wrapper).trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    const custom = document.querySelector('[data-testid="custom-search"]')!
    // The slot template never binds @keydown; the container handler catches the bubble.
    custom.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }))
    await nextTick()
    expect(document.querySelector('[role="option"][data-active]')?.textContent?.trim()).toBe('Battle Chasm')
  })

  it('does not double-handle keydown from the default field', async () => {
    // Needs 3+ options: with only two, one move and two moves both clamp to the last row
    // and the assertion cannot tell single from double handling.
    const wrapper = mountSelect({
      searchable: true,
      items: [...games, { gameId: 'g3', gameName: 'Cobalt Drift' }],
    })
    await trigger(wrapper).trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    const field = document.querySelector('[data-slot="select-search"] input')!
    // One ArrowDown must advance exactly one option, not two.
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }))
    await nextTick()
    expect(document.querySelector('[role="option"][data-active]')?.textContent?.trim()).toBe('Battle Chasm')
  })
})
