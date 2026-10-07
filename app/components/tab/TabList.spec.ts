import type { VueWrapper } from '@vue/test-utils'
import { mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import Tab from './Tab.vue'
import TabList from './TabList.vue'
import Tabs from './Tabs.vue'

interface TabSpec { value: Primitive, attrs?: Record<string, unknown> }

function mountTabs(value: Primitive, tabs: TabSpec[]) {
  const wrapper: VueWrapper = mount(Tabs, {
    props: {
      value,
      'onUpdate:value': (next: Primitive) => wrapper.setProps({ value: next }),
    },
    slots: {
      default: () => h(TabList, null, {
        default: () => tabs.map(tab =>
          h(Tab, { value: tab.value, ...tab.attrs }, () => String(tab.value)),
        ),
      }),
    },
    attachTo: document.body,
  })
  return wrapper
}

function selectedLabel(wrapper: VueWrapper) {
  return wrapper.find('[role="tab"][aria-selected="true"]').text()
}

async function press(wrapper: VueWrapper, from: string, key: string) {
  const tab = wrapper.findAll('[role="tab"]').find(candidate => candidate.text() === from)!
  const element = tab.element as HTMLElement
  element.focus()
  await tab.trigger('keydown', { key })
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('tabList keyboard navigation', () => {
  it('reaches the first tab with End when every later tab is disabled', async () => {
    const wrapper = mountTabs('b', [
      { value: 'a' },
      { value: 'b', attrs: { disabled: true } },
    ])

    await press(wrapper, 'a', 'End')

    expect(selectedLabel(wrapper)).toBe('a')
  })

  it('selects the last viable tab with End', async () => {
    const wrapper = mountTabs('a', [
      { value: 'a' },
      { value: 'b' },
      { value: 'c', attrs: { disabled: true } },
    ])

    await press(wrapper, 'a', 'End')

    expect(selectedLabel(wrapper)).toBe('b')
  })

  // A regression here does not fail: the old walk never terminated, so it hangs the run.
  it('gives up on Home when every tab is disabled', async () => {
    const wrapper = mountTabs('a', [
      { value: 'a', attrs: { disabled: true } },
      { value: 'b', attrs: { disabled: true } },
    ])

    await press(wrapper, 'a', 'Home')

    expect(selectedLabel(wrapper)).toBe('a')
  })

  it('keeps a tab that carries aria-disabled="false"', async () => {
    const wrapper = mountTabs('a', [
      { value: 'a' },
      { value: 'b', attrs: { 'aria-disabled': 'false' } },
    ])

    await press(wrapper, 'a', 'ArrowRight')

    expect(selectedLabel(wrapper)).toBe('b')
  })

  it('wraps at the end of the list', async () => {
    const wrapper = mountTabs('b', [
      { value: 'a' },
      { value: 'b' },
    ])

    await press(wrapper, 'b', 'ArrowRight')

    expect(selectedLabel(wrapper)).toBe('a')
  })

  it('leaves a key that a widget inside the tab already took', async () => {
    const wrapper = mountTabs('a', [
      // A menu trigger prevents the default on the key it opens with.
      { value: 'a', attrs: { onKeydown: (event: KeyboardEvent) => event.preventDefault() } },
      { value: 'b' },
    ])

    await press(wrapper, 'a', 'ArrowRight')

    expect(selectedLabel(wrapper)).toBe('a')
  })

  it('ignores a key raised by content inside a tab', async () => {
    const wrapper = mountTabs('a', [
      { value: 'a' },
      { value: 'b' },
    ])

    const inner = document.createElement('button')
    wrapper.findAll('[role="tab"]')[0]!.element.append(inner)
    inner.focus()
    inner.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    await nextTick()

    expect(selectedLabel(wrapper)).toBe('a')
  })
})
