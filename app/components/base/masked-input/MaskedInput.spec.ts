/**
 * The rules of ADR-0015: one Bound Value, and a Partial Entry that keeps the last complete
 * Typed Value. `DatePicker.spec.ts` covers the date masks; these use the built-in imask
 * masks, so a failure here is about the binding and not about a date format.
 */
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { useMask } from '../../../composables/useMask'
import MaskedInput from './MaskedInput.vue'

enableAutoUnmount(afterEach)

const DATE = { mask: Date } as const
const NUMBER = { mask: Number, min: -100, max: 100, autofix: true } as const
const PHONE = { mask: '+{1} (000) 000-0000' } as const

/** A controlled field: `v-model` returns each emitted value to the prop. */
function mountField(props: Record<string, any>) {
  const wrapper = mount(MaskedInput as any, { props, attachTo: document.body })
  wrapper.setProps({ 'onUpdate:modelValue': (value: unknown) => wrapper.setProps({ modelValue: value }) })
  return wrapper
}

/** A user edit: imask reads the new text and the caret from a native `input` event. */
async function type(wrapper: ReturnType<typeof mountField>, text: string) {
  const el = wrapper.find('input').element as HTMLInputElement
  el.focus()
  el.value = text
  el.setSelectionRange(text.length, text.length)
  el.dispatchEvent(new Event('input', { bubbles: true }))
  await nextTick()
}

async function blur(wrapper: ReturnType<typeof mountField>) {
  wrapper.find('input').element.dispatchEvent(new Event('blur'))
  await nextTick()
}

function field(wrapper: ReturnType<typeof mountField>) {
  return (wrapper.find('input').element as HTMLInputElement).value
}

function lastModel(wrapper: ReturnType<typeof mountField>) {
  return wrapper.emitted('update:modelValue')?.at(-1)?.[0]
}

