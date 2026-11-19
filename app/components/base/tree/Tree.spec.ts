import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, reactive, ref } from 'vue'
import { isApplePlatform, readModifiers } from '~/utils/modifiers'
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

// ------------------------------------------------------------------ selection gestures

/** Ctrl, or ⌘ on an Apple platform, as `readModifiers` reads it. */
function primaryKey(): KeyboardEventInit {
  return isApplePlatform() ? { metaKey: true } : { ctrlKey: true }
}

async function click(target: string | HTMLElement, init: MouseEventInit = {}) {
  const el = typeof target === 'string' ? row(target) : target
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ...init }))
  await nextTick()
  await nextTick()
}

async function pressWith(key: string, init: KeyboardEventInit) {
  ;(document.activeElement as HTMLElement).dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }),
  )
  await nextTick()
  await nextTick()
}

function ids(model: { value: unknown }) {
  return (model.value as Entry[]).map(e => e.id).toSorted()
}

describe('Tree — toggle Selection Behavior', () => {
  it('selects a Range on Shift+click, and does not expand', async () => {
    const { model, expanded } = mountTree({ model: [], props: { multiple: true }, expanded: ['music'] })
    await click('Rock')
    await click('Movies', { shiftKey: true })
    expect(ids(model)).toEqual(['movies', 'music', 'rock'])
    expect(expanded.value).toEqual(['music'])
  })

  it('gives the Range the new state of the target', async () => {
    const { model } = mountTree({ model: [{ id: 'movies' }, { id: 'music' }, { id: 'rock' }], props: { multiple: true }, expanded: ['music'] })
    // The click on Rock deselects it and makes it the Anchor Node.
    await click('Rock')
    // Movies is selected, so the click deselects it, and the whole Range with it.
    await click('Movies', { shiftKey: true })
    expect(ids(model)).toEqual([])
  })

  it('treats Shift+click as a click when there is no Anchor Node and no Focused Node', async () => {
    const { model } = mountTree({ model: [], props: { multiple: true } })
    await click('passwords.txt', { shiftKey: true })
    expect(ids(model)).toEqual(['passwords'])
  })

  it('leaves out of a Range the Nodes inside a collapsed Parent Node and the disabled Nodes', async () => {
    const { model } = mountTree({ model: [], props: { multiple: true }, expanded: ['movies'] })
    await click('Movies', primaryKey())
    await click('passwords.txt', { shiftKey: true })
    // Comedy is disabled, and Rock is inside the collapsed Music.
    expect(ids(model)).toEqual(['action', 'movies', 'music', 'passwords'])
  })

  it('gives the Nodes passed by Shift+Arrow the state of the Anchor Node, and the run does not shrink', async () => {
    const { model } = mountTree({ model: [], props: { multiple: true }, expanded: ['music'] })
    await focusRow('Movies')
    await press(' ')
    await pressWith('ArrowDown', { shiftKey: true })
    await pressWith('ArrowDown', { shiftKey: true })
    expect(ids(model)).toEqual(['movies', 'music', 'rock'])
    await pressWith('ArrowUp', { shiftKey: true })
    expect(ids(model)).toEqual(['movies', 'music', 'rock'])
  })

  it('gives the Range the new state of the Focused Node on Shift+Space', async () => {
    const { model } = mountTree({ model: [], props: { multiple: true }, expanded: ['music'] })
    await focusRow('Movies')
    await press(' ')
    await press('ArrowDown')
    await press('ArrowDown')
    await pressWith(' ', { shiftKey: true })
    expect(ids(model)).toEqual(['movies', 'music', 'rock'])
  })

  it('selects a Range to the last Node on Ctrl+Shift+End', async () => {
    const { model } = mountTree({ model: [], props: { multiple: true }, expanded: ['music'] })
    await focusRow('Music')
    await press(' ')
    await pressWith('End', { shiftKey: true, ...primaryKey() })
    expect(ids(model)).toEqual(['music', 'passwords', 'rock'])
  })

  it('moves focus only on the arrow keys', async () => {
    const { model } = mountTree({ model: [], props: { multiple: true } })
    await focusRow('Movies')
    await press('ArrowDown')
    expect(ids(model)).toEqual([])
  })
})

