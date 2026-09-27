import { mount } from '@vue/test-utils'
import Calendar from './Calendar.vue'
import { endOfPeriod, isSamePeriod, startOfPeriod } from './utils'

/** Pinned so Today lands in September / Q3 / 2026. */
const NOW = new Date(2026, 8, 15, 15, 42)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

function mountCalendar(props: Record<string, any> = {}) {
  return mount(Calendar as any, { props: { locale: 'en-US', ...props }, attachTo: document.body })
}

type Wrapper = ReturnType<typeof mountCalendar>

const cells = (wrapper: Wrapper) => wrapper.findAll('[role="gridcell"]')
const emitted = (wrapper: Wrapper) => wrapper.emitted('update:modelValue')?.at(-1)?.[0] as Date
const dayGrid = (wrapper: Wrapper) => wrapper.find('table[role="grid"]')
function press(wrapper: Wrapper, key: string) {
  return wrapper.find('[role="grid"]').trigger('keydown', { key })
}

function cellNamed(wrapper: Wrapper, text: string) {
  return cells(wrapper).find(cell => cell.text() === text)!
}

describe('the value is always startOf(period)', () => {
  it('month emits the 1st', async () => {
    const wrapper = mountCalendar({ period: 'month' })
    await cellNamed(wrapper, 'Sep').trigger('click')
    expect(emitted(wrapper)).toEqual(new Date(2026, 8, 1))
  })

  it('quarter emits the quarter start, not the month clicked', async () => {
    const wrapper = mountCalendar({ period: 'quarter' })
    await cellNamed(wrapper, 'Q3').trigger('click')
    expect(emitted(wrapper)).toEqual(new Date(2026, 6, 1))
  })

  it('year emits 1 January', async () => {
    const wrapper = mountCalendar({ period: 'year' })
    await cellNamed(wrapper, '2026').trigger('click')
    expect(emitted(wrapper)).toEqual(new Date(2026, 0, 1))
  })

  /** `period: 'date'` is not a special case — the value was always `startOf('day')`. */
  it('leaves the default period behaving exactly as before', async () => {
    const wrapper = mountCalendar()
    const day = wrapper.findAll('td button')
      .find(b => b.text() === '14' && b.attributes('data-outside') === undefined)!
    await day.trigger('click')
    expect(emitted(wrapper)).toEqual(new Date(2026, 8, 14))
  })
})

