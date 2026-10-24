import type { VueWrapper } from '@vue/test-utils'
import { mount } from '@vue/test-utils'
import { h, nextTick, reactive } from 'vue'
import Tooltip from './Tooltip.client.vue'
import TooltipHost from './TooltipHost.client.vue'

const wrappers: VueWrapper[] = []
beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
  vi.useRealTimers()
  document.body.innerHTML = ''
})

async function flush() {
  for (let i = 0; i < 6; i++) await nextTick()
}
async function advance(ms: number) {
  vi.advanceTimersByTime(ms)
  await flush()
}
function pointer(el: Element, type: string) {
  el.dispatchEvent(new PointerEvent(type, { pointerType: 'mouse', relatedTarget: document.body }))
}
async function setup(overrides: Record<string, unknown> = {}, separate = false) {
  const updates = [vi.fn(), vi.fn(), vi.fn()]
  const state = reactive({ label: 'Alpha', disabled: false, group: 'tools' })
  const wrapper = mount({
    render: () => h('div', [
      h(TooltipHost),
      ...['Alpha', 'Beta is longer', 'Gamma'].map((label, i) => h('button', { id: `group-anchor-${i}` }, [
        label,
        h(Tooltip, { 'group': separate && i === 2 ? 'other' : state.group, 'disabled': state.disabled, ...overrides, 'onUpdate:modelValue': updates[i] }, {
          default: () => h('span', { 'data-content': i }, i === 0 ? state.label : label),
        }),
      ])),
    ]),
  }, { attachTo: document.body, global: { stubs: { transition: false } } })
  wrappers.push(wrapper)
  await flush()
  const anchors = [0, 1, 2].map(i => document.getElementById(`group-anchor-${i}`)!)
  return { wrapper, anchors, updates, state }
}
const surface = () => document.querySelector('[data-tooltip-group="tools"]')

