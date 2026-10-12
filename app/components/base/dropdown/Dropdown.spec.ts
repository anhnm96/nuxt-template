import { mount } from '@vue/test-utils'
import Dropdown from './Dropdown.vue'

/**
 * `dismissOnClickOutside` and `restoreFocus` are both `boolean` props whose documented default
 * is not a literal `false`, which makes their `withDefaults` entries load-bearing. Vue casts an
 * absent `type: Boolean` prop to `false` unless the props object carries a `default` key — and
 * when that regressed, click-outside dismissal silently died for *every* consumer while every
 * other test in the repo stayed green.
 */

const clickOutside = {}

function mountDropdown(props: Record<string, any> = {}) {
  const host = document.createElement('div')
  host.className = 'popovers'
  document.body.appendChild(host)
  return mount(Dropdown, {
    props,
    attachTo: document.body,
    global: { directives: { clickOutside } },
    slots: { default: '<button type="button">open</button>' },
  })
}

afterEach(() => {
  document.querySelectorAll('.popovers').forEach(n => n.remove())
})

describe('dropdown — boolean prop defaults survive Vue Boolean casting', () => {
  it('leaves `dismissOnClickOutside` undefined when it is not passed', () => {
    // `false` here means the `?? triggers.includes('click')` fallback is unreachable.
    const wrapper = mountDropdown()
    expect(wrapper.props('dismissOnClickOutside')).toBeUndefined()
  })

  it('still honours an explicit false', () => {
    const wrapper = mountDropdown({ dismissOnClickOutside: false })
    expect(wrapper.props('dismissOnClickOutside')).toBe(false)
  })

  it('defaults `restoreFocus` to true', () => {
    const wrapper = mountDropdown()
    expect(wrapper.props('restoreFocus')).toBe(true)
  })
})

describe('dropdown — click-outside dismissal', () => {
  /** The directive is a Nuxt plugin that unit mounts never run, so read the wiring instead. */
  function clickOutsideIsWired(wrapper: ReturnType<typeof mountDropdown>) {
    return (wrapper.vm as any).hasClickOutside
  }

  it('is wired by default, with the default `click` trigger', () => {
    expect(clickOutsideIsWired(mountDropdown())).toBe(true)
  })

  it('is wired for an explicit `click` trigger', () => {
    expect(clickOutsideIsWired(mountDropdown({ triggers: ['click'] }))).toBe(true)
  })

  it('is not wired for `hover` alone', () => {
    expect(clickOutsideIsWired(mountDropdown({ triggers: ['hover'] }))).toBe(false)
  })

  it('can be switched on for a host that drives its own opening', () => {
    // Autocomplete's configuration: the trigger is a text input, so it must not toggle on
    // click, but the popover still has to be dismissable with a mouse.
    const wrapper = mountDropdown({ triggers: [], dismissOnClickOutside: true })
    expect(clickOutsideIsWired(wrapper)).toBe(true)
  })

  it('can be switched off for a click trigger', () => {
    expect(clickOutsideIsWired(mountDropdown({ dismissOnClickOutside: false }))).toBe(false)
  })
})
