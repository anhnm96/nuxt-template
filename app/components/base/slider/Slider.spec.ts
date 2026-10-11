import type { VueWrapper } from '@vue/test-utils'
import { mount } from '@vue/test-utils'
import Slider from './Slider.vue'

/**
 * Hand-rolling the slider made the keymap, the ARIA and the value arithmetic ours, so each
 * is covered here rather than assumed. The Driven Thumb block is the one that regresses
 * silently: nothing about the rendered markup shows that rule is gone.
 */

const TRACK = { left: 0, width: 200 }

/** The Track has no layout under happy-dom, so every pointer test needs a rect to map against. */
function stubTrack(wrapper: VueWrapper<any>) {
  const track = wrapper.find('[data-slot="slider-track"]').element as HTMLElement
  track.getBoundingClientRect = () => ({ ...TRACK, right: TRACK.width, top: 0, bottom: 12, height: 12, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
}

function thumbs(wrapper: VueWrapper<any>) {
  return wrapper.findAll('[data-slot="slider-thumb"]')
}

function valueOf(wrapper: VueWrapper<any>, index = 0) {
  return Number(thumbs(wrapper)[index]!.attributes('aria-valuenow'))
}

function press(key: string, wrapper: VueWrapper<any>, index = 0) {
  return thumbs(wrapper)[index]!.trigger('keydown', { key })
}

/**
 * A press on the Track. `isPrimary` is explicit because the component rejects every
 * non-primary pointer, and a bare trigger leaves it undefined — which reads as secondary.
 */
function pressAt(wrapper: VueWrapper<any>, clientX: number, overrides: Record<string, unknown> = {}) {
  return wrapper.find('[data-slot="slider"]').trigger('pointerdown', {
    button: 0,
    pointerId: 1,
    isPrimary: true,
    clientX,
    ...overrides,
  })
}

/** A pointer event aimed at `window`, which is where usePointerDrag listens. */
function pointer(type: string, clientX: number, pointerId = 1) {
  const event = new Event(type) as Event & { pointerId: number, clientX: number }
  event.pointerId = pointerId
  event.clientX = clientX
  window.dispatchEvent(event)
}

describe('keymap', () => {
  it('increases on Right and Up, decreases on Left and Down', async () => {
    const wrapper = mount(Slider, { props: { modelValue: 50 } })

    await press('ArrowRight', wrapper)
    expect(valueOf(wrapper)).toBe(51)

    await press('ArrowUp', wrapper)
    expect(valueOf(wrapper)).toBe(52)

    await press('ArrowLeft', wrapper)
    expect(valueOf(wrapper)).toBe(51)

    await press('ArrowDown', wrapper)
    expect(valueOf(wrapper)).toBe(50)
  })

  it('moves a tenth of the span on the Page keys', async () => {
    const wrapper = mount(Slider, { props: { modelValue: 50, min: 0, max: 1000 } })

    await press('PageUp', wrapper)
    expect(valueOf(wrapper)).toBe(150)

    await press('PageDown', wrapper)
    expect(valueOf(wrapper)).toBe(50)
  })

  it('goes to the bounds on Home and End', async () => {
    const wrapper = mount(Slider, { props: { modelValue: 50, min: -100, max: 100 } })

    await press('Home', wrapper)
    expect(valueOf(wrapper)).toBe(-100)

    await press('End', wrapper)
    expect(valueOf(wrapper)).toBe(100)
  })

  it('ignores keys it does not own', async () => {
    const wrapper = mount(Slider, { props: { modelValue: 50 } })

    await press('Enter', wrapper)
    await press('a', wrapper)

    expect(valueOf(wrapper)).toBe(50)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})

describe('the step grid', () => {
  it('keeps both ends reachable when the step does not divide the span', async () => {
    const wrapper = mount(Slider, { props: { modelValue: 0, min: 0, max: 10, step: 4 } })

    await press('End', wrapper)
    expect(valueOf(wrapper)).toBe(10)

    await press('Home', wrapper)
    expect(valueOf(wrapper)).toBe(0)
  })

  it('never emits a value outside the bounds', async () => {
    const wrapper = mount(Slider, { props: { modelValue: 8, min: 0, max: 10, step: 4 } })

    await press('ArrowRight', wrapper)

    expect(valueOf(wrapper)).toBe(10)
  })

  it('does not drift on fractional steps', async () => {
    const wrapper = mount(Slider, { props: { modelValue: 0.2, min: 0, max: 1, step: 0.1 } })

    await press('ArrowRight', wrapper)

    expect(valueOf(wrapper)).toBe(0.3)
  })

  /*
    The grid is offset by `min` and the ends are grid candidates, so a snapped value can carry
    more decimals than `step` does. Rounding to the step's decimals alone pushed `max: 10.5`
    out to 11 — above the Slider's own bound. Every case here has a fractional `min` or `max`.
  */
  /*
    Asserted on what is *emitted*, not on `aria-valuenow`: the rendered position is clamped
    for display, so an overshoot of 11 against `max: 10.5` still reads back as 10.5 and only
    escapes through the model.
  */
  it('reaches a fractional max without emitting past it', async () => {
    const wrapper = mount(Slider, { props: { modelValue: 5.5, min: 0.5, max: 10.5, step: 1 } })

    await press('End', wrapper)

    expect(wrapper.emitted('update:modelValue')!.at(-1)).toEqual([10.5])
    expect(valueOf(wrapper)).toBe(10.5)
  })

  it('reaches a fractional min exactly', async () => {
    const wrapper = mount(Slider, { props: { modelValue: 5.5, min: 0.5, max: 10.5, step: 1 } })

    await press('Home', wrapper)

    expect(valueOf(wrapper)).toBe(0.5)
  })

  it('keeps two decimals of min against a whole-number step', async () => {
    const wrapper = mount(Slider, { props: { modelValue: 50, min: 0.99, max: 100.99, step: 1 } })

    await press('Home', wrapper)

    expect(valueOf(wrapper)).toBe(0.99)
  })

  it('keeps a fractional max when only max carries decimals', async () => {
    const wrapper = mount(Slider, { props: { modelValue: 5, min: 0, max: 10.5, step: 1 } })

    await press('End', wrapper)

    expect(wrapper.emitted('update:modelValue')!.at(-1)).toEqual([10.5])
  })

  it('holds a grid point whose decimals come from min', async () => {
    const wrapper = mount(Slider, { props: { modelValue: 0.45, min: 0.05, max: 1.05, step: 0.1 } })

    await press('Home', wrapper)

    expect(valueOf(wrapper)).toBe(0.05)
  })

  it('handles a step small enough to stringify exponentially', async () => {
    // String(1e-7) is '1e-7', which has no decimal point to count.
    const wrapper = mount(Slider, { props: { modelValue: 0.25, min: 0, max: 1, step: 1e-7 } })
    stubTrack(wrapper)

    await pressAt(wrapper, 50)

    expect(valueOf(wrapper)).toBeCloseTo(0.25, 6)
  })

  it('does not snap when the step is zero', async () => {
    const wrapper = mount(Slider, { props: { modelValue: 0, min: 0, max: 10, step: 0 } })
    stubTrack(wrapper)

    await pressAt(wrapper, 33)

    expect(valueOf(wrapper)).toBeCloseTo(1.65, 5)
  })
})

describe('two Thumbs', () => {
  it('emits a sorted pair once they cross', async () => {
    const wrapper = mount(Slider, {
      props: { modelValue: [20, 80] as [number, number], range: true, step: 10 },
    })

    // Drive the lower Thumb past the upper one.
    for (let i = 0; i < 8; i++) await press('ArrowRight', wrapper, 0)

    expect(valueOf(wrapper, 0)).toBe(100)
    expect(valueOf(wrapper, 1)).toBe(80)
    expect(wrapper.emitted('update:modelValue')!.at(-1)).toEqual([[80, 100]])
  })

  it('labels the Thumbs by order, not by identity', async () => {
    const wrapper = mount(Slider, {
      props: { modelValue: [20, 80] as [number, number], range: true, step: 10, label: 'Price' },
    })

    expect(thumbs(wrapper)[0]!.attributes('aria-label')).toBe('Price minimum')

    for (let i = 0; i < 8; i++) await press('ArrowRight', wrapper, 0)

    // The same element now holds the larger value, so it is now the maximum.
    expect(thumbs(wrapper)[0]!.attributes('aria-label')).toBe('Price maximum')
    expect(thumbs(wrapper)[1]!.attributes('aria-label')).toBe('Price minimum')
  })

  it('reports the full bounds on each Thumb, because they may cross', () => {
    const wrapper = mount(Slider, {
      props: { modelValue: [20, 80] as [number, number], range: true, min: 0, max: 100 },
    })

    for (const thumb of thumbs(wrapper)) {
      expect(thumb.attributes('aria-valuemin')).toBe('0')
      expect(thumb.attributes('aria-valuemax')).toBe('100')
    }
  })

  it('moves the nearest Thumb when the Track is pressed', async () => {
    const wrapper = mount(Slider, {
      props: { modelValue: [20, 80] as [number, number], range: true },
    })
    stubTrack(wrapper)

    // 180px of 200px is 90, nearest to the upper Thumb.
    await pressAt(wrapper, 180)

    expect(valueOf(wrapper, 0)).toBe(20)
    expect(valueOf(wrapper, 1)).toBe(90)
  })
})

describe('the Driven Thumb', () => {
  /*
    The rule exists for `:model-value` + `@change` bindings, where the model deliberately does
    not move until the gesture ends. Without it every reactive tick would snap the Thumb back
    to the stale model, and the control would be unusable.
  */
  /**
   * The listener has to be present and do nothing. Without it `defineModel` falls back to
   * local state, the model moves on its own, and the rule under test never comes into play.
   */
  const ignoringParent = { 'modelValue': 50, 'onUpdate:modelValue': () => {} }

  it('does not re-read a stale model while a Thumb holds focus', async () => {
    const wrapper = mount(Slider, { props: { ...ignoringParent } })

    await thumbs(wrapper)[0]!.trigger('focus')
    await press('ArrowRight', wrapper)

    expect(wrapper.props('modelValue')).toBe(50)
    expect(valueOf(wrapper)).toBe(51)
  })

  it('re-reads the model once the Thumb is released', async () => {
    const wrapper = mount(Slider, { props: { ...ignoringParent } })

    await thumbs(wrapper)[0]!.trigger('focus')
    await press('ArrowRight', wrapper)
    await thumbs(wrapper)[0]!.trigger('blur')

    expect(valueOf(wrapper)).toBe(50)
  })

  it('does not teleport crossed Thumbs when the sorted model is echoed back', async () => {
    const wrapper = mount(Slider, {
      props: { modelValue: [20, 80] as [number, number], range: true, step: 10 },
    })

    for (let i = 0; i < 8; i++) await press('ArrowRight', wrapper, 0)
    expect(valueOf(wrapper, 0)).toBe(100)

    // The parent echoes exactly what was emitted, with no Thumb driven.
    await wrapper.setProps({ modelValue: [80, 100] as [number, number] })

    expect(valueOf(wrapper, 0)).toBe(100)
    expect(valueOf(wrapper, 1)).toBe(80)
  })
})

describe('emission cadence', () => {
  it('updates throughout a drag and changes once at the end', async () => {
    const wrapper = mount(Slider, { props: { modelValue: 0 } })
    stubTrack(wrapper)

    await pressAt(wrapper, 20)
    pointer('pointermove', 60)
    pointer('pointermove', 100)
    pointer('pointerup', 100)
    await nextTick()

    expect(wrapper.emitted('update:modelValue')).toHaveLength(3)
    expect(wrapper.emitted('change')).toHaveLength(1)
    expect(wrapper.emitted('change')![0]).toEqual([50])
  })

  it('changes once per committed key press', async () => {
    const wrapper = mount(Slider, { props: { modelValue: 50 } })

    await press('ArrowRight', wrapper)

    expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
    expect(wrapper.emitted('change')).toHaveLength(1)
  })

  /*
    `change` is what an expensive consumer binds to, so firing it for a press that moved
    nothing re-runs their work for free. Native fires `change` only on an actual change.
  */
  it('does not change when a key cannot move the value', async () => {
    const wrapper = mount(Slider, { props: { modelValue: 100, min: 0, max: 100 } })

    await press('ArrowRight', wrapper)
    await press('ArrowRight', wrapper)
    await press('End', wrapper)

    expect(wrapper.emitted('change')).toBeUndefined()
  })

  it('does not change when a press lands on the current value', async () => {
    const wrapper = mount(Slider, { props: { modelValue: 50 } })
    stubTrack(wrapper)

    // 100px of 200px over 0..100 is exactly 50, the value it already holds.
    await pressAt(wrapper, 100)
    pointer('pointerup', 100)
    await nextTick()

    expect(wrapper.emitted('change')).toBeUndefined()
  })

  it('does not change when a drag is released where it began', async () => {
    const wrapper = mount(Slider, { props: { modelValue: 50, trackPress: 'ignore' } })
    stubTrack(wrapper)

    await pressAt(wrapper, 40)
    pointer('pointermove', 80)
    pointer('pointermove', 40)
    pointer('pointerup', 40)
    await nextTick()

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('change')).toBeUndefined()
  })
})

describe('a gesture already in flight', () => {
  it('ignores a second pointer rather than handing it the drag', async () => {
    const wrapper = mount(Slider, {
      props: { modelValue: [20, 80] as [number, number], range: true },
    })
    stubTrack(wrapper)

    // One finger grabs the lower Thumb and drags it to 30.
    await pressAt(wrapper, 40)
    pointer('pointermove', 60)
    await nextTick()
    expect(valueOf(wrapper, 0)).toBe(30)

    // A second finger lands near the upper Thumb while the first is still down.
    await pressAt(wrapper, 190, { pointerId: 2, isPrimary: false })
    await nextTick()
    expect(valueOf(wrapper, 1)).toBe(80)

    // The first finger keeps moving, and still owns the Thumb it grabbed.
    pointer('pointermove', 80)
    await nextTick()
    expect(valueOf(wrapper, 0)).toBe(40)
    expect(valueOf(wrapper, 1)).toBe(80)
  })

  /*
    The guard keys on `isPrimary`, not on "a drag is registered", so a gesture whose pointerup
    never arrived cannot wedge the Slider. Rejecting on registered state made the first lost
    pointerup the last press the component ever answered.
  */
  it('recovers from a gesture whose pointerup never arrived', async () => {
    const wrapper = mount(Slider, { props: { modelValue: 10 } })
    stubTrack(wrapper)

    // A drag starts and the window never delivers pointerup or pointercancel.
    await pressAt(wrapper, 40)
    pointer('pointermove', 60)
    await nextTick()
    expect(valueOf(wrapper)).toBe(30)

    // A fresh primary press must take over, and must still track afterwards.
    await pressAt(wrapper, 100)
    await nextTick()
    expect(valueOf(wrapper)).toBe(50)

    pointer('pointermove', 160)
    await nextTick()
    expect(valueOf(wrapper)).toBe(80)
  })
})

describe('disabled', () => {
  it('is out of the tab order but still in the accessibility tree', () => {
    const wrapper = mount(Slider, { props: { modelValue: 50, disabled: true } })
    const thumb = thumbs(wrapper)[0]!

    expect(thumb.attributes('tabindex')).toBeUndefined()
    expect(thumb.attributes('aria-disabled')).toBe('true')
    expect(wrapper.attributes('data-disabled')).toBe('true')
  })

  it('ignores keys and presses', async () => {
    const wrapper = mount(Slider, { props: { modelValue: 50, disabled: true } })
    stubTrack(wrapper)

    await press('ArrowRight', wrapper)
    await pressAt(wrapper, 180)

    expect(valueOf(wrapper)).toBe(50)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  /** `disabled` guards the entry points; a gesture already running has to be stopped too. */
  it('stops a drag that is already in flight', async () => {
    const wrapper = mount(Slider, { props: { modelValue: 50 } })
    stubTrack(wrapper)

    await pressAt(wrapper, 100)
    pointer('pointermove', 120)
    await nextTick()
    expect(valueOf(wrapper)).toBe(60)

    await wrapper.setProps({ disabled: true })
    pointer('pointermove', 180)
    await nextTick()

    expect(valueOf(wrapper)).toBe(60)
  })

  /** Clearing the Driven Thumb matters: a stuck one would freeze reconciliation for good. */
  it('reads its model again after being disabled mid-drag', async () => {
    const wrapper = mount(Slider, { props: { modelValue: 50 } })
    stubTrack(wrapper)

    await pressAt(wrapper, 100)
    await wrapper.setProps({ disabled: true })
    await wrapper.setProps({ modelValue: 10 })

    expect(valueOf(wrapper)).toBe(10)
  })
})

describe('an invalid incoming value', () => {
  it('renders it clamped and emits nothing', () => {
    const wrapper = mount(Slider, { props: { modelValue: 150, min: 0, max: 100 } })

    expect(valueOf(wrapper)).toBe(100)
    expect(wrapper.attributes('data-out-of-range')).toBe('true')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('leaves an off-grid value alone until the user moves it', async () => {
    const wrapper = mount(Slider, { props: { modelValue: 37, min: 0, max: 100, step: 5 } })

    expect(valueOf(wrapper)).toBe(37)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()

    await press('ArrowRight', wrapper)

    expect(valueOf(wrapper)).toBe(40)
  })
})

describe('presentation', () => {
  it('grows the Fill from the Origin rather than from min', () => {
    const wrapper = mount(Slider, { props: { modelValue: 50, min: -100, max: 100, origin: 0 } })
    const fill = wrapper.find('[data-slot="slider-fill"]')

    expect(fill.attributes('style')).toContain('left: 50%')
    expect(fill.attributes('style')).toContain('calc(100% - 75%)')
  })

  it('hands the slot a coordinate helper', () => {
    const wrapper = mount(Slider, {
      props: { modelValue: 0, min: 0, max: 1000 },
      slots: { default: '<span class="tick" :style="{ left: percentOf(250) }" />' },
    })

    expect(wrapper.find('.tick').attributes('style')).toContain('left: 25%')
  })
})