describe('Tree — replace Selection Behavior', () => {
  const props = { multiple: true, selectionBehavior: 'replace', expandOnClick: false }

  it('selects only the clicked Node, and Ctrl+click toggles one Node', async () => {
    const { model } = mountTree({ model: [{ id: 'music' }], props })
    await click('passwords.txt')
    expect(ids(model)).toEqual(['passwords'])
    await click('Movies', primaryKey())
    expect(ids(model)).toEqual(['movies', 'passwords'])
    await click('Movies', primaryKey())
    expect(ids(model)).toEqual(['passwords'])
  })

  it('replaces the selection with the Range on Shift+click, and adds it on Ctrl+Shift+click', async () => {
    const { model } = mountTree({ model: [], props, expanded: ['music'] })
    await click('Movies')
    await click('Music', { shiftKey: true })
    expect(ids(model)).toEqual(['movies', 'music'])
    await click('passwords.txt', primaryKey())
    await click('Rock', { shiftKey: true, ...primaryKey() })
    // The Anchor Node is passwords.txt now, from the Ctrl+click.
    expect(ids(model)).toEqual(['movies', 'music', 'passwords', 'rock'])
  })

  it('moves the selection with focus, and Ctrl+Arrow moves focus only', async () => {
    const { model } = mountTree({ model: [], props })
    await focusRow('Movies')
    await press('ArrowDown')
    expect(ids(model)).toEqual(['music'])
    await pressWith('ArrowDown', primaryKey())
    expect(ids(model)).toEqual(['music'])
    expect(focusedLabel()).toBe('passwords.txt')
  })

  it('makes the Range shrink on Shift+Arrow back towards the Anchor Node', async () => {
    const { model } = mountTree({ model: [], props })
    await focusRow('Movies')
    await press(' ')
    await pressWith('ArrowDown', { shiftKey: true })
    await pressWith('ArrowDown', { shiftKey: true })
    expect(ids(model)).toEqual(['movies', 'music', 'passwords'])
    await pressWith('ArrowUp', { shiftKey: true })
    expect(ids(model)).toEqual(['movies', 'music'])
  })

  it('keeps the selection when an arrow key moves focus to a Node that cannot be selected', async () => {
    const { model } = mountTree({ model: [], props, expanded: ['movies'] })
    await focusRow('Action')
    await press('ArrowUp')
    await press('ArrowDown')
    expect(ids(model)).toEqual(['action'])
    await press('ArrowDown')
    expect(focusedLabel()).toBe('Comedy')
    expect(ids(model)).toEqual(['action'])
  })

  it('moves the selection with focus in a single Tree', async () => {
    const { model } = mountTree({ model: null, props: { selectionBehavior: 'replace' } })
    await focusRow('Movies')
    await press('ArrowDown')
    expect(model.value).toEqual(expect.objectContaining({ id: 'music' }))
  })

  it('resolves a hidden Anchor Node to its nearest Visible ancestor', async () => {
    const { model, expanded, wrapper } = mountTree({ model: [], props, expanded: ['music'] })
    await click('Rock')
    expanded.value = []
    await wrapper.vm.$nextTick()
    await click('passwords.txt', { shiftKey: true })
    expect(ids(model)).toEqual(['music', 'passwords'])
  })
})

describe('Tree — clicks', () => {
  it('does not expand on a click when `expandOnClick` is off', async () => {
    const { model, expanded } = mountTree({ model: null, props: { expandOnClick: false } })
    await click('Music')
    expect(model.value).toEqual(expect.objectContaining({ id: 'music' }))
    expect(expanded.value).toEqual([])
  })

  it('expands a Node that cannot be selected even when `expandOnClick` is off', async () => {
    const { expanded } = mountTree({ model: null, props: { expandOnClick: false, selectParents: false } })
    await click('Music')
    expect(expanded.value).toEqual(['music'])
  })

  it('does not expand on a Ctrl+click', async () => {
    const { model, expanded } = mountTree({ model: [], props: { multiple: true } })
    await click('Music', primaryKey())
    expect(ids(model)).toEqual(['music'])
    expect(expanded.value).toEqual([])
  })

  it('emits `row-click` before the default, and `preventDefault` cancels it', async () => {
    const onRowClick = vi.fn(({ event }: { event: MouseEvent }) => event.preventDefault())
    const { model, expanded } = mountTree({ model: null, props: { onRowClick } })
    await click('Music')
    expect(onRowClick).toHaveBeenCalledWith(expect.objectContaining({ node: expect.objectContaining({ key: 'music' }) }))
    expect(model.value).toBeNull()
    expect(expanded.value).toEqual([])
  })

  it('emits `toggle-click`, and `preventDefault` cancels the expansion', async () => {
    const onToggleClick = vi.fn(({ event }: { event: MouseEvent }) => event.preventDefault())
    const { expanded } = mountTree({ props: { onToggleClick } })
    await click(row('Music').querySelector<HTMLElement>('[data-slot="tree-toggle"]')!)
    expect(onToggleClick).toHaveBeenCalledOnce()
    expect(expanded.value).toEqual([])
  })
})

