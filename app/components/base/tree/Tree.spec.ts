import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import Tree from './Tree.vue'

interface Entry {
  id: string
  label: string
  children?: Entry[]
  disabled?: boolean
}

/**
 * Two Parent Nodes have the Label `2000s`. They are different Nodes because their Keys differ.
 * `2010s` is an empty Parent Node.
 */
function makeItems(): Entry[] {
  return [
    {
      id: 'movies',
      label: 'Movies',
      children: [
        {
          id: 'action',
          label: 'Action',
          children: [
            { id: 'action-2000s', label: '2000s', children: [{ id: 'gladiator', label: 'Gladiator' }] },
            { id: 'action-2010s', label: '2010s', children: [] },
          ],
        },
        { id: 'comedy', label: 'Comedy', disabled: true, children: [{ id: 'superbad', label: 'Superbad' }] },
      ],
    },
    { id: 'music', label: 'Music', children: [{ id: 'rock', label: 'Rock' }] },
    { id: 'passwords', label: 'passwords.txt' },
  ]
}

/** Roving focus lives in the DOM, so each test attaches its mount and unmounts it after. */
const mounted: { unmount: () => void }[] = []

afterEach(() => {
  while (mounted.length) mounted.pop()!.unmount()
  document.body.innerHTML = ''
})

interface HostOptions {
  props?: Record<string, any>
  /** Binds `v-model` with this initial value. Omit for a Tree with no model. */
  model?: unknown
  expanded?: Key[]
  slots?: Record<string, (props: any) => any>
}

function mountTree(options: HostOptions = {}) {
  const model = ref(options.model)
  const expanded = ref<Key[]>(options.expanded ?? [])
  const hasModel = 'model' in options
  // One array for every render, as the README asks: a new array builds every Node again.
  const items = makeItems()
  const wrapper = mount(defineComponent({
    render: () => h(Tree as any, {
      'aria-label': 'Library',
      'items': items,
      'itemKey': 'id',
      'itemDisabled': 'disabled',
      'expanded': expanded.value,
      'onUpdate:expanded': (value: Key[]) => {
        expanded.value = value
      },
      ...(hasModel && {
        'modelValue': model.value,
        'onUpdate:modelValue': (value: unknown) => {
          model.value = value
        },
      }),
      ...options.props,
    }, options.slots),
  }), { attachTo: document.body })
  mounted.push(wrapper)
  return { wrapper, model, expanded }
}

function rows() {
  return [...document.querySelectorAll<HTMLElement>('[role="treeitem"]')]
}

function row(label: string, index = 0) {
  const found = rows().filter(el => el.querySelector('[data-slot="tree-label"]')?.textContent?.trim() === label)
  if (!found[index]) throw new Error(`No row "${label}" #${index}`)
  return found[index]
}

function labels() {
  return rows().map(el => el.querySelector('[data-slot="tree-label"]')?.textContent?.trim())
}

function focusedLabel() {
  const active = document.activeElement as HTMLElement | null
  return active?.getAttribute('role') === 'treeitem'
    ? active.querySelector('[data-slot="tree-label"]')?.textContent?.trim()
    : undefined
}

async function press(key: string) {
  ;(document.activeElement as HTMLElement).dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
  )
  await nextTick()
  await nextTick()
}

async function focusRow(label: string) {
  row(label).focus()
  await nextTick()
}

describe('Tree — structure', () => {
  it('starts collapsed and shows only the root Nodes', () => {
    mountTree()
    expect(labels()).toEqual(['Movies', 'Music', 'passwords.txt'])
  })

  it('sets the ARIA tree attributes on each row', () => {
    mountTree({ expanded: ['movies', 'action'] })
    expect(document.querySelector('[role="tree"]')!.getAttribute('aria-label')).toBe('Library')
    const action = row('Action')
    expect(action.getAttribute('aria-level')).toBe('2')
    expect(action.getAttribute('aria-posinset')).toBe('1')
    expect(action.getAttribute('aria-setsize')).toBe('2')
    expect(action.getAttribute('aria-expanded')).toBe('true')
    expect(row('passwords.txt').hasAttribute('aria-expanded')).toBe(false)
  })

  it('treats an empty children array as a Parent Node', () => {
    mountTree({ expanded: ['movies', 'action'] })
    expect(row('2010s').getAttribute('aria-expanded')).toBe('false')
  })

  it('keeps two Nodes with the same Label apart by Key', async () => {
    const { expanded } = mountTree({ expanded: ['movies', 'action'] })
    row('2000s').click()
    await nextTick()
    expect(expanded.value).toContain('action-2000s')
    expect(labels()).toContain('Gladiator')
  })

  it('has one tab stop, on the first Node by default', () => {
    mountTree()
    expect(rows().filter(el => el.tabIndex === 0).map(el => el.textContent?.trim())).toEqual(['Movies'])
  })
})

