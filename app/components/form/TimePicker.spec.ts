import type { VueWrapper } from '@vue/test-utils'
import type { SetupContext } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { h } from 'vue'
import TimePicker from './TimePicker.vue'

// Stub Dropdown so the popover slot is always rendered (no floating-ui /
// v-click-outside in the test env) and `open` is a no-op two-way binding.
const DropdownStub = {
  name: 'Dropdown',
  props: ['open', 'placement', 'focusOnOpen'],
  emits: ['update:open'],
  setup(_props: unknown, { slots }: SetupContext) {
    return () => h('div', [
      slots.default?.(),
      slots.popover?.({ toggleShow: () => {} }),
    ])
  },
} as any

function mountPicker(props: Record<string, unknown> = {}) {
  return mount(TimePicker, {
    props,
    global: { stubs: { Dropdown: DropdownStub } },
  }) as VueWrapper
}

function hourButtons(wrapper: VueWrapper) {
  return wrapper.findAll('[role="listbox"]')[0]!.findAll('button')
}
function minuteButtons(wrapper: VueWrapper) {
  return wrapper.findAll('[role="listbox"]')[1]!.findAll('button')
}

// Which column currently carries `data-focus` (caret handling in happy-dom is
// unreliable, so tests assert the active column rather than the caret offset).
function focusedColumn(wrapper: VueWrapper): 'hour' | 'minute' | null {
  if (hourButtons(wrapper)[0]!.attributes('data-focus') === 'true') return 'hour'
  if (minuteButtons(wrapper)[0]!.attributes('data-focus') === 'true') return 'minute'
  return null
}

describe('TimePicker.vue', () => {
  describe('option rendering', () => {
    it('renders 24 hours and 60 minutes by default', () => {
      const wrapper = mountPicker()
      expect(hourButtons(wrapper)).toHaveLength(24)
      expect(minuteButtons(wrapper)).toHaveLength(60)
    })

    it('respects hourStep and minuteStep', () => {
      const wrapper = mountPicker({ hourStep: 2, minuteStep: 15 })
      const hours = hourButtons(wrapper)
      const minutes = minuteButtons(wrapper)
      expect(hours).toHaveLength(12)
      expect(minutes).toHaveLength(4)
      expect(hours.map(b => b.attributes('data-value'))).toEqual(
        ['00', '02', '04', '06', '08', '10', '12', '14', '16', '18', '20', '22'],
      )
      expect(minutes.map(b => b.attributes('data-value'))).toEqual(['00', '15', '30', '45'])
    })

    it('zero-pads the option values', () => {
      const wrapper = mountPicker()
      expect(hourButtons(wrapper)[5]!.attributes('data-value')).toBe('05')
      expect(minuteButtons(wrapper)[9]!.attributes('data-value')).toBe('09')
    })
  })

  describe('selecting options', () => {
    it('emits the padded hour and keeps the minute when an hour is clicked', async () => {
      const wrapper = mountPicker()
      await hourButtons(wrapper)[9]!.trigger('click') // "09"
      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted?.at(-1)).toEqual(['09'])
    })

    it('emits the padded minute and keeps the hour when a minute is clicked', async () => {
      const wrapper = mountPicker({ modelValue: '10' })
      await minuteButtons(wrapper)[30]!.trigger('click') // "30"
      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted?.at(-1)).toEqual(['1030'])
    })
  })

  describe('column focus (keyboard)', () => {
    it('focuses the hour column initially', () => {
      const wrapper = mountPicker()
      expect(focusedColumn(wrapper)).toBe('hour')
    })

    it('flips the active column with Tab once open', async () => {
      const wrapper = mountPicker()
      const input = wrapper.get('input')
      await input.trigger('keydown', { key: 'ArrowDown' }) // opens the dropdown
      await flushPromises() // let the open watcher settle before tabbing
      const before = focusedColumn(wrapper)
      await input.trigger('keydown', { key: 'Tab' })
      expect(focusedColumn(wrapper)).toBe(before === 'hour' ? 'minute' : 'hour')

      await input.trigger('keydown', { key: 'Tab' })
      expect(focusedColumn(wrapper)).toBe(before)
    })

    it('ignores Tab when closed', async () => {
      const wrapper = mountPicker()
      await wrapper.get('input').trigger('keydown', { key: 'Tab' })
      expect(focusedColumn(wrapper)).toBe('hour')
    })
  })

  describe('stepping with arrow keys', () => {
    it('selects the first hour on ArrowDown from empty', async () => {
      const wrapper = mountPicker()
      await wrapper.get('input').trigger('keydown', { key: 'ArrowDown' })
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['00'])
    })

    it('selects the last hour on ArrowUp from empty', async () => {
      const wrapper = mountPicker()
      await wrapper.get('input').trigger('keydown', { key: 'ArrowUp' })
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['23'])
    })
  })
})