describe('Tree — checkboxes', () => {
  function checkbox(label: string) {
    return row(label).querySelector<HTMLElement>('[data-slot="tree-checkbox"]')
  }

  it('shows a hidden checkbox that follows the selection', () => {
    mountTree({ model: [{ id: 'music' }], props: { multiple: true, checkboxes: true } })
    expect(checkbox('Music')!.getAttribute('aria-hidden')).toBe('true')
    expect(checkbox('Music')!.querySelector('input')!.checked).toBe(true)
    expect(checkbox('Movies')!.querySelector('input')!.checked).toBe(false)
  })

  it('selects on a click on the checkbox, and does not expand', async () => {
    const { model, expanded } = mountTree({ model: [], props: { multiple: true, checkboxes: true } })
    await click(checkbox('Music')!)
    expect(ids(model)).toEqual(['music'])
    expect(expanded.value).toEqual([])
  })

  it('leaves the checkbox empty on a Node without a selection state', () => {
    mountTree({ model: [], props: { multiple: true, checkboxes: true, selectParents: false } })
    expect(checkbox('Music')!.querySelector('input')).toBeNull()
    expect(checkbox('passwords.txt')!.querySelector('input')).not.toBeNull()
  })

  // The warning is behind `import.meta.dev`, which is false in the test build.
  it('shows no checkbox under `replace`', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    mountTree({ model: [], props: { multiple: true, checkboxes: true, selectionBehavior: 'replace' } })
    expect(checkbox('Music')).toBeNull()
  })

  it('renders the `item-checkbox` slot instead of the built-in checkbox', () => {
    mountTree({
      model: [{ id: 'music' }],
      props: { multiple: true, checkboxes: true },
      slots: { 'item-checkbox': ({ selected }: any) => h('span', selected ? 'on' : 'off') },
    })
    expect(checkbox('Music')!.textContent).toBe('on')
  })
})

describe('Tree — slot actions', () => {
  /** A button in `item-trailing` that calls one slot action. It stops the click, so the row does not see it. */
  function actionButton(action: 'toggleSelected' | 'toggleExpanded') {
    return {
      'item-trailing': (slotProps: any) => h('button', {
        'data-action': slotProps.node.key,
        'onClick': (event: Event) => {
          event.stopPropagation()
          slotProps[action]()
        },
      }),
    }
  }

  function actionOf(key: string) {
    return document.querySelector<HTMLElement>(`[data-action="${key}"]`)!
  }

  it('toggles one Node from `toggleSelected`, under replace too', async () => {
    const { model } = mountTree({
      model: [{ id: 'passwords' }],
      props: { multiple: true, selectionBehavior: 'replace' },
      slots: actionButton('toggleSelected'),
    })
    actionOf('music').click()
    await nextTick()
    expect(ids(model)).toEqual(['music', 'passwords'])
  })

  it('expands from `toggleExpanded`', async () => {
    const { expanded } = mountTree({ slots: actionButton('toggleExpanded') })
    actionOf('music').click()
    await nextTick()
    expect(expanded.value).toEqual(['music'])
  })
})

