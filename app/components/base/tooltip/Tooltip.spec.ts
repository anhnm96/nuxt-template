import { enableAutoUnmount, mount } from '@vue/test-utils'
import { h, reactive } from 'vue'
import Tooltip from './Tooltip.client.vue'
import { TAP_SLOP_PX } from './useTouchPress'

const DELAY = 200

/**
 * An Anchor button holding a Tooltip, the way consumers write it. The slot
 * renders a Delete button that calls `hide`, like an Interactive Tooltip's
 * actions will. `props` stays reactive, so a test can change them.
 *
 * The Anchor also holds a `.handle` that stops both pointerdown and click, like
 * the schedule's resize handles do.
 */
async function mountAnchor(initialProps: Record<string, any> = {}, { id = 'anchor' } = {}) {
  const props = reactive(initialProps)
  const onAnchorClick = vi.fn()
  const onDelete = vi.fn()
  const wrapper = mount({
    render: () => h('button', { id, onClick: onAnchorClick }, [
      'Event',
      h('span', { class: 'handle', onPointerdown: (e: Event) => e.stopPropagation(), onClick: (e: Event) => e.stopPropagation() }),
      h(Tooltip, props, {
        default: ({ hide }: { hide: () => void }) => [
          h('span', 'Details'),
          h('button', { class: 'delete', onClick: () => {
            onDelete()
            hide()
          } }, 'Delete'),
        ],
      }),
    ]),
  }, { attachTo: document.body })
  const anchor = document.getElementById(id)!
  // the Anchor's listeners attach once it has been found, after mount
  await nextTick()
  return { wrapper, props, anchor, onAnchorClick, onDelete }
}

/** The tooltip surface, found wherever it teleported to. */
function surfaces() {
  return [...document.querySelectorAll<HTMLElement>('.tooltip')]
}
function surface() {
  return surfaces()[0]
}

function pointer(type: string, el: EventTarget, init: PointerEventInit = {}) {
  el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, ...init }))
}

/** A finger press on `el`, optionally travelling before it lifts. */
function touch(el: HTMLElement, { travel = 0, hold = 0 } = {}) {
  const at = { clientX: 10, clientY: 10, pointerType: 'touch' }
  pointer('pointerdown', el, at)
  if (hold) vi.advanceTimersByTime(hold)
  if (travel) pointer('pointermove', el, { ...at, clientX: 10 + travel })
  pointer('pointerup', el, { ...at, clientX: 10 + travel })
  // browsers follow a touch with a synthetic click on the element under it
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
}

async function settle() {
  vi.runOnlyPendingTimers()
  await nextTick()
}

// an open tooltip left mounted would keep its document listeners — and its
// Escape handler stops the event from reaching the next test's
enableAutoUnmount(afterEach)

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('tooltip — mouse', () => {
  it('opens after the delay on hover and closes when the pointer leaves', async () => {
    const { anchor } = await mountAnchor()

    pointer('pointerenter', anchor, { pointerType: 'mouse' })
    await nextTick()
    expect(surface()).toBeUndefined()

    vi.advanceTimersByTime(DELAY)
    await nextTick()
    expect(surface()).toBeDefined()

    pointer('pointerleave', anchor, { pointerType: 'mouse', relatedTarget: document.body })
    await settle()
    expect(surface()).toBeUndefined()
  })

  it('stays open while the pointer moves from the Anchor into the tooltip', async () => {
    const { anchor } = await mountAnchor({ interactive: true })
    pointer('pointerenter', anchor, { pointerType: 'mouse' })
    await settle()

    pointer('pointerleave', anchor, { pointerType: 'mouse', relatedTarget: surface() })
    await settle()
    expect(surface()).toBeDefined()
  })

  it('describes its Anchor', async () => {
    const { anchor } = await mountAnchor()
    pointer('pointerenter', anchor, { pointerType: 'mouse' })
    await settle()

    expect(surface()!.getAttribute('role')).toBe('tooltip')
    expect(anchor.getAttribute('aria-describedby')).toBe(surface()!.id)
  })

  it('lets a mouse click activate the Anchor, even when interactive', async () => {
    const { anchor, onAnchorClick } = await mountAnchor({ interactive: true })
    pointer('pointerenter', anchor, { pointerType: 'mouse' })
    await settle()

    anchor.click()
    await settle()
    expect(onAnchorClick).toHaveBeenCalledOnce()
    expect(surface()).toBeUndefined()
  })
})

