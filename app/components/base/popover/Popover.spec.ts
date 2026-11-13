/**
 * Click-outside, with the real directive. `Popover` passes its reference as the `anchor`, so a
 * click on the reference is inside: a text-field reference can take a click that places the
 * caret, and no host has to whitelist its own reference.
 */
import { flushPromises, mount } from '@vue/test-utils'
import { realClickOutside } from '../../../../tests/utils/clickOutside'
import { addPopoverHost } from '../../../../tests/utils/popoverHost'
import Popover from './Popover.vue'
import { POPOVER_HOST } from './usePopover'

// Removes the `.popovers` host and the outside button, so each test starts with an empty page.
afterEach(() => {
  document.body.innerHTML = ''
})

/** Mounts an open Popover and waits for click-outside, which attaches one frame later. */
async function mountOpen(props: Record<string, unknown> = {}) {
  addPopoverHost()
  const outside = document.createElement('button')
  document.body.appendChild(outside)

  const wrapper = mount(Popover, {
    props: { 'open': true, 'onUpdate:open': (value: boolean) => wrapper.setProps({ open: value }), ...props },
    slots: {
      default: '<div class="reference"><input></div>',
      popover: '<p>Body</p>',
    },
    attachTo: document.body,
    global: { directives: { clickOutside: realClickOutside() } },
  })
  await flushPromises()
  await new Promise(resolve => requestAnimationFrame(resolve))
  return { wrapper, outside }
}

describe('popover click-outside', () => {
  it('stays open on a click inside the reference', async () => {
    const { wrapper } = await mountOpen()
    await wrapper.get('.reference input').trigger('click')
    expect(wrapper.props('open')).toBe(true)
    wrapper.unmount()
  })

  it('dismisses on a click outside the reference and the surface', async () => {
    const { wrapper, outside } = await mountOpen()
    outside.click()
    await flushPromises()
    expect(wrapper.props('open')).toBe(false)
    wrapper.unmount()
  })

  it('stays open on a click outside when `dismissOnClickOutside` is off', async () => {
    const { wrapper, outside } = await mountOpen({ dismissOnClickOutside: false })
    outside.click()
    await flushPromises()
    expect(wrapper.props('open')).toBe(true)
    wrapper.unmount()
  })
})

/**
 * Focus returns on close only when focus was inside the Popover or its anchor at that moment.
 * Focus that the user put on `<body>` or on another control stays there.
 */
describe('popover focus restore', () => {
  /** Mounts a closed Popover, focuses its reference input and opens it, as a user would. */
  async function openFromReference() {
    addPopoverHost()
    const outside = document.createElement('button')
    document.body.appendChild(outside)
    const wrapper = mount(Popover, {
      props: { 'open': false, 'onUpdate:open': (value: boolean) => wrapper.setProps({ open: value }) },
      slots: {
        default: '<div class="reference"><input></div>',
        popover: '<button class="inside">Inside</button>',
      },
      attachTo: document.body,
      global: { directives: { clickOutside: realClickOutside() } },
    })
    const reference = wrapper.get('.reference input').element as HTMLInputElement
    reference.focus()
    await wrapper.setProps({ open: true })
    await flushPromises()
    await new Promise(resolve => requestAnimationFrame(resolve))
    return { wrapper, reference, outside }
  }

  /** The restore runs on a timer after close. */
  const afterRestore = () => new Promise(resolve => setTimeout(resolve, 10))

  it('returns focus to the reference on Escape from inside the Popover', async () => {
    const { wrapper, reference } = await openFromReference()
    const inside = document.querySelector<HTMLButtonElement>(`${POPOVER_HOST} .inside`)!
    inside.focus()
    inside.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()
    await afterRestore()
    expect(wrapper.props('open')).toBe(false)
    expect(document.activeElement).toBe(reference)
    wrapper.unmount()
  })

  it('leaves focus on the page after a click on empty space', async () => {
    const { wrapper, reference } = await openFromReference()
    // The press on empty space takes focus off the reference before the click lands.
    reference.blur()
    document.body.click()
    await flushPromises()
    await afterRestore()
    expect(wrapper.props('open')).toBe(false)
    expect(document.activeElement).not.toBe(reference)
    wrapper.unmount()
  })

  /** A popup inside this Popover's content is teleported beside it, not inside it. */
  it('returns focus to the reference when it closes with focus in a nested Popover', async () => {
    const { wrapper, reference } = await openFromReference()
    const nested = document.createElement('button')
    document.querySelector(POPOVER_HOST)!.appendChild(nested)
    nested.focus()
    await wrapper.setProps({ open: false })
    nested.remove() // the nested Popover closes with it, and focus falls to `<body>`
    await flushPromises()
    await afterRestore()
    expect(document.activeElement).toBe(reference)
    wrapper.unmount()
  })

  it('leaves focus on the control that focus moved to after close', async () => {
    const { wrapper, outside } = await openFromReference()
    document.querySelector<HTMLButtonElement>(`${POPOVER_HOST} .inside`)!.focus()
    await wrapper.setProps({ open: false })
    outside.focus() // `Tab` moves focus on before the restore timer runs
    await afterRestore()
    expect(document.activeElement).toBe(outside)
    wrapper.unmount()
  })

  /** Focus on the reference at close is already where a restore would put it. */
  it('does not restore when focus leaves the reference after close', async () => {
    const { wrapper, reference } = await openFromReference()
    await wrapper.setProps({ open: false })
    reference.blur() // `Tab` out of the last control on the page puts focus on `<body>`
    await flushPromises()
    await afterRestore()
    expect(document.activeElement).not.toBe(reference)
    wrapper.unmount()
  })

  it('leaves focus on another control that the user clicked', async () => {
    const { wrapper, outside } = await openFromReference()
    outside.focus()
    outside.click()
    await flushPromises()
    await afterRestore()
    expect(wrapper.props('open')).toBe(false)
    expect(document.activeElement).toBe(outside)
    wrapper.unmount()
  })
})
