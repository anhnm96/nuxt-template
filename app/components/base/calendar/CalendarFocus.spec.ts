/**
 * DOM-focus regressions. The other specs assert `tabindex`, which was correct in every case
 * below while `document.activeElement` was `<body>` — so these assert real focus instead.
 */
import { enableAutoUnmount, mount } from '@vue/test-utils'
import Calendar from './Calendar.vue'

const NOW = new Date(2026, 8, 26, 15, 42)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
})

// These tests assert `document.activeElement`, so a component surviving into the next test
// keeps its focus and the next assertion reads the previous test's state.
enableAutoUnmount(afterEach)

afterEach(() => {
  vi.useRealTimers()
  ;(document.activeElement as HTMLElement | null)?.blur?.()
})

function mountCalendar(props: Record<string, any> = {}) {
  return mount(Calendar as any, { props: { locale: 'en-US', ...props }, attachTo: document.body })
}

type Wrapper = ReturnType<typeof mountCalendar>

const activeLabel = () => document.activeElement?.getAttribute('aria-label') ?? ''
const grid = (wrapper: Wrapper) => wrapper.find('table[role="grid"]')

function tabbableCell(wrapper: Wrapper) {
  return wrapper.findAll('td button').find(b => b.attributes('tabindex') === '0')
}

/** Put real focus where the roving tabindex already points, as a real user's Tab would. */
function tabInto(wrapper: Wrapper) {
  (tabbableCell(wrapper)!.element as HTMLElement).focus()
}

async function settle() {
  await nextTick()
  await nextTick()
}

describe('DOM focus follows the roving tabindex', () => {
  it('does not steal focus on mount', async () => {
    mountCalendar()
    await settle()
    expect(document.activeElement).toBe(document.body)
  })

  it('moves with the arrows inside one month', async () => {
    const wrapper = mountCalendar()
    tabInto(wrapper)
    await grid(wrapper).trigger('keydown', { key: 'ArrowRight' })
    await settle()
    expect(activeLabel()).toContain('September 27')
  })

  /** The target cell is not drawn in September's grid, so it mounts only after the request. */
  it('reaches a cell that did not exist when the request was made', async () => {
    const wrapper = mountCalendar({ modelValue: new Date(2026, 8, 15) })
    tabInto(wrapper)
    await grid(wrapper).trigger('keydown', { key: 'PageDown' })
    await settle()
    expect(activeLabel()).toContain('October 15')
  })

  /** `v-if` re-creates every cell, so all of them mount after the request. */
  it('returns focus to the grid on Escape out of a panel', async () => {
    const wrapper = mountCalendar()
    await wrapper.find('[aria-label="Choose month"]').trigger('click')
    await settle()
    await wrapper.find('[role="grid"]').trigger('keydown', { key: 'Escape' })
    await settle()
    expect(activeLabel()).toContain('September')
  })

  /** Mouse paging must not drag focus off the button being clicked. */
  it('leaves focus alone when the month is paged with the mouse', async () => {
    const wrapper = mountCalendar()
    tabInto(wrapper)
    await grid(wrapper).trigger('keydown', { key: 'ArrowRight' })
    await settle()

    const next = wrapper.find('[aria-label="Next month"]')
    ;(next.element as HTMLElement).focus()
    await next.trigger('click')
    await settle()

    expect(document.activeElement).toBe(next.element)
  })
})

describe('a terminal panel is still just a panel', () => {
  /**
   * `period` makes a panel the *initial* view, so its mount-time focus has to be gated by
   * the same one-shot token the day cells use. Without it an inline coarse-period Calendar
   * grabbed the page's focus the moment it rendered.
   */
  it.each(['month', 'quarter', 'year'])('does not steal focus on mount at period=%s', async (period) => {
    mountCalendar({ period })
    await settle()
    expect(document.activeElement).toBe(document.body)
  })

  it('still takes focus when the user drills into it', async () => {
    const wrapper = mountCalendar({ period: 'quarter' })
    await settle()

    await wrapper.find('[aria-label="Choose year"]').trigger('click')
    await settle()

    expect(activeLabel()).toBe('2026')
  })

  /**
   * The panel's single `tabindex="0"` must not land on a natively disabled button: that
   * button cannot take focus, and the grid-level fallback only fires when *every* cell is
   * disabled, so the panel would be unreachable by keyboard entirely.
   */
  it.each([
    ['quarter', new Date(2026, 6, 1), 'Q3'],
    ['month', new Date(2026, 10, 1), 'Nov'],
  ])('seeds the initial %s tab stop inside the bounds', async (period, minDate, expected) => {
    const wrapper = mountCalendar({ period, minDate })
    await settle()

    const tabbable = wrapper.findAll('[role="gridcell"][tabindex="0"]')
    expect(tabbable).toHaveLength(1)
    expect(tabbable[0]!.attributes('disabled')).toBeUndefined()
    expect(tabbable[0]!.text()).toBe(expected)
  })

  it('re-seeds when period changes underneath', async () => {
    const wrapper = mountCalendar({ period: 'date', minDate: new Date(2026, 6, 1) })
    await settle()

    await wrapper.setProps({ period: 'quarter' })
    await settle()

    const tabbable = wrapper.findAll('[role="gridcell"][tabindex="0"]')
    expect(tabbable[0]!.attributes('disabled')).toBeUndefined()
    expect(tabbable[0]!.text()).toBe('Q3')
  })
})

