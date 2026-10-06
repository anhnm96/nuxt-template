/**
 * `DatePicker` is `Dropdown` + `MaskedInput` + `Calendar`. These cover the seams — the mask
 * per period, and the text field agreeing with the grid. `DatePicker.quarter.spec.ts`
 * covers the quarter period, which carries history of its own.
 */
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '../../i18n/locales/en/common.json'
import ja from '../../i18n/locales/ja/common.json'
import { trapFocus } from '../plugins/trapFocus'
import DatePicker from './DatePicker.vue'

const NOW = new Date(2026, 8, 15, 15, 42)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
})

enableAutoUnmount(afterEach)

afterEach(() => {
  vi.useRealTimers()
  document.querySelectorAll('.popovers').forEach(node => node.remove())
  ;(document.activeElement as HTMLElement | null)?.blur?.()
})

function mountPicker(props: Record<string, any> = {}) {
  const host = document.createElement('div')
  host.className = 'popovers'
  document.body.appendChild(host)

  const i18n = createI18n({ legacy: false, locale: 'en', messages: { en, ja } })
  // Nuxt plugins do not run here, so the directive is registered by hand — without it
  // `v-trap-focus` resolves to nothing and the trap test would pass against no trap.
  return mount(DatePicker as any, {
    props,
    global: { plugins: [i18n], directives: { trapFocus } },
    attachTo: document.body,
  })
}

type Wrapper = ReturnType<typeof mountPicker>

const input = (wrapper: Wrapper) => wrapper.find('input')
const cells = () => Array.from(document.querySelectorAll('[role="gridcell"]'))

async function open(wrapper: Wrapper) {
  await input(wrapper).trigger('click')
  await nextTick()
  await nextTick()
}

/** `ArrowDown`/`ArrowUp` on the field: opens if shut, then moves focus into the grid. */
async function arrowInto(wrapper: Wrapper, key = 'ArrowDown') {
  await input(wrapper).trigger('keydown', { key })
  await nextTick()
  await nextTick()
  await nextTick()
}

/** Type into the masked field the way a user would, one value at a time. */
async function type(wrapper: Wrapper, text: string) {
  const el = input(wrapper).element
  el.value = text
  await input(wrapper).trigger('input')
  await nextTick()
}

describe('the mask matches the period', () => {
  it.each([
    ['date', new Date(2026, 8, 14), '2026.09.14'],
    ['month', new Date(2026, 8, 1), '2026.09'],
    ['quarter', new Date(2026, 6, 1), '2026.Q3'],
    ['year', new Date(2026, 0, 1), '2026'],
  ])('renders %s as %s', (period, modelValue, expected) => {
    const wrapper = mountPicker({ period, modelValue })
    expect(input(wrapper).element.value).toBe(expected)
  })

  it('reformats when the period changes', async () => {
    const wrapper = mountPicker({ period: 'date', modelValue: new Date(2026, 8, 14) })
    expect(input(wrapper).element.value).toBe('2026.09.14')

    await wrapper.setProps({ period: 'month' })
    await nextTick()
    await nextTick()
    expect(input(wrapper).element.value).toBe('2026.09')
  })

  /**
   * `DateRangePicker` encodes "no end date" as the year 9999. A mask capped at 2099 clamps
   * it, and because `v-model:typed` syncs back, the model itself becomes 2099 and the
   * unlimited flag stops recognising it on the next load.
   */
  it('round-trips the unlimited sentinel year', () => {
    const wrapper = mountPicker({ period: 'date', modelValue: new Date(9999, 11, 31) })
    expect(input(wrapper).element.value).toBe('9999.12.31')
  })

  /**
   * ADR-0007 keeps a value that has drifted outside the bounds and renders it
   * selected-and-disabled. The field has to show it in full: imask drops the last character
   * of an out-of-range value, so `minDate`/`maxDate` must not reach the mask.
   */
  it.each([
    ['date', new Date(2026, 0, 1), { minDate: new Date(2026, 5, 15) }, '2026.01.01'],
    ['date', new Date(9999, 11, 31), { maxDate: new Date(2030, 11, 31) }, '9999.12.31'],
    ['quarter', new Date(9999, 9, 1), { maxDate: new Date(2030, 11, 31) }, '9999.Q4'],
  ])('renders an out-of-range %s value in full', (period, modelValue, bounds, expected) => {
    const wrapper = mountPicker({ period, modelValue, ...bounds })
    expect(input(wrapper).element.value).toBe(expected)
  })

  it('still renders an in-range value when bounds are set', () => {
    const wrapper = mountPicker({
      period: 'date',
      modelValue: new Date(2026, 8, 14),
      minDate: new Date(2026, 0, 1),
      maxDate: new Date(2027, 0, 1),
    })
    expect(input(wrapper).element.value).toBe('2026.09.14')
  })
})

