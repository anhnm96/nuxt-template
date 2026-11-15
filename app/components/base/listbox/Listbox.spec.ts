import type { ListGroup } from '~/composables/useOptionList'
import { mount } from '@vue/test-utils'
import Select from '~/components/base/select/Select.vue'
import { DEFAULT_HEIGHTS, layoutRows, rowsBetween, toRowHeights } from './useVirtualRows'

const heights = { optionHeight: 30, groupHeight: 20 }

function group(label: string, first: number, count: number): ListGroup<number> {
  return {
    label,
    id: `grp-${label}`,
    options: Array.from({ length: count }, (_, i) => ({
      item: first + i,
      key: first + i,
      value: first + i,
      label: `Option ${first + i}`,
      disabled: false,
      id: `opt-${first + i}`,
      group: label,
    })),
  }
}

function keys(rows: ReturnType<typeof rowsBetween<number>>) {
  return rows.groups.map(row => row.options.map(option => option.key))
}

describe('virtual rows — layout', () => {
  it('uses the default heights for `true` and for a height that is not given', () => {
    expect(toRowHeights(undefined)).toBeUndefined()
    expect(toRowHeights(false)).toBeUndefined()
    expect(toRowHeights(true)).toEqual(DEFAULT_HEIGHTS)
    expect(toRowHeights({ optionHeight: 48 })).toEqual({ ...DEFAULT_HEIGHTS, optionHeight: 48 })
  })

  it('counts a label Row only for a Group that has a label', () => {
    const groups = [group('', 0, 3), group('A', 3, 2), group('B', 5, 4)]
    expect(layoutRows(groups, heights)).toEqual({
      offsets: [0, 3, 5],
      tops: [0, 90, 170],
      total: 310,
    })
  })

  it('gives the Options in a range and the height of the others', () => {
    const groups = [group('', 0, 100)]
    const rows = rowsBetween(groups, layoutRows(groups, heights), heights, 300, 390)
    expect(keys(rows)).toEqual([[10, 11, 12]])
    expect(rows.groups[0]).toMatchObject({ firstIndex: 10, start: 10, before: 300, after: 2610 })
    expect(rows).toMatchObject({ before: 0, after: 0 })
  })

  it('includes an Option that is in the range in part', () => {
    const groups = [group('', 0, 100)]
    const rows = rowsBetween(groups, layoutRows(groups, heights), heights, 315, 375)
    expect(keys(rows)).toEqual([[10, 11, 12]])
  })

  it('gives only the Groups in the range, each with its position in Visible Options', () => {
    // each Group is 20 + 10 * 30 = 320 high
    const groups = [group('A', 0, 10), group('B', 10, 10), group('C', 20, 10), group('D', 30, 10)]
    const layout = layoutRows(groups, heights)
    // from the last Option of B to the first Option of C
    const rows = rowsBetween(groups, layout, heights, 610, 690)
    expect(rows.groups.map(row => row.group.label)).toEqual(['B', 'C'])
    expect(keys(rows)).toEqual([[19], [20]])
    expect(rows.groups.map(row => row.firstIndex)).toEqual([19, 20])
    expect(rows.groups[0]).toMatchObject({ start: 9, before: 270, after: 0 })
    expect(rows.groups[1]).toMatchObject({ start: 0, before: 0, after: 270 })
    expect(rows).toMatchObject({ before: 320, after: 320 })
  })

  it('keeps the height of all Rows for every range', () => {
    const groups = [group('A', 0, 7), group('', 7, 13), group('C', 20, 30)]
    const layout = layoutRows(groups, heights)
    for (const from of [-100, 0, 215, 600, layout.total - 50]) {
      const rows = rowsBetween(groups, layout, heights, from, from + 250)
      const rendered = rows.groups.reduce((sum, row) =>
        sum + (row.group.label ? heights.groupHeight : 0) + row.before + row.options.length * heights.optionHeight + row.after, 0)
      expect(rows.before + rendered + rows.after).toBe(layout.total)
    }
  })

  it('gives no Rows for an empty list', () => {
    expect(rowsBetween([], layoutRows([], heights), heights, 0, 100)).toEqual({ groups: [], before: 0, after: 0 })
  })
})

/** Registered by a Nuxt plugin that unit mounts never run. */
const clickOutside = {}

const items = Array.from({ length: 1000 }, (_, i) => ({ id: `i${i}`, name: `Item ${i}`, cat: `Cat ${Math.floor(i / 100)}` }))

function mountSelect(props: Record<string, any> = {}) {
  const host = document.createElement('div')
  host.className = 'popovers'
  document.body.appendChild(host)
  return mount(Select, {
    props: { items, itemLabel: 'name', itemValue: 'id', ...props },
    attachTo: document.body,
    global: { directives: { clickOutside } },
  })
}

async function open(wrapper: ReturnType<typeof mountSelect>) {
  const trigger = wrapper.get('[data-slot="select-trigger"]')
  await trigger.trigger('keydown', { key: 'ArrowDown' })
  await nextTick()
  await nextTick()
  return trigger
}

function options() {
  return [...document.querySelectorAll('[role="option"]')]
}