describe('there is always a way in', () => {
  it('makes the grid itself the tab stop when every day is disabled', async () => {
    const wrapper = mountCalendar({ isDateDisabled: () => true })
    expect(wrapper.findAll('td button[tabindex="0"]')).toHaveLength(0)
    expect(grid(wrapper).attributes('tabindex')).toBe('0')
  })

  it('and the arrows can still page out of a dead month', async () => {
    // Only October is selectable; September opens with nothing focusable.
    const wrapper = mountCalendar({ isDateDisabled: (d: Date) => d.getMonth() !== 9 })
    expect(grid(wrapper).attributes('tabindex')).toBe('0')

    ;(grid(wrapper).element as HTMLElement).focus()
    await grid(wrapper).trigger('keydown', { key: 'PageDown' })
    await settle()

    expect(activeLabel()).toContain('October')
  })

  it('still skips the whole calendar when disabled', () => {
    const wrapper = mountCalendar({ disabled: true })
    expect(grid(wrapper).attributes('tabindex')).toBeUndefined()
  })

  it('never puts the month panel tab stop on a disabled cell', async () => {
    // Visible month is September; nothing before December is in range.
    const wrapper = mountCalendar({ minDate: new Date(2026, 11, 1) })
    await wrapper.find('[aria-label="Choose month"]').trigger('click')
    await settle()

    const tabbable = wrapper.findAll('[role="gridcell"][tabindex="0"]')
    expect(tabbable).toHaveLength(1)
    expect(tabbable[0]!.attributes('disabled')).toBeUndefined()
    expect(tabbable[0]!.text()).toBe('Dec')
  })

  it('never puts the year panel tab stop on a disabled cell', async () => {
    // The 2016–2027 page opens with its first four years before minDate.
    const wrapper = mountCalendar({ minDate: new Date(2026, 0, 1) })
    await wrapper.find('[aria-label="Choose year"]').trigger('click')
    await settle()

    const tabbable = wrapper.findAll('[role="gridcell"][tabindex="0"]')
    expect(tabbable).toHaveLength(1)
    expect(tabbable[0]!.attributes('disabled')).toBeUndefined()
    expect(tabbable[0]!.text()).toBe('2026')
  })
})

describe('paging reaches a range that is pages away', () => {
  /**
   * The whole selectable range sits on the *next* page, whose first year is out of bounds.
   * Gating on that boundary year strands the user on a page where nothing is selectable.
   */
  it('allows paging toward the range even when the adjacent boundary year is out of bounds', async () => {
    const wrapper = mountCalendar({
      minDate: new Date(2030, 0, 1),
      maxDate: new Date(2035, 11, 31),
    })
    await wrapper.find('[aria-label="Choose year"]').trigger('click')
    await settle()

    expect(wrapper.findAll('[role="gridcell"]')[0]!.text()).toBe('2016')
    const next = wrapper.find('[aria-label="Next years"]')
    expect(next.attributes('disabled')).toBeUndefined()

    await next.trigger('click')
    await settle()

    const cells = wrapper.findAll('[role="gridcell"]')
    expect(cells[0]!.text()).toBe('2028')
    expect(cells.filter(c => c.attributes('disabled') === undefined).map(c => c.text()))
      .toEqual(['2030', '2031', '2032', '2033', '2034', '2035'])
  })

  it('crosses several empty pages to reach a distant range', async () => {
    const wrapper = mountCalendar({ minDate: new Date(2060, 0, 1) })
    await wrapper.find('[aria-label="Choose year"]').trigger('click')
    await settle()

    // 2016 -> 2028 -> 2040 -> 2052 -> 2064; every page in between is entirely disabled.
    for (let page = 0; page < 4; page++) {
      const next = wrapper.find('[aria-label="Next years"]')
      expect(next.attributes('disabled')).toBeUndefined()
      await next.trigger('click')
      await settle()
    }
    expect(wrapper.findAll('[role="gridcell"]').some(c => c.attributes('disabled') === undefined))
      .toBe(true)
  })

  it('still stops paging past the range', async () => {
    const wrapper = mountCalendar({ maxDate: new Date(2027, 11, 31) })
    await wrapper.find('[aria-label="Choose year"]').trigger('click')
    await settle()
    // The 2016-2027 page already reaches maxDate.
    expect(wrapper.find('[aria-label="Next years"]').attributes('disabled')).toBeDefined()
  })
})

