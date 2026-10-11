import type { VueWrapper } from '@vue/test-utils'
import { mount } from '@vue/test-utils'
import ProgressBar from './ProgressBar.vue'

/**
 * Two rules carry the component and neither shows in the markup: a missing `value` means
 * Indeterminate, and a Readout never renders while Indeterminate. Everything else here guards
 * the arithmetic at the edges, where `max` can be absent, zero or nonsense.
 *
 * `aria-label` is passed almost everywhere to keep the accessible-name warning out of the
 * output. The tests that care about that warning pass it deliberately, or not at all.
 */

function named(props: Record<string, unknown> = {}) {
  return { props: { 'aria-label': 'Upload', ...props } }
}

function fill(wrapper: VueWrapper<any>) {
  return wrapper.find('[data-slot="progress-fill"]')
}

/**
 * The Fill's drawn width, exactly. Matching the style string loosely does not work here:
 * `inline-size: 100%;` contains `0%`, so a bar wrongly pinned at complete passes a test
 * written for a bar drawn at none — which is the one regression these assertions exist for.
 */
function fillWidth(wrapper: VueWrapper<any>) {
  return fill(wrapper).attributes('style')?.match(/inline-size:\s*([\d.]+%)/)?.[1]
}

function root(wrapper: VueWrapper<any>) {
  return wrapper.find('[data-slot="progress"]')
}

function readout(wrapper: VueWrapper<any>) {
  return wrapper.find('[data-slot="progress-readout"]')
}

describe('a determinate bar', () => {
  it('fills the value\'s share of the Track', () => {
    const wrapper = mount(ProgressBar, named({ value: 40 }))

    expect(fillWidth(wrapper)).toBe('40%')
  })

  it('treats `max` as 100 by default', () => {
    const wrapper = mount(ProgressBar, named({ value: 25 }))

    expect(root(wrapper).attributes('aria-valuemax')).toBe('100')
    expect(fillWidth(wrapper)).toBe('25%')
  })

  it('counts against a custom `max`', () => {
    const wrapper = mount(ProgressBar, named({ value: 4, max: 10 }))

    expect(fillWidth(wrapper)).toBe('40%')
    expect(root(wrapper).attributes('aria-valuenow')).toBe('4')
    expect(root(wrapper).attributes('aria-valuemax')).toBe('10')
  })

  it('reports the value, not the percentage, to a reader', () => {
    const wrapper = mount(ProgressBar, named({ value: 3, max: 7 }))

    expect(root(wrapper).attributes('aria-valuenow')).toBe('3')
    expect(root(wrapper).attributes('aria-valuemin')).toBe('0')
  })

  it('announces `formatValue` as the value text', () => {
    const wrapper = mount(ProgressBar, named({
      value: 4,
      max: 10,
      formatValue: (value: number, max: number) => `${value} of ${max} files`,
    }))

    expect(root(wrapper).attributes('aria-valuetext')).toBe('4 of 10 files')
  })

  it('hands `formatValue` the clamped value, so it cannot disagree with aria-valuenow', () => {
    const wrapper = mount(ProgressBar, named({
      value: 150,
      formatValue: (value: number) => `${value}`,
    }))

    expect(root(wrapper).attributes('aria-valuetext')).toBe('100')
    expect(root(wrapper).attributes('aria-valuenow')).toBe('100')
  })
})

describe('an indeterminate bar', () => {
  it('is what a missing value means', () => {
    const wrapper = mount(ProgressBar, named())

    expect(root(wrapper).attributes('data-indeterminate')).toBeDefined()
  })

  it('announces no value at all', () => {
    const wrapper = mount(ProgressBar, named({ formatValue: () => 'never' }))

    // Not 0: that announces "0 percent", a claim about a task nobody is measuring.
    expect(root(wrapper).attributes('aria-valuenow')).toBeUndefined()
    expect(root(wrapper).attributes('aria-valuetext')).toBeUndefined()
  })

  it('leaves the Fill\'s width to the animation', () => {
    const wrapper = mount(ProgressBar, named())

    expect(fill(wrapper).attributes('style')).toBeUndefined()
  })

  it('is not what a value of 0 means', () => {
    const wrapper = mount(ProgressBar, named({ value: 0 }))

    expect(root(wrapper).attributes('data-indeterminate')).toBeUndefined()
    expect(root(wrapper).attributes('aria-valuenow')).toBe('0')
  })

  it('becomes determinate when the value arrives', async () => {
    const wrapper = mount(ProgressBar, named())

    await wrapper.setProps({ value: 40 })

    expect(root(wrapper).attributes('data-indeterminate')).toBeUndefined()
    expect(fillWidth(wrapper)).toBe('40%')
  })
})

