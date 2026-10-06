/**
 * `DatePicker` in `period="quarter"`. These cover the seams between `Dropdown`,
 * `MaskedInput` and `Calendar`, not the behaviour each one already tests on its own.
 *
 * Split from `DatePicker.spec.ts` because the quarter path is the one with no native
 * equivalent: there is no quarter input, so the mask, the panel and the i18n names are all
 * hand-built. Several tests here exist because an earlier hand-built version got a
 * specific case wrong.
 */
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '../../../../i18n/locales/en/common.json'
import ja from '../../../../i18n/locales/ja/common.json'
import { trapFocus } from '../../../plugins/trapFocus'
import DatePicker from './DatePicker.vue'

const NOW = new Date(2026, 8, 15, 15, 42)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
})

// Popovers are teleported and these tests leave some open, so a component surviving into
// the next test would put a second `[role="grid"]` in the document.
enableAutoUnmount(afterEach)

afterEach(() => {
  vi.useRealTimers()
  document.querySelectorAll('.popovers').forEach(node => node.remove())
})

/**
 * The real locale files, not fixtures: the point of the migration is that the translated
 * quarter names actually reach the panel, so a hand-written copy here could pass while the
 * shipped strings were wrong.
 */
function mountPicker(props: Record<string, any> = {}, locale: 'en' | 'ja' = 'en') {
  const i18n = createI18n({
    legacy: false,
    locale,
    fallbackLocale: 'en',
    messages: { en, ja },
  })
  // The popover teleports to `.popovers`; give it somewhere to land.
  const host = document.createElement('div')
  host.className = 'popovers'
  document.body.appendChild(host)

  // Nuxt plugins do not run here, so the directive is registered by hand: without it
  // `v-trap-focus` resolves to nothing and the popover's tab ring would not be tested.
  return mount(DatePicker as any, {
    props: { period: 'quarter', ...props },
    global: { plugins: [i18n], directives: { trapFocus } },
    attachTo: document.body,
  })
}

type Wrapper = ReturnType<typeof mountPicker>

const input = (wrapper: Wrapper) => wrapper.find('input')
/** The popover is teleported out of the component's own tree. */
const quarterCells = () => Array.from(document.querySelectorAll('[role="gridcell"]'))
function cellNamed(label: string) {
  return quarterCells().find(cell => cell.getAttribute('aria-label') === label) as HTMLElement
}

async function open(wrapper: Wrapper) {
  await input(wrapper).trigger('click')
  await nextTick()
  await nextTick()
}

describe('the masked field', () => {
  it('renders the model as YYYY.Qn', () => {
    const wrapper = mountPicker({ modelValue: new Date(2026, 6, 1) })
    expect(input(wrapper).element.value).toBe('2026.Q3')
  })

  /** `lazy: false`, so an empty value shows the mask skeleton rather than a blank field. */
  it('shows the empty mask for no value', () => {
    expect(input(mountPicker()).element.value).toBe(`____${DATE_SEPARATOR}Q_`)
  })
})

describe('the popover', () => {
  it('opens onto the quarter panel, not a day grid', async () => {
    const wrapper = mountPicker({ modelValue: new Date(2026, 6, 1) })
    await open(wrapper)

    expect(document.querySelector('table[role="grid"]')).toBeNull()
    expect(quarterCells()).toHaveLength(4)
    expect(input(wrapper).attributes('aria-expanded')).toBe('true')
  })

  it('marks the selected and current quarters', async () => {
    const wrapper = mountPicker({ modelValue: new Date(2026, 0, 1) })
    await open(wrapper)

    expect(cellNamed('Q1 2026').dataset.selected).toBe('true')
    expect(cellNamed('Q3 2026').dataset.today).toBe('true')
  })

  /** The value is the quarter's first day — ADR-0008, and what the old component emitted. */
  it('emits the quarter start and closes', async () => {
    const wrapper = mountPicker({ modelValue: new Date(2026, 6, 1) })
    await open(wrapper)

    cellNamed('Q1 2026').click()
    await nextTick()

    expect(wrapper.emitted('update:modelValue')!.at(-1)).toEqual([new Date(2026, 0, 1)])
    expect(input(wrapper).attributes('aria-expanded')).toBe('false')
  })

  it('takes quarter names from i18n rather than hardcoding Q1', async () => {
    const wrapper = mountPicker()
    await open(wrapper)
    expect(cellNamed('Q1 2026').textContent!.trim()).toBe('Q1')
  })

  /**
   * The regression that motivated routing labels through `Calendar`: the old component
   * computed `datepicker.quarter_no` and then rendered a literal `Q{{ n }}`, so Japanese
   * users saw "Q1" while the translation was built and discarded.
   */
  it('renders the Japanese quarter names', async () => {
    const wrapper = mountPicker({}, 'ja')
    await open(wrapper)
    const labels = quarterCells().map(cell => cell.textContent!.trim())
    expect(labels).toEqual(['第1四半期', '第2四半期', '第3四半期', '第4四半期'])
  })
})