describe('a panel with nothing selectable is still escapable', () => {
  it('makes the year panel itself the tab stop, and Escape still works there', async () => {
    const wrapper = mountCalendar({ minDate: new Date(2060, 0, 1) })
    await wrapper.find('[aria-label="Choose year"]').trigger('click')
    await settle()

    const panel = wrapper.find('[role="grid"]')
    expect(wrapper.findAll('[role="gridcell"]:not([disabled])')).toHaveLength(0)
    expect(panel.attributes('tabindex')).toBe('0')

    await panel.trigger('keydown', { key: 'Escape' })
    await settle()
    expect(wrapper.find('table[role="grid"]').exists()).toBe(true)
  })

  it('makes the month panel itself the tab stop', async () => {
    const wrapper = mountCalendar({ minDate: new Date(2030, 0, 1) })
    await wrapper.find('[aria-label="Choose month"]').trigger('click')
    await settle()

    expect(wrapper.findAll('[role="gridcell"]:not([disabled])')).toHaveLength(0)
    expect(wrapper.find('[role="grid"]').attributes('tabindex')).toBe('0')
  })

  it('does not add a tab stop when the panel has usable cells', async () => {
    const wrapper = mountCalendar()
    await wrapper.find('[aria-label="Choose month"]').trigger('click')
    await settle()
    expect(wrapper.find('[role="grid"]').attributes('tabindex')).toBeUndefined()
  })

  it('never adds one while disabled', async () => {
    const wrapper = mountCalendar({ disabled: true, minDate: new Date(2060, 0, 1) })
    // `disabled` blocks setView, so the day grid stays put and keeps no tab stop either.
    await wrapper.find('[aria-label="Choose month"]').trigger('click')
    await settle()
    expect(wrapper.find('table[role="grid"]').attributes('tabindex')).toBeUndefined()
  })
})

describe('the month panel header tracks the Visible Date', () => {
  it('updates when its own paging buttons are used', async () => {
    const wrapper = mountCalendar()
    await wrapper.find('[aria-label="Choose month"]').trigger('click')
    await settle()
    expect(wrapper.find('[aria-label="Choose year"]').text()).toBe('2026')

    await wrapper.find('[aria-label="Next year"]').trigger('click')
    await settle()

    expect(wrapper.emitted('update:visibleDate')!.at(-1)![0]).toEqual(new Date(2027, 8, 1))
    expect(wrapper.find('[aria-label="Choose year"]').text()).toBe('2027')
  })

  it('reflects a year paged in the day view before the panel was opened', async () => {
    const wrapper = mountCalendar()
    await wrapper.find('[aria-label="Next year"]').trigger('click')
    await settle()
    await wrapper.find('[aria-label="Choose month"]').trigger('click')
    await settle()

    expect(wrapper.find('[aria-label="Choose year"]').text()).toBe('2027')
  })
})

describe('every dimension derives from --calendar-cell', () => {
  const classesOf = (wrapper: Wrapper, selector: string) =>
    wrapper.find(selector).attributes('class')!.split(/\s+/)

  /**
   * A hardcoded size overflows its own column the moment the token is narrowed to fit a
   * container, which is exactly what the token is documented for. Fitting the schedule
   * sidebar turned up three of these at once.
   */
  it('sizes the day button from the token, not a utility', () => {
    const classes = classesOf(mountCalendar(), '.calendar-cell')
    expect(classes.filter(c => c.startsWith('size-') || c.startsWith('m-'))).toEqual([])
    expect(classes.filter(c => c.startsWith('text-'))).toEqual([])
  })

  it('sizes the header nav buttons from the token too', () => {
    const classes = classesOf(mountCalendar(), '.calendar-nav')
    expect(classes.filter(c => c.startsWith('size-'))).toEqual([])
  })

  /** Type lives on the root as a token, so a scoped rule cannot outrank a consumer class. */
  it('does not pin a font size on the root with a utility', () => {
    const classes = classesOf(mountCalendar(), '.calendar')
    expect(classes.filter(c => /^text-(?:xs|sm|base|lg)$/.test(c))).toEqual([])
  })

  it('keeps the pinned box a function of the token', () => {
    const wrapper = mountCalendar()
    expect((wrapper.find('.calendar-body').element as HTMLElement).style.minHeight)
      .toBe('calc(6 * var(--calendar-cell) + 1.25rem)')
  })
})

describe('the #weekday slot stays presentational', () => {
  it('announces the long name once, not the override as well', () => {
    const wrapper = mount(Calendar as any, {
      props: { locale: 'en-US' },
      // A bare text node — the shape README documents, and the one that defeats `Slot`.
      slots: { weekday: '{{ params.short }}' },
      attachTo: document.body,
    })

    const header = wrapper.findAll('thead th')[0]!
    expect(header.text()).toContain('Sun')
    const hidden = header.find('[aria-hidden="true"]')
    expect(hidden.exists()).toBe(true)
    expect(hidden.text()).toBe('Sun')
    // The long name is the only thing left for a screen reader to read.
    expect(header.find('.sr-only').text()).toBe('Sunday')
  })

  it('hides the default narrow name too', () => {
    const wrapper = mountCalendar()
    const header = wrapper.findAll('thead th')[0]!
    expect(header.find('[aria-hidden="true"]').text()).toBe('S')
    expect(header.find('.sr-only').text()).toBe('Sunday')
  })
})