describe('Tooltip Groups', () => {
  it.each(['selector', 'element'])('closes when an external %s Anchor is removed', async (kind) => {
    const external = document.createElement('button')
    external.id = 'external-tooltip-anchor'
    document.body.append(external)
    const { updates } = await setup({ target: kind === 'selector' ? '#external-tooltip-anchor' : external, hideDelay: 1000 })
    pointer(external, 'pointerenter')
    await advance(200)
    expect(surface()).not.toBeNull()
    external.remove()
    await flush()
    await advance(50)
    expect(surface()).toBeNull()
    expect(updates[2]).toHaveBeenLastCalledWith(false)
    expect(external.hasAttribute('aria-describedby')).toBe(false)
  })

  it('keeps groups independent', async () => {
    const { anchors, updates } = await setup({}, true)
    pointer(anchors[0]!, 'pointerenter')
    await advance(200)
    pointer(anchors[2]!, 'pointerenter')
    await advance(200)
    expect(document.querySelectorAll('[data-tooltip-group]')).toHaveLength(2)
    expect(updates[0]).not.toHaveBeenCalledWith(false)
  })

  it('removes the shared surface when its owning component unmounts', async () => {
    const { anchors, wrapper } = await setup()
    pointer(anchors[0]!, 'pointerenter')
    await advance(200)
    wrapper.unmount()
    wrappers.splice(wrappers.indexOf(wrapper), 1)
    await advance(500)
    expect(surface()).toBeNull()
  })

  it('keeps one surface across a gap, crossfades content, and transfers the description', async () => {
    const { anchors, updates } = await setup()
    pointer(anchors[0]!, 'pointerenter')
    await advance(200)
    const original = surface()
    expect(original).not.toBeNull()
    pointer(anchors[0]!, 'pointerleave')
    await advance(50)
    expect(surface()).toBe(original)
    pointer(anchors[1]!, 'pointerenter')
    await flush()
    expect(surface()).toBe(original)
    expect(document.querySelectorAll('[role="tooltip"]')).toHaveLength(1)
    expect(anchors[0]!.hasAttribute('aria-describedby')).toBe(false)
    expect(anchors[1]!.getAttribute('aria-describedby')).toBe(document.querySelector('[role="tooltip"]')!.id)
    expect(original!.querySelectorAll('.tooltip-group-content')).toHaveLength(2)
    expect(original!.querySelector('.tooltip-group-previous')!.getAttribute('aria-hidden')).toBe('true')
    expect(updates[0]).not.toHaveBeenCalledWith(false)
    await advance(180)
    expect(updates[0]).toHaveBeenLastCalledWith(false)
    expect(original!.querySelectorAll('.tooltip-group-content')).toHaveLength(1)
    expect(original!.textContent).toContain('Beta is longer')
  })

  it('cancels stale cleanup when a fading member reopens', async () => {
    const { anchors, updates } = await setup()
    pointer(anchors[0]!, 'pointerenter')
    await advance(200)
    pointer(anchors[1]!, 'pointerenter')
    await flush()
    await advance(50)
    pointer(anchors[0]!, 'pointerenter')
    await flush()
    await advance(180)
    expect(updates[0]).not.toHaveBeenCalledWith(false)
    expect(updates[1]).toHaveBeenLastCalledWith(false)
    expect(surface()!.textContent).toBe('Alpha')
  })

  it('keeps at most two layers during A to B to C and releases the oldest model', async () => {
    const { anchors, updates } = await setup()
    pointer(anchors[0]!, 'pointerenter')
    await advance(200)
    pointer(anchors[1]!, 'pointerenter')
    await flush()
    pointer(anchors[2]!, 'pointerenter')
    await flush()
    expect(surface()!.querySelectorAll('.tooltip-group-content')).toHaveLength(2)
    expect(surface()!.textContent).not.toContain('Alpha')
    expect(updates[0]).toHaveBeenLastCalledWith(false)
    await advance(180)
    expect(surface()!.textContent).toBe('Gamma')
  })

  it('updates reactive slot content without changing the active member', async () => {
    const { anchors, state } = await setup()
    pointer(anchors[0]!, 'pointerenter')
    await advance(200)
    state.label = 'Updated description'
    await flush()
    expect(surface()!.textContent).toBe('Updated description')
  })

  it('uses hideDelay when longer than the handoff interval', async () => {
    const { anchors } = await setup({ hideDelay: 400 })
    pointer(anchors[0]!, 'pointerenter')
    await advance(200)
    pointer(anchors[0]!, 'pointerleave')
    await advance(399)
    expect(surface()).not.toBeNull()
    await advance(1)
    await advance(50)
    expect(surface()).toBeNull()
  })

  it('bypasses the handoff wait on Escape and disables immediately', async () => {
    const { anchors, state } = await setup()
    pointer(anchors[0]!, 'pointerenter')
    await advance(200)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flush()
    await advance(50)
    expect(surface()).toBeNull()
    pointer(anchors[1]!, 'pointerenter')
    await advance(200)
    state.disabled = true
    await flush()
    await advance(50)
    expect(surface()).toBeNull()
  })

  it('retains the focus delay when moving between members', async () => {
    const { anchors } = await setup()
    anchors[0]!.dispatchEvent(new FocusEvent('focus'))
    await advance(200)
    anchors[1]!.dispatchEvent(new FocusEvent('focus'))
    await advance(199)
    expect(surface()!.textContent).toBe('Alpha')
    await advance(1)
    expect(surface()!.textContent).toContain('Beta is longer')
  })

  it.each([{ interactive: true }, { followCursor: true }, { attachTo: '' }])('falls back for unsupported options %o', async (options) => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { anchors } = await setup(options)
    pointer(anchors[0]!, 'pointerenter')
    await advance(200)
    expect(surface()).toBeNull()
    expect(document.querySelector('.tooltip')).not.toBeNull()
    expect(warning).toHaveBeenCalled()
  })
})
