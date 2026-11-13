import type { VueWrapper } from '@vue/test-utils'
import type { SetupContext } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { h } from 'vue'
import { realClickOutside } from '../../../../tests/utils/clickOutside'
import { addPopoverHost, removePopoverHosts } from '../../../../tests/utils/popoverHost'
import TimePicker from './TimePicker.vue'

// Stub PopoverSurface so the popover body is always rendered in place (no floating-ui,
// no teleport and no v-click-outside in the test env).
const PopoverSurfaceStub = {
  name: 'PopoverSurface',
  props: ['popover', 'transition', 'whiteList', 'popoverProps', 'slotName', 'styleVars'],
  setup(_props: unknown, { slots }: SetupContext) {
    return () => h('div', slots.default?.())
  },
} as any

// `attach` mounts into document.body, needed whenever a test asserts on
// focus/selection: focus() is a no-op on a detached element.
function mountPicker(props: Record<string, unknown> = {}, attach = false) {
  return mount(TimePicker, {
    props,
    attachTo: attach ? document.body : undefined,
    global: { stubs: { PopoverSurface: PopoverSurfaceStub } },
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
    /** `09:MM` is a Partial Entry: it stays in the field and the model waits (ADR-0015). */
    it('emits nothing until both columns hold a value', async () => {
      const wrapper = mountPicker()
      await hourButtons(wrapper)[9]!.trigger('click') // "09"
      expect((wrapper.get('input').element as HTMLInputElement).value).toBe('09:MM')
      expect(wrapper.emitted('update:modelValue')).toBeUndefined()
      await minuteButtons(wrapper)[30]!.trigger('click') // "30"
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['09:30'])
    })

    it('emits the padded minute and keeps the hour when a minute is clicked', async () => {
      const wrapper = mountPicker({ modelValue: '10:00' })
      await minuteButtons(wrapper)[30]!.trigger('click') // "30"
      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted?.at(-1)).toEqual(['10:30'])
    })

    /** A blur would pad `09:MM` to `09:00` and scroll the list before the click ends. */
    it('keeps focus in the field when an option is pressed', () => {
      const wrapper = mountPicker()
      for (const button of [hourButtons(wrapper)[9]!, minuteButtons(wrapper)[45]!]) {
        const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
        button.element.dispatchEvent(event)
        expect(event.defaultPrevented).toBe(true)
      }
    })

    /** A column is focusable (`tabindex="-1"`), so a press on its padding would take focus too. */
    it('keeps focus in the field when a column itself is pressed', () => {
      const wrapper = mountPicker()
      for (const column of wrapper.findAll('[role="listbox"]')) {
        const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
        column.element.dispatchEvent(event)
        expect(event.defaultPrevented).toBe(true)
      }
    })

    /** Consumers store `HH:mm`. The Unmasked binding used to emit `0945` here (ADR-0015). */
    it('keeps the HH:mm shape of a consumer value', async () => {
      const wrapper = mountPicker({ modelValue: '09:30' })
      await minuteButtons(wrapper)[45]!.trigger('click') // "45"
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['09:45'])
    })

    /** With `lazy: false` the empty mask reads `HH:MM`; the model gets `''` instead. */
    it('emits an empty string when the field is cleared', async () => {
      const wrapper = mountPicker({ modelValue: '09:30' })
      const el = wrapper.get('input').element as HTMLInputElement
      el.value = ''
      el.setSelectionRange(0, 0)
      el.dispatchEvent(new Event('input', { bubbles: true }))
      await nextTick()
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([''])
    })

    /** imask fills the empty hour, and the filled value reaches the model (ADR-0015). */
    it('fills an empty hour with 00 when a minute is clicked', async () => {
      const wrapper = mountPicker()
      await minuteButtons(wrapper)[30]!.trigger('click') // "30"
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['00:30'])
    })
  })

  describe('focus after clicking an option', () => {
    it('returns focus to the input and selects the hour segment', async () => {
      const wrapper = mountPicker({}, true)
      const input = wrapper.get('input').element as HTMLInputElement
      await hourButtons(wrapper)[9]!.trigger('click') // "09"
      await flushPromises() // focusColumn selects on nextTick

      expect(document.activeElement).toBe(input)
      expect([input.selectionStart, input.selectionEnd]).toEqual([0, 2])
      expect(input.value.slice(0, 2)).toBe('09')
      wrapper.unmount()
    })

    it('returns focus to the input and selects the minute segment', async () => {
      const wrapper = mountPicker({ modelValue: '10' }, true)
      const input = wrapper.get('input').element as HTMLInputElement
      await minuteButtons(wrapper)[30]!.trigger('click') // "30"
      await flushPromises()

      expect(document.activeElement).toBe(input)
      expect([input.selectionStart, input.selectionEnd]).toEqual([3, 5])
      expect(input.value).toBe('10:30')
      wrapper.unmount()
    })

    it('moves the active column to the clicked column', async () => {
      const wrapper = mountPicker({ modelValue: '10' }, true)
      await minuteButtons(wrapper)[30]!.trigger('click')
      await flushPromises()
      expect(focusedColumn(wrapper)).toBe('minute')

      await hourButtons(wrapper)[9]!.trigger('click')
      await flushPromises()
      expect(focusedColumn(wrapper)).toBe('hour')
      wrapper.unmount()
    })
  })

  describe('column focus (keyboard)', () => {
    it('focuses the hour column initially', () => {
      const wrapper = mountPicker()
      expect(focusedColumn(wrapper)).toBe('hour')
    })

    /** Opens with the caret in the hour, so the hour column is active. */
    async function openInHour() {
      const wrapper = mountPicker({}, true)
      const input = wrapper.get('input')
      const el = input.element as HTMLInputElement
      el.focus()
      el.setSelectionRange(0, 0)
      await input.trigger('keydown', { key: 'ArrowDown' })
      await flushPromises() // let the open watcher settle before tabbing
      return { wrapper, input }
    }

    /** Returns whether the component kept the key from moving focus. */
    function pressTab(input: ReturnType<VueWrapper['get']>, shiftKey = false) {
      const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true })
      input.element.dispatchEvent(event)
      return event.defaultPrevented
    }

    it('moves from the hour column to the minute column with Tab', async () => {
      const { wrapper, input } = await openInHour()
      expect(focusedColumn(wrapper)).toBe('hour')
      expect(pressTab(input)).toBe(true)
      await nextTick()
      expect(focusedColumn(wrapper)).toBe('minute')
      wrapper.unmount()
    })

    /** Without this, a keyboard user could leave an open field only with `Escape`. */
    it('closes and lets focus move on with Tab from the minute column', async () => {
      const { wrapper, input } = await openInHour()
      pressTab(input)
      await nextTick()
      expect(pressTab(input)).toBe(false)
      await nextTick()
      expect(input.attributes('aria-expanded')).toBe('false')
      wrapper.unmount()
    })

    it('moves back to the hour column with Shift+Tab, then closes', async () => {
      const { wrapper, input } = await openInHour()
      pressTab(input)
      await nextTick()
      expect(pressTab(input, true)).toBe(true)
      await nextTick()
      expect(focusedColumn(wrapper)).toBe('hour')
      expect(pressTab(input, true)).toBe(false)
      await nextTick()
      expect(input.attributes('aria-expanded')).toBe('false')
      wrapper.unmount()
    })

    it('ignores Tab when closed', async () => {
      const wrapper = mountPicker()
      await wrapper.get('input').trigger('keydown', { key: 'Tab' })
      expect(focusedColumn(wrapper)).toBe('hour')
    })
  })

  /**
   * A click in the field places the caret. Closing pads the entry, so a click that closed the
   * popover would turn `09:MM` into `09:00` before the user types a minute.
   */
  describe('clicking the field', () => {
    it('opens the popover and never closes it', async () => {
      const wrapper = mountPicker()
      const input = wrapper.get('input')
      await input.trigger('click')
      expect(input.attributes('aria-expanded')).toBe('true')
      await input.trigger('click')
      expect(input.attributes('aria-expanded')).toBe('true')
    })

    /** A click no longer reopens the popover, so the open watcher cannot read the caret. */
    it('moves the active column to the caret while open', async () => {
      const wrapper = mountPicker({ modelValue: '09:30' }, true)
      const input = wrapper.get('input')
      const el = input.element as HTMLInputElement
      el.focus()
      el.setSelectionRange(0, 0)
      await input.trigger('click')
      await flushPromises()
      expect(focusedColumn(wrapper)).toBe('hour')

      el.setSelectionRange(4, 4) // the browser places the caret before `click` fires
      await input.trigger('click')
      expect(focusedColumn(wrapper)).toBe('minute')
      expect(input.attributes('aria-activedescendant')).toBe(minuteButtons(wrapper)[30]!.attributes('id'))
      wrapper.unmount()
    })

    it('keeps a Partial Entry when clicked while open', async () => {
      const wrapper = mountPicker()
      const input = wrapper.get('input')
      await input.trigger('click')
      await hourButtons(wrapper)[9]!.trigger('click') // "09"
      await input.trigger('click')
      await flushPromises()
      expect((input.element as HTMLInputElement).value).toBe('09:MM')
      expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    })
  })

  /**
   * The stub above has no click-outside. The real surface dismisses on a `click` that reaches
   * `document.body`, and the field is outside the surface.
   */
  describe('clicking the field with the real popover', () => {
    afterEach(() => removePopoverHosts())

    it('stays open and keeps a Partial Entry', async () => {
      addPopoverHost()
      const wrapper = mount(TimePicker, {
        attachTo: document.body,
        global: { directives: { clickOutside: realClickOutside() } },
      })
      const input = wrapper.get('input')
      const el = input.element as HTMLInputElement
      el.focus()
      el.setSelectionRange(0, 0)
      await input.trigger('keydown', { key: 'ArrowDown' }) // opens, selects hour 00
      await flushPromises()
      // Click-outside attaches its listener one frame after the surface mounts.
      await new Promise(resolve => requestAnimationFrame(resolve))

      await input.trigger('click')
      await flushPromises()
      expect(input.attributes('aria-expanded')).toBe('true')
      expect(el.value).toBe('00:MM')
      expect(wrapper.emitted('update:modelValue')).toBeUndefined()
      wrapper.unmount()
    })

    /** Focus never leaves the field, so there is nothing to restore (CONTEXT.md — Field Popover). */
    it('does not pull focus back into the field after a click elsewhere', async () => {
      addPopoverHost()
      const wrapper = mount(TimePicker, {
        attachTo: document.body,
        global: { directives: { clickOutside: realClickOutside() } },
      })
      const input = wrapper.get('input')
      const el = input.element as HTMLInputElement
      el.focus()
      await input.trigger('keydown', { key: 'ArrowDown' })
      await flushPromises()
      await new Promise(resolve => requestAnimationFrame(resolve))

      // A click on an empty part of the page: focus falls to `<body>`, then click-outside runs.
      el.blur()
      document.body.click()
      await flushPromises()
      await new Promise(resolve => setTimeout(resolve, 10)) // the restore runs on a timer
      expect(input.attributes('aria-expanded')).toBe('false')
      expect(document.activeElement).not.toBe(el)
      wrapper.unmount()
    })
  })

  /** Focus stays in the field, so the field names the option that the keys move. */
  describe('combobox semantics', () => {
    it('is a collapsed combobox that controls nothing while closed', () => {
      const input = mountPicker().get('input')
      expect(input.attributes('role')).toBe('combobox')
      expect(input.attributes('aria-haspopup')).toBe('listbox')
      expect(input.attributes('aria-expanded')).toBe('false')
      expect(input.attributes('aria-controls')).toBeUndefined()
      expect(input.attributes('aria-activedescendant')).toBeUndefined()
    })

    it('controls both columns while open', async () => {
      const wrapper = mountPicker()
      await wrapper.get('input').trigger('keydown', { key: 'ArrowDown' })
      const [hours, minutes] = wrapper.findAll('[role="listbox"]')
      const input = wrapper.get('input')
      expect(input.attributes('aria-expanded')).toBe('true')
      expect(input.attributes('aria-controls')).toBe(`${hours!.attributes('id')} ${minutes!.attributes('id')}`)
    })

    it('points at the selected option of the active column', async () => {
      // Opening reads the caret to choose the active column, so the caret starts in the hour.
      const wrapper = mountPicker({}, true)
      const input = wrapper.get('input')
      const el = input.element as HTMLInputElement
      el.focus()
      el.setSelectionRange(0, 0)
      await input.trigger('keydown', { key: 'ArrowDown' }) // opens, selects hour 00
      await flushPromises()
      expect(input.attributes('aria-activedescendant')).toBe(hourButtons(wrapper)[0]!.attributes('id'))

      await input.trigger('keydown', { key: 'Tab' }) // the minute column has no selection yet
      expect(input.attributes('aria-activedescendant')).toBeUndefined()

      await input.trigger('keydown', { key: 'ArrowUp' }) // selects minute 59
      expect(input.attributes('aria-activedescendant')).toBe(minuteButtons(wrapper)[59]!.attributes('id'))
      wrapper.unmount()
    })

    it('names each column, and keeps the options out of the Tab order', () => {
      const wrapper = mountPicker({ hoursLabel: '時', minutesLabel: '分' })
      const [hours, minutes] = wrapper.findAll('[role="listbox"]')
      expect(hours!.attributes('aria-label')).toBe('時')
      expect(minutes!.attributes('aria-label')).toBe('分')
      expect(hourButtons(wrapper).every(b => b.attributes('tabindex') === '-1')).toBe(true)
    })
  })

  describe('stepping with arrow keys', () => {
    it('selects the first hour on ArrowDown from empty', async () => {
      const wrapper = mountPicker()
      await wrapper.get('input').trigger('keydown', { key: 'ArrowDown' })
      expect((wrapper.get('input').element as HTMLInputElement).value).toBe('00:MM')
    })

    it('selects the last hour on ArrowUp from empty', async () => {
      const wrapper = mountPicker()
      await wrapper.get('input').trigger('keydown', { key: 'ArrowUp' })
      expect((wrapper.get('input').element as HTMLInputElement).value).toBe('23:MM')
    })
  })
})
