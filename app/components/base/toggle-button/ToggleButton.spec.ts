import { mount } from '@vue/test-utils'
import ToggleButton from './ToggleButton.vue'

/**
 * The Nuxt test environment registers Button, Icon and Spinner, so the whole tree renders
 * for real here. Every mount carries a name, because an unnamed one warns by design.
 */
function mountToggle(props: Record<string, any> = {}, attrs: Record<string, any> = {}) {
  return mount(ToggleButton, { props: { label: 'Bold', ...props }, attrs })
}

describe('pressed state', () => {
  it('reports unpressed rather than reporting nothing', () => {
    expect(mountToggle().attributes('aria-pressed')).toBe('false')
  })

  it('reports pressed from the model', () => {
    expect(mountToggle({ modelValue: true }).attributes('aria-pressed')).toBe('true')
  })

  // A consumer reads this state from somewhere else, and that source may answer with
  // neither true nor false. Passed through, the attribute would be dropped and the button
  // would announce as a plain button.
  it.each([[undefined], [null]])('coerces %o to unpressed, and keeps the attribute', (value) => {
    expect(mountToggle({ modelValue: value }).attributes('aria-pressed')).toBe('false')
  })

  it('follows the model after it changes', async () => {
    const wrapper = mountToggle({ modelValue: false })
    await wrapper.setProps({ modelValue: true })
    expect(wrapper.attributes('aria-pressed')).toBe('true')
  })
})

describe('who owns the state', () => {
  it('asks for the opposite of what it holds', async () => {
    const wrapper = mountToggle({ modelValue: false })
    await wrapper.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[true]])
  })

  /*
    The contract tiptap depends on. A consumer binds state the editor owns, and a command
    the editor refuses never changes it. The button has to stay where the consumer left it,
    or it draws a state the document does not have.
  */
  it('stays where a controlling consumer left it', async () => {
    const wrapper = mount(ToggleButton, {
      props: { 'label': 'Bold', 'modelValue': false, 'onUpdate:modelValue': () => {} },
    })
    await wrapper.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[true]])
    expect(wrapper.attributes('aria-pressed')).toBe('false')
  })

  it('holds its own state when no consumer owns it', async () => {
    const wrapper = mountToggle()
    await wrapper.trigger('click')
    expect(wrapper.attributes('aria-pressed')).toBe('true')
  })

  it('re-emits the click', async () => {
    const wrapper = mountToggle()
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })
})

describe('disabled', () => {
  it('inherits the aria-disabled guard and changes nothing', async () => {
    const wrapper = mountToggle({}, { 'aria-disabled': 'true' })
    await wrapper.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.emitted('click')).toBeUndefined()
  })

  // A disabled toggle still has a state. Dropping the attribute announces a plain button.
  it('keeps reporting its state while disabled', () => {
    const wrapper = mountToggle({ modelValue: true }, { disabled: true })
    expect(wrapper.attributes('aria-pressed')).toBe('true')
  })
})

describe('the name', () => {
  it('warns when nothing names it', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mount(ToggleButton, { props: { icon: 'i-fluent:text-bold-16-filled' } })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('No accessible name'))
    warn.mockRestore()
  })

  it.each([
    ['label', { label: 'Bold' }, {}],
    ['aria-label', {}, { 'aria-label': 'Bold' }],
    ['aria-labelledby', {}, { 'aria-labelledby': 'bold-label' }],
  ])('accepts %s as the name', (_source, props, attrs) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mount(ToggleButton, { props, attrs })
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('treats a blank name as no name', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mount(ToggleButton, { props: {}, attrs: { 'aria-label': '   ' } })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('No accessible name'))
    warn.mockRestore()
  })

  // Renaming is the other toggle pattern, and mixing the two announces the state twice.
  it('warns when the name moves with the state', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const wrapper = mountToggle({ label: 'Mute' })
    await wrapper.setProps({ label: 'Unmute' })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('accessible name changed'))
    warn.mockRestore()
  })

  it('stays quiet when a name arrives late', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const wrapper = mount(ToggleButton, { props: { label: undefined } })
    warn.mockClear()
    await wrapper.setProps({ label: 'Bold' })
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})

describe('what it passes through', () => {
  it('defaults to button so it never submits a surrounding form', () => {
    expect(mountToggle().attributes('type')).toBe('button')
  })

  it('draws the label and the icon Button would draw', () => {
    const wrapper = mountToggle({ icon: 'i-fluent:text-bold-16-filled' })
    expect(wrapper.text()).toContain('Bold')
    expect(wrapper.find('svg').exists()).toBe(true)
  })

  it('lets the default slot replace the content', () => {
    const wrapper = mount(ToggleButton, {
      props: { label: 'Bold', icon: 'i-fluent:text-bold-16-filled' },
      slots: { default: '<em>B</em>' },
    })
    expect(wrapper.html()).toContain('<em>B</em>')
    expect(wrapper.find('svg').exists()).toBe(false)
  })
})
