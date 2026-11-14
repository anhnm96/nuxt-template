import { mount } from '@vue/test-utils'
import { h } from 'vue'
import Tab from './Tab.vue'
import TabList from './TabList.vue'
import Tabs from './Tabs.vue'

function mountTabs(tabs: Record<string, unknown>[], rootProps: Record<string, unknown> = {}) {
  return mount(Tabs, {
    props: { value: 'a', ...rootProps },
    slots: {
      default: () => h(TabList, null, {
        default: () => tabs.map(attrs => h(Tab, attrs as { value: string }, () => String(attrs.value))),
      }),
    },
  })
}

function selected(wrapper: ReturnType<typeof mountTabs>) {
  return wrapper.findAll('[role="tab"][aria-selected="true"]').map(tab => tab.text())
}

describe('tab', () => {
  // No `update:value` listener: `value` is then the initial value and the root keeps the state.
  it('selects on click when the parent does not listen for the model', async () => {
    const wrapper = mountTabs([{ value: 'a' }, { value: 'b' }])

    await wrapper.findAll('[role="tab"]')[1]!.trigger('click')

    expect(selected(wrapper)).toEqual(['b'])
  })

  it('does not select on click when it owns several values', async () => {
    const wrapper = mountTabs([{ value: 'a' }, { value: ['b', 'c'] }])

    await wrapper.findAll('[role="tab"]')[1]!.trigger('click')

    expect(selected(wrapper)).toEqual(['a'])
  })

  it('does not select on click when it carries aria-disabled="true"', async () => {
    const wrapper = mountTabs([{ value: 'a' }, { 'value': 'b', 'as': 'div', 'aria-disabled': 'true' }])

    await wrapper.findAll('[role="tab"]')[1]!.trigger('click')

    expect(selected(wrapper)).toEqual(['a'])
  })

  // A button without a type submits the form that holds it.
  it('renders a button that does not submit a form', () => {
    const wrapper = mountTabs([{ value: 'a' }, { value: 'b', as: 'div' }])
    const [button, div] = wrapper.findAll('[role="tab"]')

    expect(button!.attributes('type')).toBe('button')
    expect(div!.attributes('type')).toBeUndefined()
  })
})