describe('typing', () => {
  it('parses a full date', async () => {
    const wrapper = mountPicker({ period: 'date' })
    await type(wrapper, '2026.09.14')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([new Date(2026, 8, 14)])
  })

  /** `new Date(2026, 1, 31)` rolls into March, so the parser has to reject it explicitly. */
  it('rejects a day that does not exist', async () => {
    const wrapper = mountPicker({ period: 'date' })
    await type(wrapper, '2026.02.31')
    const emitted = wrapper.emitted('update:modelValue')?.at(-1)?.[0]
    expect(emitted).toBeUndefined()
  })

  it('parses a year on its own', async () => {
    const wrapper = mountPicker({ period: 'year' })
    await type(wrapper, '2030')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([new Date(2030, 0, 1)])
  })
})

describe('the popover', () => {
  it('opens onto the view matching the period', async () => {
    const day = mountPicker({ period: 'date' })
    await open(day)
    expect(document.querySelector('table[role="grid"]')).not.toBeNull()

    document.querySelectorAll('.popovers').forEach(node => node.remove())

    const month = mountPicker({ period: 'month' })
    await open(month)
    expect(document.querySelector('table[role="grid"]')).toBeNull()
    expect(cells()).toHaveLength(12)
  })

  it('commits local midnight and closes', async () => {
    const wrapper = mountPicker({ period: 'date', modelValue: new Date(2026, 8, 1) })
    await open(wrapper)

    const day = Array.from(document.querySelectorAll('td button'))
      .find(b => b.textContent!.trim() === '14'
        && (b as HTMLElement).dataset.outside === undefined) as HTMLElement
    day.click()
    await nextTick()

    expect(wrapper.emitted('update:modelValue')!.at(-1)).toEqual([new Date(2026, 8, 14)])
    expect(input(wrapper).attributes('aria-expanded')).toBe('false')
  })

  it('writes the picked value back into the field', async () => {
    const wrapper = mountPicker({ period: 'month', modelValue: new Date(2026, 8, 1) })
    await open(wrapper)

    const march = cells().find(c => c.textContent!.trim() === 'Mar') as HTMLElement
    march.click()
    await nextTick()
    await wrapper.setProps({ modelValue: new Date(2026, 2, 1) })
    await nextTick()

    expect(input(wrapper).element.value).toBe('2026.03')
  })

  it('stays shut while disabled', async () => {
    const wrapper = mountPicker({ period: 'date', disabled: true })
    await open(wrapper)
    expect(cells()).toHaveLength(0)
  })
})

/**
 * The ARIA half of the combobox contract. `aria-expanded` alone is not it: the attribute is
 * unsupported on the implicit `textbox` role, so without `role="combobox"` a screen reader
 * drops it and never announces the popup.
 */
describe('the field announces its popup', () => {
  it('is a combobox controlling the grid', async () => {
    const wrapper = mountPicker({ period: 'date', modelValue: new Date(2026, 8, 14) })
    const field = input(wrapper)

    expect(field.attributes('role')).toBe('combobox')
    // Not `Dropdown`'s blanket `aria-haspopup="true"`, which announces a menu.
    expect(field.attributes('aria-haspopup')).toBe('grid')
    expect(field.attributes('aria-expanded')).toBe('false')
    // No dangling reference while the popover, and so the id, does not exist.
    expect(field.attributes('aria-controls')).toBeUndefined()

    await open(wrapper)
    expect(field.attributes('aria-expanded')).toBe('true')

    const controls = field.attributes('aria-controls')!
    expect(document.getElementById(controls)?.querySelector('[role="grid"]')).toBeTruthy()
  })
})