describe('tooltip — touch', () => {
  it('shows nothing on a quick tap, and the Anchor still activates', async () => {
    const { anchor, onAnchorClick } = await mountAnchor()
    touch(anchor)
    await settle()

    expect(surface()).toBeUndefined()
    expect(onAnchorClick).toHaveBeenCalledOnce()
  })

  it('peeks while pressed and hides on release', async () => {
    const { anchor } = await mountAnchor()
    pointer('pointerdown', anchor, { pointerType: 'touch' })
    vi.advanceTimersByTime(DELAY)
    await nextTick()
    expect(surface()).toBeDefined()

    pointer('pointerup', anchor, { pointerType: 'touch' })
    await settle()
    expect(surface()).toBeUndefined()
  })

  it('ignores hover and focus events a touch produces', async () => {
    const { anchor } = await mountAnchor()
    pointer('pointerenter', anchor, { pointerType: 'touch' })
    await settle()
    expect(surface()).toBeUndefined()
  })
})

describe('interactive tooltip — touch', () => {
  it('opens immediately on a Tap instead of activating the Anchor', async () => {
    const { anchor, onAnchorClick } = await mountAnchor({ interactive: true })
    touch(anchor)
    await nextTick()

    expect(surface()).toBeDefined()
    expect(onAnchorClick).not.toHaveBeenCalled()
  })

  it('is a preview, not a description of the Anchor', async () => {
    const { anchor } = await mountAnchor({ interactive: true })
    touch(anchor)
    await nextTick()

    expect(surface()!.hasAttribute('role')).toBe(false)
    expect(anchor.hasAttribute('aria-describedby')).toBe(false)
  })

  it('opens nothing on a drag, and does not swallow what follows it', async () => {
    const { anchor, onAnchorClick } = await mountAnchor({ interactive: true })
    touch(anchor, { travel: TAP_SLOP_PX + 1 })
    await settle()

    expect(surface()).toBeUndefined()
    expect(onAnchorClick).toHaveBeenCalledOnce()
  })

  it('counts a long, still press as a Tap', async () => {
    const { anchor } = await mountAnchor({ interactive: true })
    touch(anchor, { hold: 1000 })
    await nextTick()
    expect(surface()).toBeDefined()
  })

  it('closes on a second Tap on the Anchor', async () => {
    const { anchor, onAnchorClick } = await mountAnchor({ interactive: true })
    touch(anchor)
    await settle()
    touch(anchor)
    await settle()

    expect(surface()).toBeUndefined()
    expect(onAnchorClick).not.toHaveBeenCalled()
  })

  it('closes on a tap outside, and lets that tap through', async () => {
    const { anchor } = await mountAnchor({ interactive: true })
    const outside = document.createElement('button')
    const onOutsideClick = vi.fn()
    outside.addEventListener('click', onOutsideClick)
    document.body.appendChild(outside)

    touch(anchor)
    await settle()
    touch(outside)
    await settle()

    expect(surface()).toBeUndefined()
    expect(onOutsideClick).toHaveBeenCalledOnce()
  })

  it('swaps to another Anchor\'s tooltip in a single Tap', async () => {
    const a = await mountAnchor({ interactive: true }, { id: 'a' })
    const b = await mountAnchor({ interactive: true }, { id: 'b' })

    touch(a.anchor)
    await settle()
    touch(b.anchor)
    await settle()

    expect(surfaces()).toHaveLength(1)
    expect(b.onAnchorClick).not.toHaveBeenCalled()
    // the one left open is B's: its Delete button reports to B
    surface()!.querySelector<HTMLElement>('.delete')!.click()
    expect(b.onDelete).toHaveBeenCalledOnce()
    expect(a.onDelete).not.toHaveBeenCalled()
  })

  it('stays open while its own content is tapped, until the content hides it', async () => {
    const { anchor, onDelete } = await mountAnchor({ interactive: true })
    touch(anchor)
    await settle()

    const del = surface()!.querySelector<HTMLElement>('.delete')!
    pointer('pointerdown', del, { pointerType: 'touch' })
    anchor.dispatchEvent(new FocusEvent('blur', { relatedTarget: null }))
    pointer('pointerup', del, { pointerType: 'touch' })
    await settle()
    expect(surface()).toBeDefined()

    del.click()
    await settle()
    expect(onDelete).toHaveBeenCalledOnce()
    expect(surface()).toBeUndefined()
  })

  it('closes when its Anchor is dragged', async () => {
    const { anchor } = await mountAnchor({ interactive: true })
    touch(anchor)
    await settle()
    touch(anchor, { travel: TAP_SLOP_PX + 1 })
    await settle()

    expect(surface()).toBeUndefined()
  })

  it('closes on Escape', async () => {
    const { anchor } = await mountAnchor({ interactive: true })
    touch(anchor)
    await settle()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await settle()
    expect(surface()).toBeUndefined()
  })

  it('does not open while disabled', async () => {
    const { anchor, onAnchorClick } = await mountAnchor({ interactive: true, disabled: true })
    touch(anchor)
    await settle()

    expect(surface()).toBeUndefined()
    // nothing opened, so nothing replaced the Anchor's own tap
    expect(onAnchorClick).toHaveBeenCalledOnce()
  })
})

