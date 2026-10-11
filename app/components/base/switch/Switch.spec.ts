import type { VueWrapper } from '@vue/test-utils'
import { mount } from '@vue/test-utils'
import Switch from './Switch.vue'

/**
 * One rule carries this component and it is invisible in the markup: the announced state and
 * the drawn state are the same attribute. `aria-checked` is what a reader hears and what the
 * stylesheet selects on, so they cannot drift apart. The previous Switch drew from
 * `aria-pressed` and announced nothing, which is the regression most of these tests guard.
 *
 * `aria-label` is passed almost everywhere to keep the accessible-name warning out of the
 * output. The tests that care about that warning pass it deliberately, or not at all.
 */

function named(props: Record<string, unknown> = {}) {
  return { props: { 'aria-label': 'Email notifications', ...props } }
}

function root(wrapper: VueWrapper<any>) {
  return wrapper.find('[data-slot="switch"]')
}

function readout(wrapper: VueWrapper<any>) {
  return wrapper.find('[data-slot="switch-readout"]')
}

describe('the state', () => {
  it('is off until something says otherwise', () => {
    const wrapper = mount(Switch, named())

    expect(root(wrapper).attributes('aria-checked')).toBe('false')
  })

  it('flips on a click', async () => {
    const wrapper = mount(Switch, named())

    await root(wrapper).trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([[true]])
    expect(root(wrapper).attributes('aria-checked')).toBe('true')
  })

  it('flips back', async () => {
    const wrapper = mount(Switch, named({ modelValue: true }))

    await root(wrapper).trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })

  it('is announced as `aria-checked`, the attribute the stylesheet also selects on', () => {
    const wrapper = mount(Switch, named({ modelValue: true }))

    expect(root(wrapper).attributes('role')).toBe('switch')
    expect(root(wrapper).attributes('aria-checked')).toBe('true')
  })

  it('survives a model value that is null rather than absent', () => {
    const wrapper = mount(Switch, named({ modelValue: null }))

    // `defineModel`'s default covers `undefined` only, and Vue removes a `null` attribute. A
    // nullable boolean from an API would otherwise reproduce the bug this component replaces:
    // `role="switch"` with no state on it at all.
    expect(root(wrapper).attributes('aria-checked')).toBe('false')
  })

  it('is never carried by `aria-pressed`', () => {
    const wrapper = mount(Switch, named({ modelValue: true }))

    // `aria-pressed` belongs to `role="button"`. On a switch it is ignored, so a switch that
    // reports through it is drawn correctly and announced as nothing at all.
    expect(root(wrapper).attributes('aria-pressed')).toBeUndefined()
  })

  it('does not submit the form it sits in', () => {
    const wrapper = mount(Switch, named())

    expect(root(wrapper).attributes('type')).toBe('button')
  })
})

describe('a disabled switch', () => {
  it('cannot be reached or clicked', async () => {
    const wrapper = mount(Switch, named({ disabled: true }))

    expect(root(wrapper).attributes('disabled')).toBeDefined()

    await root(wrapper).trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('still reports its state', () => {
    const wrapper = mount(Switch, named({ disabled: true, modelValue: true }))

    expect(root(wrapper).attributes('aria-checked')).toBe('true')
  })
})

describe('the readout', () => {
  it('is absent until asked for', () => {
    const wrapper = mount(Switch, named())

    expect(readout(wrapper).exists()).toBe(false)
  })

  it('draws both strings, so the Switch does not resize on toggle', () => {
    const wrapper = mount(Switch, named({ readout: { checked: 'ON', unchecked: 'OFF' } }))

    expect(readout(wrapper).text()).toContain('ON')
    expect(readout(wrapper).text()).toContain('OFF')
  })

  it('hides whichever does not apply', async () => {
    const wrapper = mount(Switch, named({ readout: { checked: 'ON', unchecked: 'OFF' } }))
    const [checked, unchecked] = readout(wrapper).findAll('span')

    expect(checked!.classes()).toContain('opacity-0')
    expect(unchecked!.classes()).not.toContain('opacity-0')

    await root(wrapper).trigger('click')

    expect(checked!.classes()).not.toContain('opacity-0')
    expect(unchecked!.classes()).toContain('opacity-0')
  })

  it('is kept out of the accessibility tree', () => {
    const wrapper = mount(Switch, named({ readout: { checked: 'ON', unchecked: 'OFF' } }))

    // A reader never reaches it anyway — `role="switch"` makes its children presentational.
    // The attribute says so in the markup, where the next person reads it.
    expect(readout(wrapper).attributes('aria-hidden')).toBe('true')
  })

  it('does not name the Switch', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    mount(Switch, { props: { readout: { checked: 'ON', unchecked: 'OFF' } } })

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('No accessible name'))
  })
})

describe('the accessible name', () => {
  it('is warned about when nothing supplies one', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    mount(Switch)

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('No accessible name'))
  })

  it('falls through to the element holding the role', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const wrapper = mount(Switch, named())

    expect(root(wrapper).attributes('aria-label')).toBe('Email notifications')
    expect(warn).not.toHaveBeenCalled()
  })

  it('is warned about when the name is an empty string', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    // A reader ignores `aria-label=""`, so it leaves the Switch as unnamed as no attribute does.
    mount(Switch, { props: { 'aria-label': '' } })

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('No accessible name'))
  })

  it('accepts `aria-labelledby` instead', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    mount(Switch, { props: { 'aria-labelledby': 'notifications-heading' } })

    expect(warn).not.toHaveBeenCalled()
  })
})