describe('focus hand-off', () => {
  /**
   * Real timers: Vue's `patchEvent` skips ancestor invokers when `Date` is frozen, which
   * breaks the bubbling this path relies on. See `DatePicker.quarter.spec.ts` for it.
   */
  beforeEach(() => {
    vi.useRealTimers()
  })

  /**
   * The combobox contract: the popup is visible but DOM focus stays on the field, so the
   * mask keeps receiving keystrokes from someone who clicked in to type.
   */
  it('leaves focus on the field when the popover opens', async () => {
    const wrapper = mountPicker({ period: 'date', modelValue: new Date(2026, 8, 14) })
    input(wrapper).element.focus()
    await open(wrapper)
    await nextTick()

    expect(input(wrapper).attributes('aria-expanded')).toBe('true')
    expect(document.activeElement).toBe(input(wrapper).element)
  })

  /**
   * One keypress both opens and enters. `Dropdown.focusOnOpen` would focus the *first*
   * focusable element in the popover — the header's « button — so the picker owns this.
   */
  it.each(['ArrowDown', 'ArrowUp'])('enters the grid on %s from a shut field', async (key) => {
    const wrapper = mountPicker({ period: 'date', modelValue: new Date(2026, 8, 14) })
    await arrowInto(wrapper, key)

    expect(input(wrapper).attributes('aria-expanded')).toBe('true')
    const active = document.activeElement
    expect(active?.closest('td[role="gridcell"]')).not.toBeNull()
    expect(active?.getAttribute('aria-label')).toContain('September 14')
  })

  it('enters the grid on ArrowDown when already open', async () => {
    const wrapper = mountPicker({ period: 'date', modelValue: new Date(2026, 8, 14) })
    await open(wrapper)
    await arrowInto(wrapper)

    expect(document.activeElement?.getAttribute('aria-label')).toContain('September 14')
  })

  it('lands on the terminal panel cell for a coarse period', async () => {
    const wrapper = mountPicker({ period: 'quarter', modelValue: new Date(2026, 6, 1) })
    await arrowInto(wrapper)

    expect(document.activeElement?.getAttribute('aria-label')).toBe('Q3 2026')
  })

  /**
   * `manageKeyboard: false` switches off `Dropdown`'s `ArrowDown` handler. `Escape` is
   * handled above that gate, so it must survive — and with focus now staying in the field
   * this is the ordinary way the popover gets dismissed, not an edge case.
   */
  it('still closes on Escape from the field', async () => {
    const wrapper = mountPicker({ period: 'date', modelValue: new Date(2026, 8, 14) })
    input(wrapper).element.focus()
    await open(wrapper)
    expect(input(wrapper).attributes('aria-expanded')).toBe('true')

    input(wrapper).element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()

    expect(input(wrapper).attributes('aria-expanded')).toBe('false')
  })

  /**
   * Wiring check for `v-trap-focus`. The ring itself is specced in
   * `plugins/trapFocus.spec.ts`; this only proves the directive reaches the Calendar,
   * so `Tab` cannot walk onto the page behind an open popup.
   */
  it('keeps Tab inside the popover once focus is in the grid', async () => {
    const wrapper = mountPicker({ period: 'date', modelValue: new Date(2026, 8, 14) })
    await arrowInto(wrapper)
    const roving = document.activeElement as HTMLElement
    expect(roving.closest('.calendar')).not.toBeNull()

    roving.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    await nextTick()

    expect(document.activeElement?.closest('.calendar')).not.toBeNull()
    expect(document.activeElement).not.toBe(roving)
  })

  it('does not touch focus while the popover is shut', async () => {
    mountPicker({ period: 'quarter' })
    await nextTick()
    await nextTick()
    expect(document.activeElement).toBe(document.body)
  })

  it('ignores the arrow while disabled', async () => {
    const wrapper = mountPicker({ period: 'date', disabled: true })
    await arrowInto(wrapper)

    expect(cells()).toHaveLength(0)
  })
})

describe('bounds reach the grid', () => {
  it('disables days outside the range', async () => {
    const wrapper = mountPicker({
      period: 'date',
      modelValue: new Date(2026, 8, 15),
      minDate: new Date(2026, 8, 10),
    })
    await open(wrapper)

    const ninth = Array.from(document.querySelectorAll('td button'))
      .find(b => b.textContent!.trim() === '9'
        && (b as HTMLElement).dataset.outside === undefined) as HTMLButtonElement
    expect(ninth.disabled).toBe(true)
  })
})
