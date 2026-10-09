import { mount } from '@vue/test-utils'
import { defineComponent, h, reactive } from 'vue'
import MenuItem from '~/components/base/menu/MenuItem.vue'
import ContextMenu from './ContextMenu.vue'

/**
 * The keyboard summon, which is the part with no other coverage and the part two browsers
 * disagree about. See DESIGN.md — "The keyboard gesture needs cancelling twice".
 */

const mounted: { unmount: () => void }[] = []

beforeEach(() => {
  // The Teleport target `app.vue` renders. Without it the popover never mounts.
  const popovers = document.createElement('div')
  popovers.className = 'popovers'
  document.body.appendChild(popovers)
})

afterEach(() => {
  while (mounted.length) mounted.pop()!.unmount()
  document.body.innerHTML = ''
})

/** An Anchor holding a ContextMenu, the way a consumer writes it. */
async function mountAnchor(props: Record<string, any> = {}) {
  const state = reactive({ label: 'Row', ...props })
  const wrapper = mount(defineComponent({
    render: () => h('div', { id: 'anchor', tabindex: '0' }, [
      'Row',
      h(ContextMenu, state, { default: () => [h(MenuItem, { label: 'Add' }, () => 'Add')] }),
    ]),
  }), { attachTo: document.body })
  mounted.push(wrapper)
  // The Anchor's listeners attach once `onMounted` has resolved it.
  await nextTick()
  return { anchor: document.getElementById('anchor')!, state }
}

function menu() {
  return document.querySelector('[role="menu"]')
}

/** Settles the open watcher, which awaits a tick of its own before focusing. */
async function settle() {
  await nextTick()
  await nextTick()
}

function keydown(anchor: HTMLElement, init: KeyboardEventInit) {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
  anchor.dispatchEvent(event)
  return event
}

function rightClick(anchor: HTMLElement, at = { clientX: 40, clientY: 60 }) {
  const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, ...at })
  anchor.dispatchEvent(event)
  return event
}

describe('contextMenu — keyboard summon', () => {
  it.each([
    ['Shift+F10', { key: 'F10', shiftKey: true }],
    ['the context-menu key', { key: 'ContextMenu' }],
  ])('opens on %s, and cancels the browser\'s own menu', async (_name, init) => {
    const { anchor } = await mountAnchor()
    const event = keydown(anchor, init)
    await settle()
    expect(event.defaultPrevented).toBe(true)
    expect(menu()).not.toBeNull()
  })

  it('leaves F10 alone without Shift', async () => {
    const { anchor } = await mountAnchor()
    const event = keydown(anchor, { key: 'F10' })
    await settle()
    expect(event.defaultPrevented).toBe(false)
    expect(menu()).toBeNull()
  })

  /**
   * Firefox fires `contextmenu` after the keydown even though the keydown was cancelled,
   * and shows its own menu. Cancelling it is the whole job: the keydown has already opened
   * against the Anchor's box, and re-opening at this event's coordinates would yank the
   * Menu to the corner, because a keyboard summon reports none worth having.
   */
  it('cancels the follow-up contextmenu without re-pointing the Menu', async () => {
    const { anchor } = await mountAnchor()
    keydown(anchor, { key: 'F10', shiftKey: true })
    const followUp = rightClick(anchor, { clientX: 0, clientY: 0 })
    await settle()
    expect(followUp.defaultPrevented).toBe(true)
    expect(menu()).not.toBeNull()
  })

  /**
   * The flag that marks a `contextmenu` as keyboard-derived is cleared by a pointer press,
   * not a timer. Chrome sends no follow-up at all, so a stale flag would make the *next*
   * real right-click anchor to the box instead of the cursor.
   */
  it('treats a later right-click as a pointer gesture', async () => {
    const { anchor } = await mountAnchor()
    keydown(anchor, { key: 'F10', shiftKey: true })
    await settle()
    anchor.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    const event = rightClick(anchor)
    await settle()
    expect(event.defaultPrevented).toBe(true)
    expect(menu()).not.toBeNull()
  })
})

describe('contextMenu — disabled', () => {
  /**
   * `disabled` means the browser's own menu is left alone. Cancelling the keydown and then
   * opening nothing would take the gesture away from the keyboard while the pointer keeps
   * it, so a disabled Anchor would have no context menu at all in Chrome.
   */
  it('does not cancel the keyboard gesture', async () => {
    const { anchor } = await mountAnchor({ disabled: true })
    const event = keydown(anchor, { key: 'F10', shiftKey: true })
    await settle()
    expect(event.defaultPrevented).toBe(false)
    expect(menu()).toBeNull()
  })

  it('does not cancel a right-click', async () => {
    const { anchor } = await mountAnchor({ disabled: true })
    const event = rightClick(anchor)
    await settle()
    expect(event.defaultPrevented).toBe(false)
    expect(menu()).toBeNull()
  })
})
