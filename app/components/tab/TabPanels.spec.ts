import { mount } from '@vue/test-utils'
import { defineComponent, Fragment, h, nextTick, ref } from 'vue'
import TabPanel from './TabPanel.vue'
import TabPanels from './TabPanels.vue'
import Tabs from './Tabs.vue'

function mountPanels(
  value: Primitive,
  children: () => unknown[],
  panelsProps: Record<string, unknown> = {},
) {
  return mount(Tabs, {
    props: { value },
    slots: { default: () => h(TabPanels, panelsProps, { default: children }) },
  })
}

describe('tabPanels', () => {
  it('renders only the panel whose value matches the model', () => {
    const wrapper = mountPanels('a', () => [
      h(TabPanel, { value: 'a' }, () => 'panel a'),
      h(TabPanel, { value: 'b' }, () => 'panel b'),
    ])

    expect(wrapper.text()).toContain('panel a')
    expect(wrapper.text()).not.toContain('panel b')
  })

  it('matches a panel that owns several values', () => {
    const wrapper = mountPanels('b', () => [
      h(TabPanel, { value: ['a', 'b'] }, () => 'grouped'),
    ])

    expect(wrapper.text()).toContain('grouped')
  })

  it('renders a child that is not a panel exactly once, matching value prop or not', () => {
    const wrapper = mountPanels('a', () => [
      h('p', { value: 'a' }, 'passthrough'),
    ])

    expect(wrapper.findAll('p')).toHaveLength(1)
  })

  it('finds the panels that a fragment wraps, as a v-for produces', () => {
    const wrapper = mountPanels('b', () => [
      h(Fragment, null, ['a', 'b'].map(value =>
        h(TabPanel, { value, key: value }, () => `panel ${value}`),
      )),
    ])

    expect(wrapper.text()).toContain('panel b')
    expect(wrapper.text()).not.toContain('panel a')
  })

  it('hides the inactive panels and keeps them mounted under eager', () => {
    const wrapper = mountPanels('a', () => [
      h(TabPanel, { value: 'a' }, () => 'panel a'),
      h(TabPanel, { value: 'b' }, () => 'panel b'),
    ], { eager: true })

    const panels = wrapper.findAll('[role="tabpanel"]')
    expect(panels).toHaveLength(2)
    expect(panels[0]!.attributes('style') ?? '').not.toContain('display: none')
    expect(panels[1]!.attributes('style')).toContain('display: none')
  })
})

describe('tabPanels keepAlive', () => {
  const Counter = defineComponent({
    setup() {
      const count = ref(0)
      return () => h('button', { class: 'counter', onClick: () => count.value++ }, String(count.value))
    },
  })

  /** Each panel holds its own counter, so a restored panel shows the count it left with. */
  function mountKeepAlive(label: () => string) {
    const wrapper = mount(Tabs, {
      props: {
        'value': 'a',
        'onUpdate:value': (next: Primitive) => wrapper.setProps({ value: next }),
      },
      slots: {
        default: () => h(TabPanels, { keepAlive: true }, {
          default: () => {
            // Read in the `TabPanels` slot itself, so a change re-runs the slot and
            // rebuilds the panel vnodes.
            const text = label()
            return [
              h(TabPanel, { value: 'a' }, () => [text, h(Counter)]),
              h(TabPanel, { value: 'b' }, () => [text, h(Counter)]),
            ]
          },
        }),
      },
    })
    return wrapper
  }

  it('restores a panel of a v-for after a panel outside it was active', async () => {
    const wrapper = mount(Tabs, {
      props: {
        'value': 'a',
        'onUpdate:value': (next: Primitive) => wrapper.setProps({ value: next }),
      },
      slots: {
        default: () => h(TabPanels, { keepAlive: true }, {
          default: () => [
            h(Fragment, null, ['a', 'b'].map(value =>
              h(TabPanel, { value, key: value }, () => h(Counter)),
            )),
            h(TabPanel, { value: 'settings' }, () => 'settings'),
          ],
        }),
      },
    })

    await wrapper.get('.counter').trigger('click')
    expect(wrapper.get('.counter').text()).toBe('1')

    await wrapper.setProps({ value: 'settings' })
    await wrapper.setProps({ value: 'a' })

    expect(wrapper.get('.counter').text()).toBe('1')
  })

  it('restores a panel after the model held a value with no panel', async () => {
    const wrapper = mountKeepAlive(() => 'panels')

    await wrapper.get('.counter').trigger('click')
    expect(wrapper.get('.counter').text()).toBe('1')

    await wrapper.setProps({ value: 'no-panel' })
    expect(wrapper.find('.counter').exists()).toBe(false)

    await wrapper.setProps({ value: 'a' })
    expect(wrapper.get('.counter').text()).toBe('1')
  })

  it('restores a panel after the slot re-runs', async () => {
    // The slot reads parent state, as a `v-for` or a `v-if` over panels does, so it
    // produces new vnodes when that state changes.
    const tick = ref(0)
    const wrapper = mountKeepAlive(() => `panels-${tick.value}`)

    await wrapper.get('.counter').trigger('click')
    await wrapper.get('.counter').trigger('click')
    expect(wrapper.get('.counter').text()).toBe('2')

    tick.value = 1
    await nextTick()

    await wrapper.setProps({ value: 'b' })
    await nextTick()
    expect(wrapper.get('.counter').text()).toBe('0')

    await wrapper.setProps({ value: 'a' })
    await nextTick()
    expect(wrapper.get('.counter').text()).toBe('2')
  })
})
