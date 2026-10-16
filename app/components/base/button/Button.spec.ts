import { mount } from '@vue/test-utils'
import Button from './Button.vue'

/** The Nuxt test environment registers Icon and Spinner, so both render for real here. */
function mountButton(props: Record<string, any> = {}, attrs: Record<string, any> = {}) {
  return mount(Button, { props, attrs })
}

/** The rendered icon, when the button has exactly one. */
function iconOf(wrapper: ReturnType<typeof mountButton>) {
  return wrapper.get('span.inline-flex svg')
}

/** Tag names of the content span's children, in render order. */
function orderOf(wrapper: ReturnType<typeof mountButton>) {
  return [...wrapper.get('span.inline-flex').element.children].map(el => el.tagName.toLowerCase())
}

describe('click guard', () => {
  it('emits click when nothing blocks it', async () => {
    const wrapper = mountButton()
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('swallows the click while loading', async () => {
    const wrapper = mountButton({ loading: true })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
  })

  it.each([['true'], [true]])('swallows the click when aria-disabled is %o', async (value) => {
    const wrapper = mountButton({}, { 'aria-disabled': value })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
  })

  // These render as aria-disabled="false" / "", which button.css treats as live. The
  // handler has to agree, or the button looks enabled and silently drops clicks.
  it.each([[false], ['false'], ['']])('still emits when aria-disabled is %o', async (value) => {
    const wrapper = mountButton({}, { 'aria-disabled': value })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })
})

describe('type attribute', () => {
  it('defaults to button so it never submits a surrounding form', () => {
    expect(mountButton().attributes('type')).toBe('button')
  })

  it('lets the caller ask for submit', () => {
    expect(mountButton({}, { type: 'submit' }).attributes('type')).toBe('submit')
  })
})

describe('loading state', () => {
  it('marks the button busy and fills the live region', () => {
    const wrapper = mountButton({ loading: true, loadingMsg: 'saving' })
    expect(wrapper.attributes('aria-busy')).toBe('true')
    expect(wrapper.get('[aria-live]').text()).toBe('saving')
    // The spinner itself, not the class that spins it: that class is gated on motion-safe.
    expect(wrapper.find('svg[role="img"]').exists()).toBe(true)
  })

  it('keeps the live region mounted and empty while idle', () => {
    const wrapper = mountButton({ loadingMsg: 'saving' })
    expect(wrapper.attributes('aria-busy')).toBeUndefined()
    expect(wrapper.get('[aria-live]').text()).toBe('')
    expect(wrapper.find('.animate-spin').exists()).toBe(false)
  })

  it('hides the label from the accessibility tree while loading', () => {
    const wrapper = mountButton({ label: 'Save', loading: true })
    expect(wrapper.get('span.inline-flex').classes()).toContain('invisible')
  })
})

describe('icon forms', () => {
  it.each([['icon'], ['trailingIcon']])('treats a string %s the same as the object form', (prop) => {
    const asString = iconOf(mountButton({ [prop]: 'ph:plus', label: 'Add' }))
    const asObject = iconOf(mountButton({ [prop]: { name: 'ph:plus' }, label: 'Add' }))
    expect(asString.attributes('style')).toBe(asObject.attributes('style'))
    expect(asString.classes()).toEqual(asObject.classes())
  })

  it('puts the default icon before the label', () => {
    expect(orderOf(mountButton({ icon: 'ph:plus', label: 'Add' }))).toEqual(['svg', 'span'])
  })

  it('puts a trailing icon after the label', () => {
    expect(orderOf(mountButton({ trailingIcon: 'ph:caret-down', label: 'More' }))).toEqual(['span', 'svg'])
  })

  it('carries both icons at once, in order', () => {
    const wrapper = mountButton({ icon: 'ph:plus', trailingIcon: 'ph:caret-down', label: 'Add' })
    expect(orderOf(wrapper)).toEqual(['svg', 'span', 'svg'])
  })

  // Both margins are logical, so they follow dir. A physical translate-x reversed under
  // dir="rtl" and closed the gap to the label instead of opening it.
  it('opens each icon towards the label and trims the padding on its own side', () => {
    const wrapper = mountButton({ icon: 'ph:plus', trailingIcon: 'ph:caret-down', label: 'Add' })
    const [leading, trailing] = wrapper.findAll('span.inline-flex svg')
    expect(leading!.classes()).toEqual(expect.arrayContaining(['-ms-1', 'me-0.5']))
    expect(trailing!.classes()).toEqual(expect.arrayContaining(['ms-0.5', '-me-1']))
  })

  it.each([['icon'], ['trailingIcon']])('leaves an icon-only button symmetric (%s)', (prop) => {
    const classes = iconOf(mountButton({ [prop]: 'ph:plus' })).classes()
    expect(classes.some(c => /^-?m[se]-/.test(c))).toBe(false)
  })

  it('keeps an explicit size and class from the object form', () => {
    const icon = iconOf(mountButton({ icon: { name: 'ph:plus', size: 20, class: 'rotate-180' } }))
    expect(icon.attributes('style')).toContain('20px')
    expect(icon.classes()).toContain('rotate-180')
  })

  it('renders no icon when the prop is absent', () => {
    expect(mountButton({ label: 'Add' }).find('span.inline-flex svg').exists()).toBe(false)
  })

  it('lets the default slot replace the label and both icons', () => {
    const wrapper = mount(Button, {
      props: { label: 'Add', icon: 'ph:plus', trailingIcon: 'ph:caret-down' },
      slots: { default: '<em>custom</em>' },
    })
    expect(wrapper.find('em').exists()).toBe(true)
    expect(wrapper.find('span.inline-flex svg').exists()).toBe(false)
  })
})
