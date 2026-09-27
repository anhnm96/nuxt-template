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

/** The one cell carrying `tabindex="0"` — the roving tabindex's current target. */
function tabbable(wrapper: Wrapper) {
  return wrapper.findAll('td[role="gridcell"] button')
    .find(button => button.attributes('tabindex') === '0')
}

async function press(wrapper: Wrapper, key: string, modifiers: Record<string, boolean> = {}) {
  await wrapper.find('table[role="grid"]').trigger('keydown', { key, ...modifiers })
}

describe('roving tabindex', () => {
  it('seeds on the selection, else today, else the first usable day', async () => {
    expect(tabbable(mountCalendar())!.attributes('aria-label')).toContain('September 26')

    expect(tabbable(mountCalendar({ modelValue: new Date(2026, 8, 3) }))!.attributes('aria-label'))
      .toContain('September 3')

    // Neither the selection nor today is in view: fall back to the first usable day.
    const elsewhere = mountCalendar({ visibleDate: new Date(2026, 0, 1) })
    expect(tabbable(elsewhere)!.attributes('aria-label')).toContain('January 1')
  })

  it('keeps exactly one tabbable cell after moving', async () => {
    const wrapper = mountCalendar()
    await press(wrapper, 'ArrowRight')
    expect(wrapper.findAll('button[tabindex="0"]')).toHaveLength(1)
  })
})

describe('movement', () => {
  it('moves by a day and by a week', async () => {
    const wrapper = mountCalendar()
    await press(wrapper, 'ArrowRight')
    expect(tabbable(wrapper)!.attributes('aria-label')).toContain('September 27')

    await press(wrapper, 'ArrowDown')
    expect(tabbable(wrapper)!.attributes('aria-label')).toContain('October 4')
  })

  it('pages the Visible Date when an arrow leaves it', async () => {
    const wrapper = mountCalendar({ modelValue: new Date(2026, 8, 30) })
    await press(wrapper, 'ArrowRight')

    expect(wrapper.emitted('update:visibleDate')!.at(-1)![0]).toEqual(new Date(2026, 9, 1))
    expect(tabbable(wrapper)!.attributes('aria-label')).toContain('October 1')
  })

  it('takes Home and End to the ends of the displayed row, not the month', async () => {
    const wrapper = mountCalendar()
    await press(wrapper, 'Home')
    // The row holding Sep 26 (a Saturday) starts on Sunday Sep 20.
    expect(tabbable(wrapper)!.attributes('aria-label')).toContain('September 20')

    await press(wrapper, 'End')
    expect(tabbable(wrapper)!.attributes('aria-label')).toContain('September 26')
  })

  it('pages a month with PageUp/PageDown and a year with Shift', async () => {
    const wrapper = mountCalendar()
    await press(wrapper, 'PageUp')
    expect(tabbable(wrapper)!.attributes('aria-label')).toContain('August 26')

    await press(wrapper, 'PageDown', { shiftKey: true })
    expect(tabbable(wrapper)!.attributes('aria-label')).toContain('August 26, 2027')
  })
})

describe('selection by keyboard', () => {
  it('selects with Enter and with Space', async () => {
    for (const key of ['Enter', ' ']) {
      const wrapper = mountCalendar()
      await press(wrapper, key)
      expect(wrapper.emitted('update:modelValue')!.at(-1)).toEqual([new Date(2026, 8, 26)])
    }
  })
})

describe('disabled days are skipped, but the scan is bounded', () => {
  it('steps over a run of disabled days, keeping the column for vertical moves', async () => {
    const wrapper = mountCalendar({
      // Sep 27–29 disabled: ArrowRight from the 26th must land on the 30th.
      isDateDisabled: (date: Date) =>
        date.getMonth() === 8 && date.getDate() >= 27 && date.getDate() <= 29,
    })
    await press(wrapper, 'ArrowRight')
    expect(tabbable(wrapper)!.attributes('aria-label')).toContain('September 30')
  })

  it('does not move past maxDate', async () => {
    const wrapper = mountCalendar({ maxDate: new Date(2026, 8, 26) })
    await press(wrapper, 'ArrowRight')
    expect(tabbable(wrapper)!.attributes('aria-label')).toContain('September 26')
    expect(wrapper.emitted('update:visibleDate')).toBeUndefined()
  })

  /**
   * The guard that matters: arrows page across month boundaries, so without a cap a fully
   * disabled range would be scanned forever. Everything is disabled here, and the keypress
   * must simply terminate.
   */
  it('terminates when every day is disabled', async () => {
    const wrapper = mountCalendar({ isDateDisabled: () => true })
    await press(wrapper, 'ArrowRight')
    await press(wrapper, 'ArrowDown')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('never lands on an unavailable day being selectable', async () => {
    const wrapper = mountCalendar({ isDateUnavailable: (d: Date) => d.getDate() === 27 })
    await press(wrapper, 'ArrowRight')
    // Unavailable days stay navigable — focus lands there — but Enter does nothing.
    expect(tabbable(wrapper)!.attributes('aria-label')).toContain('September 27')
    await press(wrapper, 'Enter')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})