describe('comparison happens at period granularity', () => {
  /** ADR-0007 still holds: an incoming value is matched, never rewritten. */
  it('matches a stored mid-period date without rewriting it', () => {
    const wrapper = mountCalendar({ period: 'quarter', modelValue: new Date(2026, 7, 15) })
    expect(cellNamed(wrapper, 'Q3').attributes('data-selected')).toBe('true')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('marks the period containing today', () => {
    expect(cellNamed(mountCalendar({ period: 'quarter' }), 'Q3').attributes('data-today')).toBe('true')
    expect(cellNamed(mountCalendar({ period: 'month' }), 'Sep').attributes('data-today')).toBe('true')
    expect(cellNamed(mountCalendar({ period: 'year' }), '2026').attributes('data-today')).toBe('true')
  })

  it('toggles a selected period off in multiple mode', async () => {
    const wrapper = mountCalendar({
      period: 'quarter',
      mode: 'multiple',
      modelValue: [new Date(2026, 6, 1)],
    })
    await cellNamed(wrapper, 'Q3').trigger('click')
    expect(wrapper.emitted('update:modelValue')!.at(-1)).toEqual([[]])
  })

  it('keeps multiple selections chronological', async () => {
    const wrapper = mountCalendar({
      period: 'quarter',
      mode: 'multiple',
      modelValue: [new Date(2026, 9, 1)],
    })
    await cellNamed(wrapper, 'Q1').trigger('click')
    const value = emitted(wrapper) as unknown as Date[]
    expect(value.map(d => d.getMonth())).toEqual([0, 9])
  })
})

describe('bounds are floored to the period', () => {
  /** ADR-0008: a period that merely overlaps the range is selectable. */
  it('keeps a partially in-range period selectable', () => {
    const wrapper = mountCalendar({ period: 'month', minDate: new Date(2026, 5, 15) })
    expect(cellNamed(wrapper, 'Jun').attributes('disabled')).toBeUndefined()
    expect(cellNamed(wrapper, 'May').attributes('disabled')).toBeDefined()
  })

  it('and emits a value earlier than minDate, deliberately', async () => {
    const minDate = new Date(2026, 5, 15)
    const wrapper = mountCalendar({ period: 'month', minDate })
    await cellNamed(wrapper, 'Jun').trigger('click')

    // 1 June precedes the literal bound. Consumers floor their own bound to match.
    expect(emitted(wrapper)).toEqual(new Date(2026, 5, 1))
    expect(emitted(wrapper)).toEqual(startOfPeriod(minDate, 'month'))
  })

  it('applies the predicates only to the unit being selected', () => {
    const wrapper = mountCalendar({
      period: 'quarter',
      isDateDisabled: (d: Date) => d.getMonth() === 0,
    })
    expect(cellNamed(wrapper, 'Q1').attributes('disabled')).toBeDefined()
    expect(cellNamed(wrapper, 'Q2').attributes('disabled')).toBeUndefined()
  })

  /** A day-level predicate must not disable whole months it was never asked about. */
  it('ignores the predicates on a navigational panel', async () => {
    const wrapper = mountCalendar({ isDateDisabled: () => true })
    await wrapper.find('[aria-label="Choose month"]').trigger('click')
    await nextTick()
    expect(cells(wrapper).every(c => c.attributes('disabled') === undefined)).toBe(true)
  })

  it('renders an unavailable period struck through but focusable', () => {
    const wrapper = mountCalendar({
      period: 'quarter',
      isDateUnavailable: (d: Date) => d.getMonth() === 6,
    })
    const q3 = cellNamed(wrapper, 'Q3')
    expect(q3.attributes('disabled')).toBeUndefined()
    expect(q3.attributes('aria-disabled')).toBe('true')
    expect(q3.attributes('data-unavailable')).toBe('true')
  })

  it('refuses to commit an unavailable period', async () => {
    const wrapper = mountCalendar({
      period: 'quarter',
      isDateUnavailable: (d: Date) => d.getMonth() === 6,
    })
    await cellNamed(wrapper, 'Q3').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})

describe('the terminal view', () => {
  it('opens the day grid only at period=date', () => {
    expect(dayGrid(mountCalendar()).exists()).toBe(true)
    for (const period of ['month', 'quarter', 'year']) {
      expect(dayGrid(mountCalendar({ period })).exists()).toBe(false)
    }
  })

  it('shows four quarters, two per row', () => {
    const wrapper = mountCalendar({ period: 'quarter' })
    expect(cells(wrapper).map(c => c.text())).toEqual(['Q1', 'Q2', 'Q3', 'Q4'])
    expect(wrapper.find('[role="grid"]').classes()).toContain('grid-cols-2')
  })

  it('names a quarter cell with its year', () => {
    expect(cellNamed(mountCalendar({ period: 'quarter' }), 'Q3').attributes('aria-label'))
      .toBe('Q3 2026')
  })

  it('takes quarter names from labels', () => {
    const wrapper = mountCalendar({
      period: 'quarter',
      labels: { quarters: ['1Q', '2Q', '3Q', '4Q'] },
    })
    expect(cells(wrapper).map(c => c.text())).toEqual(['1Q', '2Q', '3Q', '4Q'])
  })

  /** Quarter is never a step in another chain — year drills straight past months. */
  it('drills from the year panel to quarters, skipping months', async () => {
    const wrapper = mountCalendar({ period: 'quarter' })
    await wrapper.find('[aria-label="Choose year"]').trigger('click')
    await nextTick()
    expect(cellNamed(wrapper, '2020')).toBeTruthy()

    await cellNamed(wrapper, '2020').trigger('click')
    await nextTick()

    expect(cells(wrapper).map(c => c.text())).toEqual(['Q1', 'Q2', 'Q3', 'Q4'])
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('still drills year to month to day at the default period', async () => {
    const wrapper = mountCalendar()
    await wrapper.find('[aria-label="Choose year"]').trigger('click')
    await nextTick()
    await cellNamed(wrapper, '2020').trigger('click')
    await nextTick()
    expect(cells(wrapper)[0]!.text()).toBe('Jan')

    await cellNamed(wrapper, 'Mar').trigger('click')
    await nextTick()
    expect(dayGrid(wrapper).exists()).toBe(true)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('commits from the month panel when month is terminal', async () => {
    const wrapper = mountCalendar({ period: 'month' })
    await cellNamed(wrapper, 'Mar').trigger('click')
    expect(emitted(wrapper)).toEqual(new Date(2026, 2, 1))
    expect(dayGrid(wrapper).exists()).toBe(false)
  })
})

describe('panel cell signals never collide', () => {
  it('a navigational panel shows Current, not Selected or Today', async () => {
    const wrapper = mountCalendar({ modelValue: new Date(2026, 2, 14) })
    await wrapper.find('[aria-label="Choose month"]').trigger('click')
    await nextTick()

    expect(cellNamed(wrapper, 'Mar').attributes('data-current')).toBe('true')
    expect(cells(wrapper).some(c => c.attributes('data-selected'))).toBe(false)
    expect(cells(wrapper).some(c => c.attributes('data-today'))).toBe(false)
  })

  it('a terminal panel shows Selected and Today, never Current', () => {
    const wrapper = mountCalendar({ period: 'month', modelValue: new Date(2026, 2, 1) })
    expect(cellNamed(wrapper, 'Mar').attributes('data-selected')).toBe('true')
    expect(cellNamed(wrapper, 'Sep').attributes('data-today')).toBe('true')
    expect(cells(wrapper).some(c => c.attributes('data-current'))).toBe(false)
  })
})

describe('escape', () => {
  it('bubbles from a terminal panel instead of switching view', async () => {
    const wrapper = mountCalendar({ period: 'quarter' })
    await press(wrapper, 'Escape')
    await nextTick()
    // Still on quarters: nothing to step back to, so the wrapper owns Escape.
    expect(cells(wrapper).map(c => c.text())).toEqual(['Q1', 'Q2', 'Q3', 'Q4'])
  })

  it('returns to the terminal view from a navigational panel', async () => {
    const wrapper = mountCalendar({ period: 'quarter' })
    await wrapper.find('[aria-label="Choose year"]').trigger('click')
    await nextTick()
    await press(wrapper, 'Escape')
    await nextTick()
    expect(cells(wrapper).map(c => c.text())).toEqual(['Q1', 'Q2', 'Q3', 'Q4'])
  })
})

describe('keyboard in the quarter panel', () => {
  it('moves one across and two down, then commits with Enter', async () => {
    const wrapper = mountCalendar({ period: 'quarter' })
    await press(wrapper, 'ArrowRight')
    await press(wrapper, 'ArrowDown')
    await press(wrapper, 'Enter')
    // Q1 -> Q2 -> Q4
    expect(emitted(wrapper)).toEqual(new Date(2026, 9, 1))
  })

  it('pages a year with PageDown', async () => {
    const wrapper = mountCalendar({ period: 'quarter' })
    await press(wrapper, 'PageDown')
    await nextTick()
    expect(wrapper.emitted('update:visibleDate')!.at(-1)![0]).toEqual(new Date(2027, 0, 1))
    expect(cellNamed(wrapper, 'Q1').attributes('aria-label')).toBe('Q1 2027')
  })
})

describe('the day-grid-only props go quiet', () => {
  it('ignores fixedWeeks, showWeekNumbers and weekStartsOn', () => {
    const wrapper = mountCalendar({
      period: 'quarter',
      showWeekNumbers: true,
      fixedWeeks: false,
      weekStartsOn: 1,
    })
    expect(wrapper.find('th[scope="row"]').exists()).toBe(false)
    expect(cells(wrapper)).toHaveLength(4)
  })
})

describe('label overrides', () => {
  /**
   * `Partial<CalendarLabels>` accepts an explicit `undefined`, so a conditional override
   * type-checks. A bare spread let it win over the default and the quarter panel then threw
   * while indexing it.
   */
  it('falls back to the default when an override is explicitly undefined', () => {
    const wrapper = mountCalendar({ period: 'quarter', labels: { quarters: undefined } })
    expect(cells(wrapper).map(c => c.text())).toEqual(['Q1', 'Q2', 'Q3', 'Q4'])
    expect(cellNamed(wrapper, 'Q1').attributes('aria-label')).toBe('Q1 2026')
  })

  it('still applies a real override', () => {
    const wrapper = mountCalendar({
      period: 'quarter',
      labels: { quarters: ['1Q', '2Q', '3Q', '4Q'], chooseYear: 'Pick year' },
    })
    expect(cells(wrapper).map(c => c.text())).toEqual(['1Q', '2Q', '3Q', '4Q'])
    expect(wrapper.find('[aria-label="Pick year"]').exists()).toBe(true)
  })
})

describe('the exported helpers', () => {
  it('brackets the period', () => {
    const mid = new Date(2026, 7, 15, 13, 30)
    expect(startOfPeriod(mid, 'quarter')).toEqual(new Date(2026, 6, 1))
    expect(endOfPeriod(mid, 'quarter')).toEqual(new Date(2026, 8, 30, 23, 59, 59, 999))
    expect(startOfPeriod(mid, 'date')).toEqual(new Date(2026, 7, 15))
  })

  it('isSamePeriod is the comparison the component uses', () => {
    const a = new Date(2026, 6, 1)
    const b = new Date(2026, 8, 30)
    expect(isSamePeriod(a, b, 'quarter')).toBe(true)
    expect(isSamePeriod(a, b, 'month')).toBe(false)
    expect(isSamePeriod(a, b, 'year')).toBe(true)
  })
})
