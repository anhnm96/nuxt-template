import { mount } from '@vue/test-utils'
import Calendar from './Calendar.vue'

const NOW = new Date(2026, 8, 26, 15, 42)

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

const openMonthPanel = (w: Wrapper) => w.find('[aria-label="Choose month"]').trigger('click')
const openYearPanel = (w: Wrapper) => w.find('[aria-label="Choose year"]').trigger('click')
const panelCells = (w: Wrapper) => w.findAll('[role="gridcell"]')

describe('the header', () => {
  it('renders month and year as separate buttons in locale order', () => {
    const en = mountCalendar()
    expect(en.find('.calendar').text()).toContain('September')

    // Japanese puts the year first — the buttons follow Intl.formatToParts.
    const ja = mountCalendar({ locale: 'ja-JP' })
    const text = ja.find('.calendar').text()
    expect(text.indexOf('2026')).toBeLessThan(text.indexOf('9'))
  })
})

describe('views swap in place', () => {
  it('replaces the day grid rather than layering over it', async () => {
    const wrapper = mountCalendar()
    await openMonthPanel(wrapper)

    expect(wrapper.find('table[role="grid"]').exists()).toBe(false)
    expect(panelCells(wrapper)).toHaveLength(12)
    // The header swaps too: month view offers only year paging and the way up.
    expect(wrapper.find('[aria-label="Previous month"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Choose year"]').exists()).toBe(true)
  })

  it('returns to the day grid on Escape without changing the selection', async () => {
    const wrapper = mountCalendar()
    await openMonthPanel(wrapper)
    await wrapper.find('[role="grid"]').trigger('keydown', { key: 'Escape' })

    expect(wrapper.find('table[role="grid"]').exists()).toBe(true)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})

describe('panels navigate, never commit', () => {
  it('moves the Visible Date when a month is picked, and leaves the model alone', async () => {
    const wrapper = mountCalendar()
    await openMonthPanel(wrapper)
    await panelCells(wrapper)[1]!.trigger('click')

    expect(wrapper.emitted('update:visibleDate')!.at(-1)![0]).toEqual(new Date(2026, 1, 1))
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.find('table[role="grid"]').exists()).toBe(true)
  })

  it('drills year to month, not straight to the day grid', async () => {
    const wrapper = mountCalendar()
    await openYearPanel(wrapper)
    expect(panelCells(wrapper)[0]!.text()).toBe('2016')

    await panelCells(wrapper)[0]!.trigger('click')

    // Month panel, not the day grid.
    expect(wrapper.find('table[role="grid"]').exists()).toBe(false)
    expect(panelCells(wrapper)[0]!.text()).toBe('Jan')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})

describe('year pages tile on 12', () => {
  it('shows the page containing the visible year', async () => {
    const wrapper = mountCalendar()
    await openYearPanel(wrapper)

    const years = panelCells(wrapper).map(cell => cell.text())
    expect(years[0]).toBe('2016')
    expect(years.at(-1)).toBe('2027')
    expect(wrapper.find('.calendar').text()).toContain('2016 - 2027')
  })

  it('pages without overlap, and reversibly', async () => {
    const wrapper = mountCalendar()
    await openYearPanel(wrapper)
    await wrapper.find('[aria-label="Next years"]').trigger('click')
    expect(panelCells(wrapper)[0]!.text()).toBe('2028')

    await wrapper.find('[aria-label="Previous years"]').trigger('click')
    expect(panelCells(wrapper)[0]!.text()).toBe('2016')
  })
})

describe('bounds reach the panels and the nav', () => {
  it('disables months entirely outside the range', async () => {
    const wrapper = mountCalendar({ minDate: new Date(2026, 5, 15) })
    await openMonthPanel(wrapper)

    const cells = panelCells(wrapper)
    expect(cells[4]!.attributes('disabled')).toBeDefined() // May: fully before minDate
    expect(cells[5]!.attributes('disabled')).toBeUndefined() // June: partly in range
  })

  it('disables years outside the range', async () => {
    const wrapper = mountCalendar({ minDate: new Date(2020, 0, 1) })
    await openYearPanel(wrapper)

    expect(panelCells(wrapper)[0]!.attributes('disabled')).toBeDefined() // 2016
    expect(panelCells(wrapper)[4]!.attributes('disabled')).toBeUndefined() // 2020
  })

  it('disables a nav button when everything it would reach is out of bounds', () => {
    const wrapper = mountCalendar({ minDate: new Date(2026, 8, 1) })
    expect(wrapper.find('[aria-label="Previous month"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[aria-label="Next month"]').attributes('disabled')).toBeUndefined()
  })
})

describe('the Visible Date and the model', () => {
  it('follows a value set from outside when it is not already in view', async () => {
    const wrapper = mountCalendar({ modelValue: new Date(2026, 8, 14) })
    await wrapper.setProps({ modelValue: new Date(2026, 11, 3) })

    expect(wrapper.emitted('update:visibleDate')!.at(-1)![0]).toEqual(new Date(2026, 11, 1))
  })

  it('stays put when the new value is already in the Visible Date', async () => {
    const wrapper = mountCalendar({ modelValue: new Date(2026, 8, 14) })
    await wrapper.setProps({ modelValue: new Date(2026, 8, 20) })

    expect(wrapper.emitted('update:visibleDate')).toBeUndefined()
  })

  it('never follows in multiple mode — the user is paging deliberately', async () => {
    const wrapper = mountCalendar({ mode: 'multiple', modelValue: [new Date(2026, 8, 14)] })
    await wrapper.setProps({ modelValue: [new Date(2026, 8, 14), new Date(2026, 11, 3)] })

    expect(wrapper.emitted('update:visibleDate')).toBeUndefined()
  })

  it('does not follow when the parent owns the Visible Date', async () => {
    const wrapper = mountCalendar({
      modelValue: new Date(2026, 8, 14),
      visibleDate: new Date(2026, 8, 1),
    })
    await wrapper.setProps({ modelValue: new Date(2027, 2, 3) })

    expect(wrapper.emitted('update:visibleDate')).toBeUndefined()
  })

  /** Selecting an Outside Day pages to its own month, so it stops rendering dimmed. */
  it('follows an Outside Day into its month', async () => {
    const wrapper = mountCalendar()
    // September 2026's trailing row starts at October 1st.
    const outside = wrapper.findAll('td[role="gridcell"] button')
      .find(b => b.attributes('data-outside') !== undefined && b.text() === '1')!
    await outside.trigger('click')

    expect(wrapper.emitted('update:visibleDate')!.at(-1)![0]).toEqual(new Date(2026, 9, 1))
  })
})