describe('Tree — expansion', () => {
  it('toggles a Parent Node on a click on its row when it is not bound', async () => {
    mountTree()
    row('Music').click()
    await nextTick()
    expect(labels()).toEqual(['Movies', 'Music', 'Rock', 'passwords.txt'])
    row('Music').click()
    await nextTick()
    expect(labels()).toEqual(['Movies', 'Music', 'passwords.txt'])
  })

  it('follows `expanded` from the parent', async () => {
    const { wrapper, expanded } = mountTree()
    expanded.value = ['music']
    await wrapper.vm.$nextTick()
    expect(labels()).toContain('Rock')
  })

  it('lets a disabled Parent Node expand', async () => {
    mountTree({ expanded: ['movies'] })
    row('Comedy').click()
    await nextTick()
    expect(labels()).toContain('Superbad')
  })
})

describe('Tree — keyboard', () => {
  it('moves over the Visible Nodes with Up, Down, Home and End', async () => {
    mountTree({ expanded: ['music'] })
    await focusRow('Movies')
    await press('ArrowDown')
    expect(focusedLabel()).toBe('Music')
    await press('ArrowDown')
    expect(focusedLabel()).toBe('Rock')
    await press('End')
    expect(focusedLabel()).toBe('passwords.txt')
    await press('ArrowDown')
    expect(focusedLabel()).toBe('passwords.txt')
    await press('Home')
    expect(focusedLabel()).toBe('Movies')
  })

  it('expands with Right, then moves to the first child', async () => {
    mountTree()
    await focusRow('Movies')
    await press('ArrowRight')
    expect(row('Movies').getAttribute('aria-expanded')).toBe('true')
    expect(focusedLabel()).toBe('Movies')
    await press('ArrowRight')
    expect(focusedLabel()).toBe('Action')
  })

  it('collapses with Left, then moves to the parent', async () => {
    mountTree({ expanded: ['movies', 'action'] })
    await focusRow('Action')
    await press('ArrowLeft')
    expect(row('Action').getAttribute('aria-expanded')).toBe('false')
    await press('ArrowLeft')
    expect(focusedLabel()).toBe('Movies')
  })

  it('does nothing on Right on a Leaf Node', async () => {
    mountTree()
    await focusRow('passwords.txt')
    await press('ArrowRight')
    expect(focusedLabel()).toBe('passwords.txt')
  })

  it('expands every sibling Parent Node with `*`', async () => {
    const { expanded } = mountTree()
    await focusRow('Movies')
    await press('*')
    expect(new Set(expanded.value)).toEqual(new Set(['movies', 'music']))
  })

  it('moves to the next Visible Node whose Label starts with a typed character', async () => {
    mountTree({ expanded: ['music'] })
    await focusRow('Movies')
    await press('r')
    expect(focusedLabel()).toBe('Rock')
  })

  it('leaves PageDown and PageUp to the browser', async () => {
    mountTree()
    await focusRow('Movies')
    const event = new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true, cancelable: true })
    document.activeElement!.dispatchEvent(event)
    await nextTick()
    expect(focusedLabel()).toBe('Movies')
    expect(event.defaultPrevented).toBe(false)
  })

  it('keeps a disabled Node focusable', async () => {
    mountTree({ expanded: ['movies'] })
    await focusRow('Action')
    await press('ArrowDown')
    expect(focusedLabel()).toBe('Comedy')
  })
})