describe('Tree — Range edges', () => {
  it('makes a Range on Shift+End when focus is already on the last Node', async () => {
    const { model } = mountTree({ model: [], props: { multiple: true, selectionBehavior: 'replace' } })
    await focusRow('Movies')
    await press(' ')
    await pressWith('ArrowDown', primaryKey())
    await pressWith('ArrowDown', primaryKey())
    expect(focusedLabel()).toBe('passwords.txt')
    expect(ids(model)).toEqual(['movies'])
    await pressWith('End', { shiftKey: true })
    expect(ids(model)).toEqual(['movies', 'music', 'passwords'])
  })

  it('keeps the selection when a Range has no Node that can be selected', async () => {
    const { model } = mountTree({
      model: [{ id: 'rock' }],
      props: { multiple: true, selectionBehavior: 'replace', selectParents: false },
      expanded: ['movies'],
    })
    await focusRow('Movies')
    // Movies and Action are both Parent Nodes, which cannot be selected here.
    await pressWith('ArrowDown', { shiftKey: true })
    expect(focusedLabel()).toBe('Action')
    expect(ids(model)).toEqual(['rock'])
  })

  it('selects on a Shift+Arrow walk from an Anchor Node without a selection state', async () => {
    const { model } = mountTree({ model: [], props: { multiple: true, selectParents: false }, expanded: ['music'] })
    await focusRow('Music')
    await pressWith('ArrowDown', { shiftKey: true })
    expect(ids(model)).toEqual(['rock'])
  })

  it('does not extend a Range on Shift with a letter, which is Typeahead', async () => {
    const { model } = mountTree({ model: [], props: { multiple: true }, expanded: ['music'] })
    await focusRow('Movies')
    await press(' ')
    await pressWith('R', { shiftKey: true })
    expect(focusedLabel()).toBe('Rock')
    expect(ids(model)).toEqual(['movies'])
  })

  it('selects on a Shift+Arrow walk from a disabled Anchor Node', async () => {
    const { model } = mountTree({ model: [{ id: 'superbad' }], props: { multiple: true }, expanded: ['movies', 'comedy'] })
    await focusRow('Comedy')
    await pressWith('ArrowDown', { shiftKey: true })
    expect(ids(model)).toEqual(['superbad'])
  })

  it('keeps the selection on a plain arrow key that does not move focus under replace', async () => {
    const { model } = mountTree({ model: [{ id: 'movies' }, { id: 'passwords' }], props: { multiple: true, selectionBehavior: 'replace' } })
    await focusRow('passwords.txt')
    await press('ArrowDown')
    expect(focusedLabel()).toBe('passwords.txt')
    expect(ids(model)).toEqual(['movies', 'passwords'])
  })

  it('adds the Range on Ctrl+Shift+Arrow and Ctrl+Shift+Home under replace', async () => {
    const { model } = mountTree({ model: [], props: { multiple: true, selectionBehavior: 'replace' }, expanded: ['music'] })
    await focusRow('Movies')
    await press(' ')
    await pressWith('ArrowDown', primaryKey())
    await pressWith('ArrowDown', primaryKey())
    // Rock is a separate Selected Node, made with Ctrl. It is the Anchor Node now.
    await pressWith(' ', primaryKey())
    expect(ids(model)).toEqual(['movies', 'rock'])
    await pressWith('ArrowDown', { shiftKey: true, ...primaryKey() })
    expect(ids(model)).toEqual(['movies', 'passwords', 'rock'])
    await pressWith('Home', { shiftKey: true, ...primaryKey() })
    // From the Anchor Node, Rock, to the first Node. passwords.txt stays.
    expect(focusedLabel()).toBe('Movies')
    expect(ids(model)).toEqual(['movies', 'music', 'passwords', 'rock'])
  })

  it('adds the Range on Ctrl+Shift+Space under replace', async () => {
    const { model } = mountTree({ model: [], props: { multiple: true, selectionBehavior: 'replace' } })
    await focusRow('Movies')
    await press(' ')
    await pressWith('ArrowDown', primaryKey())
    await pressWith('ArrowDown', primaryKey())
    await pressWith(' ', primaryKey())
    await pressWith('ArrowUp', primaryKey())
    await pressWith(' ', { shiftKey: true, ...primaryKey() })
    expect(ids(model)).toEqual(['movies', 'music', 'passwords'])
  })

  it('treats Ctrl+Shift+Space as Shift+Space under toggle', async () => {
    const { model } = mountTree({ model: [], props: { multiple: true } })
    await focusRow('Movies')
    await press(' ')
    await press('ArrowDown')
    await press('ArrowDown')
    await pressWith(' ', { shiftKey: true, ...primaryKey() })
    expect(ids(model)).toEqual(['movies', 'music', 'passwords'])
  })

  it('keeps the Anchor Node when `items` is replaced by a new array with the same Keys', async () => {
    const props = reactive({ items: makeItems(), multiple: true, selectionBehavior: 'replace', expandOnClick: false })
    const { model } = mountTree({ model: [], props })
    await click('Movies')
    props.items = makeItems()
    await nextTick()
    await click('passwords.txt', { shiftKey: true })
    expect(ids(model)).toEqual(['movies', 'music', 'passwords'])
  })
})