describe('listbox — virtual', () => {
  beforeEach(() => {
    // the test DOM has no layout
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(256)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    document.querySelectorAll('.popovers').forEach(n => n.remove())
  })

  it('renders every Option when `virtual` is not set', async () => {
    await open(mountSelect())
    expect(options()).toHaveLength(1000)
    const listbox = document.querySelector('[data-slot="listbox"]')!
    expect(listbox.hasAttribute('data-virtual')).toBe(false)
    expect(options()[0]!.hasAttribute('aria-setsize')).toBe(false)
  })

  it('renders only the Rows near the view', async () => {
    await open(mountSelect({ virtual: true }))
    expect(document.querySelector('[data-slot="listbox"]')!.hasAttribute('data-virtual')).toBe(true)
    // 256 / 32 Rows in view, and 4 after them
    expect(options()).toHaveLength(12)
    expect(options()[0]!.getAttribute('style')).toContain('height: 32px')
    expect(options()[0]!.getAttribute('aria-posinset')).toBe('1')
    expect(options()[0]!.getAttribute('aria-setsize')).toBe('1000')
  })

  it('scrolls to an Active Option that is not rendered', async () => {
    const wrapper = mountSelect({ virtual: true })
    const trigger = await open(wrapper)
    await trigger.trigger('keydown', { key: 'End' })
    await nextTick()
    await nextTick()

    const listbox = document.querySelector('[data-slot="listbox"]')!
    // 1000 Rows of 32, less the 256 of the view
    expect(listbox.scrollTop).toBe(31744)
    const active = document.getElementById(trigger.attributes('aria-activedescendant')!)!
    expect(active.textContent?.trim()).toBe('Item 999')
    expect(active.getAttribute('aria-posinset')).toBe('1000')
  })

  it('renders the Rows at the offset of the list after the list changes length', async () => {
    const wrapper = mountSelect({ virtual: true, searchable: true })
    await open(wrapper)
    const search = document.querySelector<HTMLInputElement>('[data-slot="select-search"] input')!
    search.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
    await nextTick()
    await nextTick()
    const listbox = document.querySelector('[data-slot="listbox"]')!
    expect(listbox.scrollTop).toBe(31744)

    // 19 Options are left, which is less than the old offset
    search.value = '99'
    search.dispatchEvent(new Event('input'))
    await nextTick()
    await nextTick()
    // the Active Option is still in the list, so the list shows its end
    expect(options().at(-1)!.textContent?.trim()).toBe('Item 999')

    // an offset that the engine did not set, with no `scroll` event
    listbox.scrollTop = 0
    search.value = ''
    search.dispatchEvent(new Event('input'))
    await nextTick()
    await nextTick()
    expect(options()[0]!.textContent?.trim()).toBe('Item 0')
    expect(options()).toHaveLength(12)
  })

  it('scrolls an Option out from under the sticky label of its Group', async () => {
    // the test DOM reports no padding, and the label is one padding below the edge
    const realStyle = window.getComputedStyle
    vi.spyOn(window, 'getComputedStyle').mockImplementation(el => new Proxy(realStyle(el), {
      get(style, key) {
        if (key === 'paddingTop' || key === 'paddingBottom') return '4px'
        const value = Reflect.get(style, key)
        return typeof value === 'function' ? value.bind(style) : value
      },
    }))
    const wrapper = mountSelect({ virtual: true, itemGroup: 'cat', modelValue: 'i250' })
    await open(wrapper)
    const listbox = document.querySelector('[data-slot="listbox"]')!
    // Option 250 is Row 50 of the third Group: 2 * 3228 + 28 + 50 * 32
    const top = 8084
    // the Option starts 2px above the lower edge of the label, which is less than the padding
    listbox.scrollTop = top - 28 + 2
    const trigger = wrapper.get('[data-slot="select-trigger"]')
    await trigger.trigger('keydown', { key: 'ArrowDown' })
    await trigger.trigger('keydown', { key: 'ArrowUp' })
    await nextTick()
    await nextTick()
    expect(listbox.scrollTop).toBe(top - 28)
  })

  it('opens at the Selected Option', async () => {
    await open(mountSelect({ virtual: true, modelValue: 'i500' }))
    const selected = document.querySelector('[role="option"][aria-selected="true"]')!
    expect(selected.textContent?.trim()).toBe('Item 500')
    // the Option is at the end of the view
    expect(document.querySelector('[data-slot="listbox"]')!.scrollTop).toBe(501 * 32 - 256)
  })

  it('counts an Option within its Group, and takes the height of the Option from the prop', async () => {
    const wrapper = mountSelect({ virtual: { optionHeight: 40 }, itemGroup: 'cat', modelValue: 'i250' })
    await open(wrapper)
    const selected = document.querySelector('[role="option"][aria-selected="true"]')!
    expect(selected.getAttribute('aria-posinset')).toBe('51')
    expect(selected.getAttribute('aria-setsize')).toBe('100')
    expect(selected.getAttribute('style')).toContain('height: 40px')
    // the label of the Group is rendered and names it, also when it is far from the view
    const group = selected.closest('[role="group"]')!
    expect(document.getElementById(group.getAttribute('aria-labelledby')!)?.textContent?.trim()).toBe('Cat 2')
  })
})
