import { mount } from '@vue/test-utils'
import Calendar from './Calendar.vue'
import { buildMonthMatrix, weekNumberForRow, yearPage, yearPageStart } from './utils'

/** Pinned so the Today marker and the seeded Visible Month are deterministic. */
const NOW = new Date(2026, 8, 26, 15, 42)

beforeEach(() => {
  // Only `Date` — faking `setTimeout`/`queueMicrotask` too would stall Nuxt's async
  // bootstrap and Vue's `nextTick`, and the whole file times out.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

function mountCalendar(props: Record<string, any> = {}) {
  return mount(Calendar as any, { props: { locale: 'en-US', ...props }, attachTo: document.body })
}

function dayButtons(wrapper: ReturnType<typeof mountCalendar>) {
  return wrapper.findAll('td[role="gridcell"] button')
}

/** The button for a day of the current Visible Month, ignoring Outside Days. */
function findDay(wrapper: ReturnType<typeof mountCalendar>, dayOfMonth: number) {
  return dayButtons(wrapper).find(button =>
    button.text() === String(dayOfMonth) && button.attributes('data-outside') === undefined)!
}

describe('grid shape', () => {
  it('draws 6 rows by default, even for a month that needs 5', () => {
    // September 2026 starts on a Tuesday: 2 leading + 30 days + 3 trailing = 35 cells.
    const wrapper = mountCalendar()
    expect(wrapper.findAll('tbody tr')).toHaveLength(6)
    expect(dayButtons(wrapper)).toHaveLength(42)
  })

  it('falls back to natural rows when fixedWeeks is off', () => {
    const wrapper = mountCalendar({ fixedWeeks: false })
    expect(wrapper.findAll('tbody tr')).toHaveLength(5)
  })

  it('starts the week on Sunday by default and honours weekStartsOn', () => {
    expect(mountCalendar().findAll('thead th').map(th => th.text()))
      .toEqual(['SSunday', 'MMonday', 'TTuesday', 'WWednesday', 'TThursday', 'FFriday', 'SSaturday'])

    const monday = mountCalendar({ weekStartsOn: 1 })
    expect(monday.findAll('thead th')[0]!.text()).toContain('Monday')
  })

  it('marks leading and trailing days as Outside, and leaves them selectable', () => {
    const wrapper = mountCalendar()
    const outside = dayButtons(wrapper).filter(b => b.attributes('data-outside') !== undefined)

    // 2 leading (Aug 30–31) + 3 trailing (Oct 1–3) + a whole padding row of 7.
    expect(outside).toHaveLength(12)
    expect(outside.every(b => b.attributes('disabled') === undefined)).toBe(true)
  })

  it('renders weekday names and the heading in the given locale', () => {
    const wrapper = mountCalendar({ locale: 'ja-JP' })
    expect(wrapper.findAll('thead th')[0]!.text()).toContain('日')
    // Japanese puts the year first; the header parts must follow.
    expect(wrapper.find('.calendar').text()).toContain('2026')
  })
})

describe('body height', () => {
  function minHeight(wrapper: ReturnType<typeof mountCalendar>) {
    return (wrapper.find('.calendar-body').element as HTMLElement).style.minHeight || null
  }

  it('pins to the day grid so a panel swap does not change the height', () => {
    expect(minHeight(mountCalendar())).toBe('calc(6 * var(--calendar-cell) + 1.25rem)')
  })

  /**
   * The pin follows the grid rather than assuming 6 rows. Without this, turning off
   * `fixedWeeks` leaves the panels taller than the day view they replaced.
   */
  it('follows the natural row count when fixedWeeks is off', () => {
    // September 2026 needs 5 rows.
    expect(minHeight(mountCalendar({ fixedWeeks: false })))
      .toBe('calc(5 * var(--calendar-cell) + 1.25rem)')
  })

  it('drops the pin entirely under autoHeight', () => {
    expect(minHeight(mountCalendar({ autoHeight: true }))).toBeNull()
    expect(minHeight(mountCalendar({ autoHeight: true, fixedWeeks: false }))).toBeNull()
  })
})

describe('week numbers', () => {
  it('is hidden unless asked for', () => {
    expect(mountCalendar().find('th[scope="row"]').exists()).toBe(false)
  })

  it('labels a row by the ISO week of its Thursday, not its first cell', () => {
    // Sun Aug 30 2026 is ISO W35, but the row's other six days are W36.
    const wrapper = mountCalendar({ showWeekNumbers: true })
    const rowHeaders = wrapper.findAll('th[scope="row"]')
    expect(rowHeaders[0]!.text()).toBe('36')
    expect(rowHeaders[0]!.attributes('role')).toBe('rowheader')
  })

  it('is not clickable', () => {
    const wrapper = mountCalendar({ showWeekNumbers: true })
    expect(wrapper.find('th[scope="row"] button').exists()).toBe(false)
  })
})

describe('single mode', () => {
  it('emits local midnight, discarding any time component', async () => {
    const wrapper = mountCalendar()
    await findDay(wrapper, 14).trigger('click')

    const [emitted] = wrapper.emitted('update:modelValue')!.at(-1) as [Date]
    expect(emitted).toEqual(new Date(2026, 8, 14, 0, 0, 0, 0))
  })

  it('does nothing when the selected day is clicked again', async () => {
    const wrapper = mountCalendar({ modelValue: new Date(2026, 8, 14) })
    await findDay(wrapper, 14).trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('clears to null on re-click when deselectable', async () => {
    const wrapper = mountCalendar({ modelValue: new Date(2026, 8, 14), deselectable: true })
    await findDay(wrapper, 14).trigger('click')
    expect(wrapper.emitted('update:modelValue')!.at(-1)).toEqual([null])
  })

  it('matches a model value at day granularity, ignoring its time', () => {
    const wrapper = mountCalendar({ modelValue: new Date(2026, 8, 14, 13, 0) })
    expect(findDay(wrapper, 14).attributes('data-selected')).toBe('true')
  })
})

describe('multiple mode', () => {
  it('accumulates and always emits chronological order', async () => {
    const wrapper = mountCalendar({ mode: 'multiple', modelValue: [new Date(2026, 8, 20)] })
    await findDay(wrapper, 5).trigger('click')

    const [emitted] = wrapper.emitted('update:modelValue')!.at(-1) as [Date[]]
    expect(emitted.map(d => d.getDate())).toEqual([5, 20])
  })

  it('toggles a selected date off', async () => {
    const wrapper = mountCalendar({ mode: 'multiple', modelValue: [new Date(2026, 8, 20)] })
    await findDay(wrapper, 20).trigger('click')
    expect(wrapper.emitted('update:modelValue')!.at(-1)).toEqual([[]])
  })
})

describe('validity', () => {
  it('disables dates outside the bounds, inclusively and at day granularity', () => {
    // maxDate carries a time; today must still be selectable. See Q9.
    const wrapper = mountCalendar({ maxDate: NOW })
    expect(findDay(wrapper, 26).attributes('disabled')).toBeUndefined()
    expect(findDay(wrapper, 27).attributes('disabled')).toBeDefined()
  })

  it('renders isDateUnavailable days as focusable and struck through', () => {
    const wrapper = mountCalendar({
      isDateUnavailable: (date: Date) => date.getDate() === 15,
    })
    const cell = findDay(wrapper, 15)
    expect(cell.attributes('disabled')).toBeUndefined()
    expect(cell.attributes('aria-disabled')).toBe('true')
    expect(cell.attributes('data-unavailable')).toBe('true')
  })

  it('lets disabled win when both predicates match', () => {
    const wrapper = mountCalendar({
      isDateDisabled: (date: Date) => date.getDate() === 15,
      isDateUnavailable: (date: Date) => date.getDate() === 15,
    })
    const cell = findDay(wrapper, 15)
    expect(cell.attributes('disabled')).toBeDefined()
    expect(cell.attributes('data-unavailable')).toBeUndefined()
  })

  it('refuses to select an unavailable day', async () => {
    const wrapper = mountCalendar({ isDateUnavailable: (date: Date) => date.getDate() === 15 })
    await findDay(wrapper, 15).trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  /**
   * ADR-0007. QuarterPicker clamps its model when the bounds move; Calendar must not —
   * a parent that derives minDate from modelValue would otherwise loop.
   */
  it('never rewrites a model value that falls out of bounds', async () => {
    const wrapper = mountCalendar({ modelValue: new Date(2026, 8, 14) })
    await wrapper.setProps({ minDate: new Date(2026, 8, 20) })

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    const cell = findDay(wrapper, 14)
    expect(cell.attributes('data-selected')).toBe('true')
    expect(cell.attributes('disabled')).toBeDefined()
  })
})

describe('disabled', () => {
  it('skips the whole calendar in the tab order', () => {
    const wrapper = mountCalendar({ disabled: true })
    expect(dayButtons(wrapper).every(b => b.attributes('tabindex') === '-1')).toBe(true)
    expect(wrapper.findAll('button:not([disabled])')).toHaveLength(0)
  })

  it('freezes the Visible Month', async () => {
    const wrapper = mountCalendar({ disabled: true })
    await wrapper.find('[aria-label="Next month"]').trigger('click')
    expect(wrapper.emitted('update:visibleMonth')).toBeUndefined()
  })
})

describe('accessibility', () => {
  it('names the grid and every cell in full', () => {
    const wrapper = mountCalendar({ modelValue: new Date(2026, 8, 14) })
    expect(wrapper.find('table[role="grid"]').attributes('aria-label')).toBe('September 2026')

    const cell = findDay(wrapper, 14)
    expect(cell.attributes('aria-label')).toBe('Monday, September 14, 2026, selected')
    expect(cell.element.closest('td')!.getAttribute('aria-selected')).toBe('true')
  })

  it('keeps exactly one tabbable cell', () => {
    const wrapper = mountCalendar()
    expect(dayButtons(wrapper).filter(b => b.attributes('tabindex') === '0')).toHaveLength(1)
  })
})

describe('pure date maths', () => {
  it('tiles year pages on multiples of 12, with every year on exactly one page', () => {
    expect(yearPageStart(2026)).toBe(2016)
    expect(yearPage(2026)).toEqual([...Array.from({ length: 12 })].map((_, i) => 2016 + i))
    expect(yearPageStart(2027)).toBe(2016)
    expect(yearPageStart(2028)).toBe(2028)
  })

  it('always finds a Thursday in a row, whatever the week start', () => {
    for (const weekStartsOn of [0, 1, 2, 3, 4, 5, 6] as const) {
      const matrix = buildMonthMatrix({
        visibleMonth: new Date(2026, 8, 1),
        weekStartsOn,
        fixedWeeks: true,
      })
      expect(matrix.every(row => row.some(d => d.getDay() === 4))).toBe(true)
      expect(weekNumberForRow(matrix[0]!)).toBeGreaterThan(0)
    }
  })

  it('produces whole rows of 7 for every month of a leap year', () => {
    for (let month = 0; month < 12; month++) {
      const matrix = buildMonthMatrix({
        visibleMonth: new Date(2024, month, 1),
        weekStartsOn: 0,
        fixedWeeks: false,
      })
      expect(matrix.every(row => row.length === 7)).toBe(true)
      expect(matrix.length).toBeGreaterThanOrEqual(4)
      expect(matrix.length).toBeLessThanOrEqual(6)
    }
  })
})