describe('Tree — selection', () => {
  it('selects with Enter, and the arrow keys do not select', async () => {
    const { model } = mountTree({ model: null })
    await focusRow('Movies')
    await press('ArrowDown')
    expect(model.value).toBeNull()
    await press('Enter')
    expect(model.value).toEqual(expect.objectContaining({ id: 'music' }))
    expect(row('Music').getAttribute('aria-selected')).toBe('true')
    expect(row('Movies').getAttribute('aria-selected')).toBe('false')
  })

  it('selects and toggles a Parent Node on a click on its row', async () => {
    const { model, expanded } = mountTree({ model: null })
    row('Music').click()
    await nextTick()
    expect(model.value).toEqual(expect.objectContaining({ id: 'music' }))
    expect(expanded.value).toEqual(['music'])
  })

  it('only toggles on a click on the toggle', async () => {
    const { model, expanded } = mountTree({ model: null })
    row('Music').querySelector<HTMLElement>('[data-slot="tree-toggle"]')!.click()
    await nextTick()
    expect(model.value).toBeNull()
    expect(expanded.value).toEqual(['music'])
  })

  it('holds the `itemValue` of a Node when it is given', async () => {
    const { model } = mountTree({ model: null, props: { itemValue: 'id', itemKey: undefined } })
    row('passwords.txt').click()
    await nextTick()
    expect(model.value).toBe('passwords')
  })

  it('does not select a disabled Node', async () => {
    const { model } = mountTree({ model: null, expanded: ['movies'] })
    await focusRow('Comedy')
    await press('Enter')
    expect(model.value).toBeNull()
  })

  it('toggles each Node on its own when multiple', async () => {
    const { model } = mountTree({ model: [], props: { multiple: true }, expanded: ['music'] })
    row('Rock').click()
    await nextTick()
    row('passwords.txt').click()
    await nextTick()
    expect((model.value as Entry[]).map(e => e.id)).toEqual(['rock', 'passwords'])
    // The parent is not selected with its child.
    expect(row('Music').getAttribute('aria-selected')).toBe('false')
    row('Rock').click()
    await nextTick()
    expect((model.value as Entry[]).map(e => e.id)).toEqual(['passwords'])
    expect(document.querySelector('[role="tree"]')!.getAttribute('aria-multiselectable')).toBe('true')
  })

  it('casts a bare `multiple` attribute to true', async () => {
    const { model } = mountTree({ model: [], props: { multiple: '' } })
    row('passwords.txt').click()
    await nextTick()
    expect(Array.isArray(model.value)).toBe(true)
  })

  it('only toggles a Parent Node under `selectParents: false`', async () => {
    const { model, expanded } = mountTree({ model: null, props: { selectParents: false } })
    expect(row('Music').hasAttribute('aria-selected')).toBe(false)
    await focusRow('Music')
    await press('Enter')
    expect(model.value).toBeNull()
    expect(expanded.value).toEqual(['music'])
  })

  it('has no Selected Node and no `aria-selected` without a model', async () => {
    mountTree()
    expect(rows().some(el => el.hasAttribute('aria-selected'))).toBe(false)
  })
})

describe('Tree — focus', () => {
  it('puts the tab stop on the Selected Node', () => {
    mountTree({ model: { id: 'passwords' } })
    expect(row('passwords.txt').tabIndex).toBe(0)
    expect(row('Movies').tabIndex).toBe(-1)
  })

  it('puts the tab stop on the nearest ancestor of a hidden Selected Node that is a Visible Node', () => {
    const { expanded } = mountTree({ model: { id: 'gladiator' }, expanded: ['movies'] })
    expect(row('Action').tabIndex).toBe(0)
    // The Tree does not expand anything by itself.
    expect(expanded.value).toEqual(['movies'])
  })

  it('skips a Selected Node without a selection state for the tab stop', () => {
    // The model holds a Parent Node, which `selectParents: false` shows as not selected.
    mountTree({ model: [{ id: 'movies' }, { id: 'passwords' }], props: { multiple: true, selectParents: false } })
    expect(row('passwords.txt').tabIndex).toBe(0)
    expect(row('Movies').tabIndex).toBe(-1)
  })

  it('moves focus to the parent when the parent of the Focused Node collapses', async () => {
    const { wrapper, expanded } = mountTree({ expanded: ['music'] })
    await focusRow('Rock')
    expanded.value = []
    await wrapper.vm.$nextTick()
    await nextTick()
    expect(focusedLabel()).toBe('Music')
  })

  it('takes no focus when the Tree is disabled', () => {
    mountTree({ props: { disabled: true } })
    // No `tabindex` at all, so a click does not focus a row either.
    expect(rows().every(el => !el.hasAttribute('tabindex'))).toBe(true)
  })
})

describe('Tree — rendering', () => {
  /** Counts how often each row calls its `item-label` slot, which runs when the row re-renders. */
  function mountCounting() {
    const calls: string[] = []
    mountTree({
      model: null,
      expanded: ['movies', 'action', 'music'],
      slots: {
        'item-label': ({ node }: any) => {
          calls.push(node.label)
          return node.label
        },
      },
    })
    return calls
  }

  it('re-renders only the two rows a focus move touches', async () => {
    const calls = mountCounting()
    await focusRow('Movies')
    calls.length = 0
    await press('ArrowDown')
    expect(calls.toSorted()).toEqual(['Action', 'Movies'])
  })

  it('re-renders only the row a selection touches', async () => {
    const calls = mountCounting()
    await focusRow('Rock')
    calls.length = 0
    await press('Enter')
    expect(calls).toEqual(['Rock'])
  })
})