describe('tooltip — v-model', () => {
  it('opens and closes alongside the Anchor\'s own listeners', async () => {
    const { props, anchor } = await mountAnchor({ 'modelValue': false, 'onUpdate:modelValue': (v: boolean) => {
      props.modelValue = v
    } })

    props.modelValue = true
    await nextTick()
    expect(surface()).toBeDefined()

    pointer('pointerleave', anchor, { pointerType: 'mouse', relatedTarget: document.body })
    await settle()
    expect(surface()).toBeUndefined()
  })
})

describe('tooltip — misuse', () => {
  it('warns that followCursor is ignored on an interactive tooltip', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await mountAnchor({ interactive: true, followCursor: true })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('followCursor'))
  })
})

describe('tooltip — regressions', () => {
  it('closes on a click inside the Anchor, even on a child that stops the click', async () => {
    const { anchor } = await mountAnchor()
    pointer('pointerenter', anchor, { pointerType: 'mouse' })
    await settle()

    anchor.querySelector<HTMLElement>('.handle')!.click()
    await settle()
    expect(surface()).toBeUndefined()
  })

  it('cancels a focus-started show when a child that stops the click is tapped', async () => {
    // Android focuses a tapped button, and focus starts the show delay
    const { anchor } = await mountAnchor()
    anchor.dispatchEvent(new FocusEvent('focus'))
    anchor.querySelector<HTMLElement>('.handle')!.click()
    vi.advanceTimersByTime(DELAY)
    await nextTick()
    expect(surface()).toBeUndefined()
  })

  it('still lets outside-click detectors see the Tap, with its real target', async () => {
    // the app's v-click-outside listens for click on document.body
    const { anchor, onAnchorClick } = await mountAnchor({ interactive: true })
    const onBodyClick = vi.fn((event: MouseEvent) => event.target)
    document.body.addEventListener('click', onBodyClick)

    touch(anchor)
    await nextTick()
    document.body.removeEventListener('click', onBodyClick)

    expect(surface()).toBeDefined()
    expect(onAnchorClick).not.toHaveBeenCalled()
    expect(onBodyClick).toHaveBeenCalledOnce()
    expect(onBodyClick.mock.results[0]!.value).toBe(anchor)
  })

  it('does not flash a plain tooltip on a quick tap while a card is closing', async () => {
    const card = await mountAnchor({ interactive: true }, { id: 'card' })
    const plain = await mountAnchor({}, { id: 'plain' })
    touch(card.anchor)
    await settle()

    // the press closes the card, but the card is still counted as showing
    pointer('pointerdown', plain.anchor, { pointerType: 'touch' })
    await nextTick()
    expect(plain.anchor.hasAttribute('aria-describedby')).toBe(false)
    expect(surfaces().some(s => s.textContent?.includes('Details') && s.getAttribute('role') === 'tooltip')).toBe(false)
  })

  it('reopens on a Tap made while a hideDelay is still running', async () => {
    const { anchor } = await mountAnchor({ interactive: true, hideDelay: 2000 })
    touch(anchor)
    await nextTick()
    touch(anchor) // starts the 2s hide
    await nextTick()
    touch(anchor) // changes their mind
    vi.advanceTimersByTime(3000)
    await nextTick()
    expect(surface()).toBeDefined()
  })

  it('treats a Tap on a child that stops pointerdown as a Tap on the Anchor', async () => {
    const { anchor, onAnchorClick } = await mountAnchor({ interactive: true })
    touch(anchor.querySelector<HTMLElement>('.handle')!)
    await nextTick()

    expect(surface()).toBeDefined()
    expect(onAnchorClick).not.toHaveBeenCalled()
  })

  it('honours blur again after a press inside the card is cancelled', async () => {
    const { anchor } = await mountAnchor({ interactive: true })
    touch(anchor)
    await settle()

    // a touch-scroll inside the card ends in pointercancel, not pointerup
    const content = surface()!
    pointer('pointerdown', content, { pointerType: 'touch' })
    pointer('pointercancel', content, { pointerType: 'touch' })

    anchor.dispatchEvent(new FocusEvent('blur', { relatedTarget: document.body }))
    await settle()
    expect(surface()).toBeUndefined()
  })
})