describe('the readout', () => {
  it('is absent until asked for', () => {
    const wrapper = mount(ProgressBar, named({ value: 40 }))

    expect(readout(wrapper).exists()).toBe(false)
  })

  it('shows the rounded percentage', () => {
    const wrapper = mount(ProgressBar, named({ value: 3, max: 7, showReadout: true }))

    expect(readout(wrapper).text()).toBe('43%')
  })

  it('is replaced by the slot, which receives the value and the max', () => {
    const wrapper = mount(ProgressBar, {
      ...named({ value: 4, max: 10, showReadout: true }),
      slots: { default: `<template #default="{ value, max }">{{ value }} of {{ max }}</template>` },
    })

    expect(readout(wrapper).text()).toBe('4 of 10')
  })

  it('does not render while indeterminate, slot or no slot', () => {
    const wrapper = mount(ProgressBar, {
      ...named({ showReadout: true }),
      slots: { default: 'Uploading…' },
    })

    // Under a sliding segment the Readout would travel with it, and nobody reads a moving word.
    expect(readout(wrapper).exists()).toBe(false)
  })

  it('renders nothing when a slot is given without `showReadout`', () => {
    const wrapper = mount(ProgressBar, {
      ...named({ value: 40 }),
      slots: { default: 'Uploading…' },
    })

    expect(readout(wrapper).exists()).toBe(false)
  })

  it('marks the Track so the height can clear a line of text', () => {
    const wrapper = mount(ProgressBar, named({ value: 40, showReadout: true }))

    expect(wrapper.find('[data-slot="progress-track"]').attributes('data-readout')).toBeDefined()
  })

  it('keeps that mark while indeterminate, so the bar does not change height', () => {
    const wrapper = mount(ProgressBar, named({ showReadout: true }))

    expect(wrapper.find('[data-slot="progress-track"]').attributes('data-readout')).toBeDefined()
  })
})

describe('a value the component cannot draw', () => {
  it('clamps above `max` and says so', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const wrapper = mount(ProgressBar, named({ value: 150 }))

    expect(fillWidth(wrapper)).toBe('100%')
    expect(root(wrapper).attributes('aria-valuenow')).toBe('100')
    expect(root(wrapper).attributes('data-out-of-range')).toBeDefined()
    expect(warn).toHaveBeenCalledOnce()
  })

  it('clamps below 0', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const wrapper = mount(ProgressBar, named({ value: -20 }))

    expect(fillWidth(wrapper)).toBe('0%')
    expect(root(wrapper).attributes('aria-valuenow')).toBe('0')
    expect(root(wrapper).attributes('data-out-of-range')).toBeDefined()
    expect(warn).toHaveBeenCalledOnce()
  })

  it('treats NaN as 0 rather than drawing NaN%', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const wrapper = mount(ProgressBar, named({ value: Number.NaN }))

    expect(fillWidth(wrapper)).toBe('0%')
    expect(root(wrapper).attributes('aria-valuenow')).toBe('0')
    expect(root(wrapper).attributes('data-out-of-range')).toBeDefined()
    expect(warn).toHaveBeenCalledOnce()
  })

  it('refuses to invent a `max` of its own', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const wrapper = mount(ProgressBar, named({ value: 40, max: 0 }))

    // Native `<progress>` falls back to 1 here, which is how a wrong `max` ships unnoticed.
    expect(fillWidth(wrapper)).toBe('0%')
    expect(root(wrapper).attributes('aria-valuenow')).toBe('0')
    expect(root(wrapper).attributes('aria-valuemax')).toBeUndefined()
    expect(root(wrapper).attributes('data-out-of-range')).toBeDefined()
    expect(warn).toHaveBeenCalledOnce()
  })

  it('warns once, however many values arrive', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const wrapper = mount(ProgressBar, named({ value: 150 }))

    await wrapper.setProps({ value: 160 })
    await wrapper.setProps({ value: 170 })

    expect(warn).toHaveBeenCalledOnce()
  })

  it('warns again when a different fault replaces the first', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const wrapper = mount(ProgressBar, named({ value: 150 }))

    // The latch is per kind of fault. One latch for the instance would leave the console
    // describing a value problem that the broken `max` has since replaced.
    await wrapper.setProps({ max: 0 })

    expect(warn).toHaveBeenCalledTimes(2)
    expect(warn).toHaveBeenLastCalledWith(expect.stringContaining('`max` must be a finite number'))
  })

  it('leaves an indeterminate bar alone', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const wrapper = mount(ProgressBar, named())

    expect(root(wrapper).attributes('data-out-of-range')).toBeUndefined()
    expect(warn).not.toHaveBeenCalled()
  })
})

describe('the accessible name', () => {
  it('is warned about when nothing supplies one', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    mount(ProgressBar, { props: { value: 40 } })

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('No accessible name'))
  })

  it('falls through to the element holding the role', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const wrapper = mount(ProgressBar, named({ value: 40 }))

    expect(root(wrapper).attributes('aria-label')).toBe('Upload')
    expect(root(wrapper).attributes('role')).toBe('progressbar')
    expect(warn).not.toHaveBeenCalled()
  })

  it('is warned about when the name is an empty string', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    // A reader ignores `aria-label=""`, so it leaves the bar as unnamed as no attribute does.
    mount(ProgressBar, { props: { 'value': 40, 'aria-label': '' } })

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('No accessible name'))
  })

  it('accepts `aria-labelledby` instead', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    mount(ProgressBar, { props: { 'value': 40, 'aria-labelledby': 'upload-heading' } })

    expect(warn).not.toHaveBeenCalled()
  })
})