describe('Tree — click origin', () => {
  function pointerdown(label: string) {
    row(label).dispatchEvent(new Event('pointerdown', { bubbles: true }))
  }

  it('uses the Focused Node at pointerdown as the Anchor Node of a Shift+click', async () => {
    const { model } = mountTree({ model: [], props: { multiple: true } })
    await focusRow('Movies')
    pointerdown('passwords.txt')
    // The browser moves focus to the row before `click`.
    await focusRow('passwords.txt')
    await click('passwords.txt', { shiftKey: true, detail: 1 })
    expect(ids(model)).toEqual(['movies', 'music', 'passwords'])
  })

  it('uses the Focused Node, not an older pointerdown, for a click from the keyboard', async () => {
    const { model } = mountTree({ model: [], props: { multiple: true } })
    await focusRow('Movies')
    // A pointerdown that ends without a click.
    pointerdown('Movies')
    await focusRow('Music')
    await click('passwords.txt', { shiftKey: true, detail: 0 })
    expect(ids(model)).toEqual(['music', 'passwords'])
  })

  it('forgets the pointer origin on pointercancel', async () => {
    const { model } = mountTree({ model: [], props: { multiple: true } })
    await focusRow('Movies')
    pointerdown('Music')
    row('Music').dispatchEvent(new Event('pointercancel', { bubbles: true }))
    // No Anchor Node and no origin: the Shift+click acts as a click.
    await click('passwords.txt', { shiftKey: true, detail: 1 })
    expect(ids(model)).toEqual(['passwords'])
  })

  it('does not emit `rowClick` for a click with the other platform modifier', async () => {
    const onRowClick = vi.fn()
    const { model } = mountTree({ model: [], props: { multiple: true, onRowClick } })
    await click('passwords.txt', isApplePlatform() ? { ctrlKey: true } : { metaKey: true })
    expect(onRowClick).not.toHaveBeenCalled()
    expect(ids(model)).toEqual([])
  })
})

describe('readModifiers', () => {
  function stubPlatform(platform: string) {
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue(platform)
  }

  it('reads ⌘ as the primary modifier and ignores Ctrl on an Apple platform', () => {
    stubPlatform('MacIntel')
    expect(readModifiers(new MouseEvent('click', { metaKey: true }))).toEqual({ shift: false, primary: true })
    expect(readModifiers(new MouseEvent('click', { ctrlKey: true }))).toBeNull()
  })

  it('reads Ctrl as the primary modifier and ignores ⌘ elsewhere', () => {
    stubPlatform('Win32')
    expect(readModifiers(new MouseEvent('click', { ctrlKey: true, shiftKey: true }))).toEqual({ shift: true, primary: true })
    expect(readModifiers(new MouseEvent('click', { metaKey: true }))).toBeNull()
  })

  // macOS keeps ⌘+Space for Spotlight, so ⌘+Enter is the key that toggles one Node there.
  it('toggles one Node on ⌘+Enter under replace on an Apple platform', async () => {
    stubPlatform('MacIntel')
    const { model } = mountTree({ model: [], props: { multiple: true, selectionBehavior: 'replace' } })
    await focusRow('Movies')
    await press(' ')
    await pressWith('ArrowDown', { metaKey: true })
    await pressWith('Enter', { metaKey: true })
    expect(ids(model)).toEqual(['movies', 'music'])
  })
})