describe('bound', () => {
  it('carries the Unmasked Value by default', async () => {
    const wrapper = mountField({ maskOptions: PHONE })
    await type(wrapper, '5551234567')
    expect(field(wrapper)).toBe('+1 (555) 123-4567')
    expect(lastModel(wrapper)).toBe('15551234567')
  })

  it('carries the Masked Value', async () => {
    const wrapper = mountField({ maskOptions: PHONE, bound: 'masked' })
    await type(wrapper, '5551234567')
    expect(lastModel(wrapper)).toBe('+1 (555) 123-4567')
  })

  it('carries the Typed Value', async () => {
    const wrapper = mountField({ maskOptions: DATE, bound: 'typed' })
    await type(wrapper, '15.01.2026')
    expect(lastModel(wrapper)).toEqual(new Date(2026, 0, 15))
  })

  it('shows a value that the consumer sets before mount', () => {
    const wrapper = mountField({ maskOptions: DATE, bound: 'typed', modelValue: new Date(2026, 0, 15) })
    expect(field(wrapper)).toBe('15.01.2026')
  })

  it('shows a value that the consumer writes after mount', async () => {
    const wrapper = mountField({ maskOptions: PHONE, modelValue: '' })
    await wrapper.setProps({ modelValue: '15551234567' })
    expect(field(wrapper)).toBe('+1 (555) 123-4567')
  })

  it('does not emit on mount for an empty model', () => {
    const wrapper = mountField({ maskOptions: { ...PHONE, lazy: false }, bound: 'masked', modelValue: '' })
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})

describe('the Typed Value', () => {
  it('is null for an empty entry', async () => {
    const wrapper = mountField({ maskOptions: DATE, bound: 'typed', modelValue: new Date(2026, 0, 15) })
    await type(wrapper, '')
    expect(lastModel(wrapper)).toBeNull()
  })

  it('keeps the last complete value during a Partial Entry', async () => {
    const wrapper = mountField({ maskOptions: DATE, bound: 'typed', modelValue: new Date(2026, 0, 15) })
    await type(wrapper, '15.01.20')
    expect(field(wrapper)).toBe('15.01.20')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('clears the field when the consumer writes null', async () => {
    const wrapper = mountField({ maskOptions: DATE, bound: 'typed', modelValue: new Date(2026, 0, 15) })
    await wrapper.setProps({ modelValue: null })
    expect(field(wrapper)).toBe('')
  })
})

describe('blur', () => {
  it('reverts a Partial Entry to the Typed Value', async () => {
    const wrapper = mountField({ maskOptions: DATE, bound: 'typed', modelValue: new Date(2026, 0, 15) })
    await type(wrapper, '15.01.20')
    await blur(wrapper)
    expect(field(wrapper)).toBe('15.01.2026')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  /** The `typedValue` setter of `InputMask` calls `format(null)` on an empty or partial field. */
  it('reverts without calling format with null', async () => {
    const format = (date: Date) => [date.getDate(), date.getMonth() + 1, date.getFullYear()]
      .map(part => String(part).padStart(2, '0'))
      .join('.')
    const wrapper = mountField({ maskOptions: { ...DATE, format }, bound: 'typed', modelValue: new Date(2026, 0, 15) })
    await type(wrapper, '15.01.20')
    await blur(wrapper)
    expect(field(wrapper)).toBe('15.01.2026')
  })

  it('clears a Partial Entry that has no Typed Value', async () => {
    const wrapper = mountField({ maskOptions: DATE, bound: 'typed' })
    await type(wrapper, '15.01')
    await blur(wrapper)
    expect(field(wrapper)).toBe('')
  })

  it.each(['unmasked', 'masked'])('keeps a Partial Entry under bound="%s"', async (bound) => {
    const wrapper = mountField({ maskOptions: PHONE, bound })
    await type(wrapper, '555')
    await blur(wrapper)
    expect(field(wrapper)).toBe('+1 (555')
  })
})

describe('a corrected write', () => {
  /**
   * The mask shows dates only, so it parses `2026.01.15` back as midnight. That is not a
   * correction: `DateRangePicker` writes 23:59:59.999 as the end of a day, and an emitted
   * midnight would make it write the end of the day again, in a loop.
   */
  it('keeps a written value that the mask shows unchanged', async () => {
    const endOfDay = new Date(2026, 0, 15, 23, 59, 59, 999)
    const wrapper = mountField({ maskOptions: DATE, bound: 'typed', modelValue: endOfDay })
    await wrapper.setProps({ modelValue: new Date(2026, 0, 16, 23, 59, 59, 999) })
    await nextTick()
    expect(field(wrapper)).toBe('16.01.2026')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('reaches the model', async () => {
    const wrapper = mountField({ maskOptions: NUMBER, bound: 'typed', modelValue: 0 })
    await wrapper.setProps({ modelValue: 150 })
    await nextTick()
    expect(field(wrapper)).toBe('100')
    expect(lastModel(wrapper)).toBe(100)
  })
})

describe('accept', () => {
  it('carries all three readings', async () => {
    const wrapper = mountField({ maskOptions: DATE, bound: 'typed' })
    await type(wrapper, '15.01.2026')
    expect(wrapper.emitted('accept')?.at(-1)?.[0]).toEqual({
      masked: '15.01.2026',
      // The default `Date` pattern writes its dots as `{.}`, which keeps them unmasked.
      unmasked: '15.01.2026',
      typed: new Date(2026, 0, 15),
    })
  })
})

describe('the element', () => {
  it('receives the mask when it appears after mount', async () => {
    const show = ref(false)
    const Host = defineComponent({
      setup() {
        const model = ref('15551234567')
        const el = shallowRef<HTMLInputElement | null>(null)
        useMask(el, PHONE, { bound: 'unmasked', model })
        return () => (show.value ? h('input', { ref: el }) : null)
      },
    })
    const wrapper = mount(Host)
    show.value = true
    await nextTick()
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('+1 (555) 123-4567')
  })
})