describe('escape does one thing at a time', () => {
  /**
   * Real timers here, deliberately. Vue's `patchEvent` stamps each event with `Date.now()`
   * on the first invoker and then skips any *ancestor* invoker whose `attached` timestamp is
   * not older. With `Date` frozen those are equal, so a component's own handler still runs
   * but bubbling to a parent's handler is silently dropped — which is precisely the path
   * from the Calendar panel up to `Dropdown`. Neither test below depends on today's date.
   */
  beforeEach(() => {
    vi.useRealTimers()
  })

  /**
   * `Dropdown` closes on Escape anywhere in its popover, and a navigational panel consumes
   * Escape to step back. Without `stopPropagation` in the panel, one keypress did both.
   */
  it('steps back from the year panel without closing the popover', async () => {
    const wrapper = mountPicker()
    await open(wrapper)

    document.querySelector<HTMLElement>('[aria-label="Choose year"]')!.click()
    await nextTick()
    expect(quarterCells()).toHaveLength(12) // a page of years

    document.querySelector('[role="grid"]')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()

    expect(quarterCells()).toHaveLength(4)
    expect(input(wrapper).attributes('aria-expanded')).toBe('true')
  })

  it('closes the popover from the quarter panel, which is terminal', async () => {
    const wrapper = mountPicker()
    await open(wrapper)

    document.querySelector('[role="grid"]')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()
    await nextTick()

    expect(input(wrapper).attributes('aria-expanded')).toBe('false')
  })
})

describe('bounds', () => {
  /** Floored to the quarter: a quarter that merely overlaps the range stays selectable. */
  it('keeps a partially in-range quarter selectable', async () => {
    const wrapper = mountPicker({ minDate: new Date(2026, 1, 15) })
    await open(wrapper)

    // Q1 ends 31 March, after minDate, so it survives. Q1 of the prior year would not.
    expect((cellNamed('Q1 2026') as HTMLButtonElement).disabled).toBe(false)
  })

  it('does not reproduce the old strict-isAfter bug', async () => {
    // The old component used `isAfter(minDate)` on the quarter's *start*, so a minDate
    // exactly on a quarter boundary disabled that quarter.
    const wrapper = mountPicker({ minDate: new Date(2026, 6, 1) })
    await open(wrapper)
    expect((cellNamed('Q3 2026') as HTMLButtonElement).disabled).toBe(false)
  })

  /**
   * A deliberate behaviour change, made when this became `<DatePicker period="quarter">`.
   *
   * The old component watched `minDate`/`maxDate` and rewrote the model when a bound moved
   * past it. ADR-0007 explains why that is the wrong place for it: a parent deriving its
   * bounds from the model loops, and a silently substituted value is worse than a visible
   * conflict. It also only ever applied to the quarter branch, so unifying the two branches
   * meant either dropping it or extending clamping to dates, months and years.
   *
   * The out-of-range value now renders selected-and-disabled and the schema decides.
   */
  it('does not rewrite the model when minDate moves past it', async () => {
    const wrapper = mountPicker({ modelValue: new Date(2026, 0, 1) })
    await wrapper.setProps({ minDate: new Date(2026, 6, 1) })
    await nextTick()

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()

    await open(wrapper)
    const q1 = cellNamed('Q1 2026') as HTMLButtonElement
    expect(q1.dataset.selected).toBe('true')
    expect(q1.disabled).toBe(true)
  })
})

describe('disabled', () => {
  it('does not open', async () => {
    const wrapper = mountPicker({ disabled: true })
    await open(wrapper)
    expect(quarterCells()).toHaveLength(0)
  })
})
