import type { TreeSelectionBehavior } from './useTreeSelection'
import { effectScope, ref } from 'vue'
import { useTree } from './useTree'
import { useTreeSelection } from './useTreeSelection'

interface Entry {
  id: string
  children?: Entry[]
  disabled?: boolean
}

/** a, b (Parent Node: b1, b2), c (disabled), d. */
const items: Entry[] = [
  { id: 'a' },
  { id: 'b', children: [{ id: 'b1' }, { id: 'b2' }] },
  { id: 'c', disabled: true },
  { id: 'd' },
]

const plain = { shift: false, primary: false }
const shift = { shift: true, primary: false }
const ctrl = { shift: false, primary: true }
const ctrlShift = { shift: true, primary: true }

interface SetupOptions {
  behavior?: TreeSelectionBehavior
  multiple?: boolean
  selected?: string[]
  expanded?: Key[]
  selectParents?: boolean
}

/** The rules without a mounted Tree, as DESIGN.md, "Selection gestures", intends. */
function setup(options: SetupOptions = {}) {
  const multiple = options.multiple ?? true
  const model = ref<unknown>(multiple ? (options.selected ?? []) : (options.selected?.[0] ?? null))
  const selectedValues = () => multiple
    ? model.value as unknown[]
    : model.value === null ? [] : [model.value]
  const scope = effectScope()
  const { tree, selection } = scope.run(() => {
    const tree = useTree<Entry>({
      items,
      accessors: { itemKey: 'id', itemValue: 'id', itemDisabled: 'disabled' },
      expanded: ref(options.expanded ?? ['b']),
      selectedValues,
      hasModel: true,
      selectParents: options.selectParents ?? true,
    })
    const selection = useTreeSelection<Entry>({
      tree,
      multiple,
      behavior: options.behavior ?? 'toggle',
      selectedValues,
      write: (value) => {
        model.value = value
      },
    })
    return { tree, selection }
  })!
  const node = (id: string) => tree.visibleNodes.value.find(n => n.key === id)!
  const selected = () => [...selectedValues()].map(String).toSorted()
  return { node, selection, selected, model, stop: () => scope.stop() }
}

describe('useTreeSelection — activate', () => {
  it('returns false and changes nothing for a Node that cannot be selected', () => {
    const { node, selection, selected } = setup({ selected: ['a'] })
    expect(selection.activate(node('c'), shift, node('a'))).toBe(false)
    expect(selected()).toEqual(['a'])
  })

  it('under toggle, gives the Range the new state of the target', () => {
    const { node, selection, selected } = setup()
    selection.activate(node('a'), plain, null)
    selection.activate(node('b2'), shift, null)
    // c is disabled and keeps its state.
    expect(selected()).toEqual(['a', 'b', 'b1', 'b2'])
  })

  it('under replace, replaces with the Range on Shift and adds it on Ctrl+Shift', () => {
    const { node, selection, selected } = setup({ behavior: 'replace' })
    selection.activate(node('a'), plain, null)
    selection.activate(node('b'), shift, null)
    expect(selected()).toEqual(['a', 'b'])
    selection.activate(node('d'), ctrl, null)
    // The Ctrl+click made d the Anchor Node, so the Range is b2, c and d. c is disabled.
    selection.activate(node('b2'), ctrlShift, null)
    expect(selected()).toEqual(['a', 'b', 'b2', 'd'])
  })

  it('uses `origin` as the Anchor Node when there is none', () => {
    const { node, selection, selected } = setup()
    selection.activate(node('b1'), shift, node('a'))
    expect(selected()).toEqual(['a', 'b', 'b1'])
  })
})

describe('useTreeSelection — followFocus', () => {
  it('does nothing without Shift when focus does not move', () => {
    const { node, selection, selected } = setup({ behavior: 'replace', selected: ['a', 'd'] })
    selection.followFocus(node('d'), node('d'), plain)
    expect(selected()).toEqual(['a', 'd'])
  })

  it('makes a Range with Shift when focus does not move', () => {
    const { node, selection, selected } = setup({ behavior: 'replace' })
    selection.activate(node('b1'), plain, null)
    selection.followFocus(node('d'), node('d'), shift)
    expect(selected()).toEqual(['b1', 'b2', 'd'])
  })

  it('under replace, keeps the selection when focus moves to a Node that cannot be selected', () => {
    const { node, selection, selected } = setup({ behavior: 'replace', selected: ['a'] })
    selection.followFocus(node('b2'), node('c'), plain)
    expect(selected()).toEqual(['a'])
  })

  it('under toggle, gives the passed Nodes the state of the Anchor Node', () => {
    const { node, selection, selected } = setup()
    selection.activate(node('a'), plain, null)
    selection.followFocus(node('a'), node('b'), shift)
    selection.followFocus(node('b'), node('b1'), shift)
    expect(selected()).toEqual(['a', 'b', 'b1'])
  })

  it('under toggle, selects on a walk from an Anchor Node that cannot be selected', () => {
    const { node, selection, selected } = setup({ selected: [] })
    selection.followFocus(node('c'), node('d'), shift)
    expect(selected()).toEqual(['d'])
  })

  it('in a single Tree under replace, selects the Focused Node', () => {
    const { node, selection, model } = setup({ multiple: false, behavior: 'replace' })
    selection.followFocus(node('a'), node('b'), plain)
    expect(model.value).toBe('b')
  })
})
