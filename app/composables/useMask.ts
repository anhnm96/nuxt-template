import type { FactoryOpts, InputMask } from 'imask'
import imask from 'imask/holder'
import 'imask/masked/date'
import 'imask/masked/enum'
import 'imask/masked/number'
import 'imask/masked/pattern'
import 'imask/masked/range'
import 'imask/masked/regexp'
import 'imask/masked/function'
import 'imask/masked/factory'
import 'imask/masked/dynamic'

/** The three readings of one entry. See CONTEXT.md — Masked Input. */
export type MaskReading = 'unmasked' | 'masked' | 'typed'

export type MaskTypedValue<Opts extends FactoryOpts> = InputMask<Opts>['typedValue']

export type MaskBoundValue<Opts extends FactoryOpts, B extends MaskReading>
  = B extends 'typed' ? MaskTypedValue<Opts> | null : string

export interface MaskReadings<Opts extends FactoryOpts> {
  masked: string
  unmasked: string
  typed: MaskTypedValue<Opts> | null
}

export interface MaskBinding<Opts extends FactoryOpts, B extends MaskReading> {
  bound: B
  model: Ref<MaskBoundValue<Opts, B> | undefined>
}

/**
 * A consumer may write an equal `Date` that is a different object; that is not a change.
 * `undefined` and `null` both mean "no value", so a Partial Entry on an untouched field
 * does not emit.
 */
function isSameValue(a: unknown, b: unknown) {
  if (a == null && b == null) return true
  return Object.is(a, b) || (a instanceof Date && b instanceof Date && a.getTime() === b.getTime())
}

/**
 * Attaches an imask mask to `el` and binds one reading of it to `model` (ADR-0014).
 *
 * - The composable reads `options` one time. To change the mask, mount a new element.
 * - The composable attaches the mask when `el` resolves to an element. It attaches a new mask
 *   when the element changes, and removes the mask when the element goes.
 * - A write to `model` that the mask corrects returns to `model` in its corrected form.
 */
export function useMask<Opts extends FactoryOpts, B extends MaskReading>(
  el: MaybeRefOrGetter<HTMLInputElement | null | undefined>,
  options: Opts,
  { bound, model }: MaskBinding<Opts, B>,
  onAccept?: (readings: MaskReadings<Opts>) => void,
) {
  const instance = shallowRef<InputMask<Opts> | null>(null)
  const masked = ref('')
  const unmasked = ref('')
  const typed = shallowRef<MaskTypedValue<Opts> | null>(null)

  const boundReading = (): MaskBoundValue<Opts, B> =>
    (bound === 'typed' ? typed.value : bound === 'masked' ? masked.value : unmasked.value) as MaskBoundValue<Opts, B>

  /**
   * Copies the mask into the readings. A Partial Entry leaves `typed` unchanged.
   *
   * `typed` changes only when the mask shows a different value. A date mask parses its text
   * back as midnight, so an exact comparison would treat a written 23:59 as a correction and
   * emit midnight. `typedValueEquals` compares the formatted text instead. It calls `format`,
   * so it runs only while both values are non-null.
   */
  function read(mask: InputMask<Opts>) {
    masked.value = mask.value
    unmasked.value = mask.unmaskedValue
    if (mask.unmaskedValue === '') typed.value = null
    else if (mask.masked.isComplete && !(typed.value != null && mask.masked.typedValueEquals(typed.value)))
      typed.value = mask.typedValue
  }

  function handleAccept() {
    const mask = instance.value!
    read(mask)
    if (!isSameValue(model.value, boundReading())) model.value = boundReading()
    onAccept?.({ masked: masked.value, unmasked: unmasked.value, typed: typed.value })
  }

  /** Puts `value` into the mask. imask fires `accept` only when the text changes. */
  function write(mask: InputMask<Opts>, value: MaskBoundValue<Opts, B> | undefined) {
    if (bound === 'typed') {
      if (value == null) {
        mask.value = ''
      } else {
        // Not `mask.typedValue = value`: that setter first compares with `typedValueEquals`,
        // which calls the consumer's `format` with the current value — `null` while the field
        // is empty or partial. The callers already skip equal values.
        // Set `typed` first: `read` then keeps the written value unless the mask shows it
        // differently, as a clamp does.
        typed.value = value as MaskTypedValue<Opts>
        mask.masked.typedValue = value as MaskTypedValue<Opts>
        mask.updateControl('auto')
      }
    } else if (bound === 'masked') {
      mask.value = (value as string | undefined) ?? ''
    } else {
      mask.unmaskedValue = (value as string | undefined) ?? ''
    }
  }

  /** Under `bound="typed"`, leaving a Partial Entry reverts the field (ADR-0014). */
  function handleBlur() {
    const mask = instance.value
    if (!mask || mask.unmaskedValue === '' || mask.masked.isComplete) return
    write(mask, typed.value as MaskBoundValue<Opts, B>)
  }

  function attach(input: HTMLInputElement) {
    const mask = imask(input, options) as unknown as InputMask<Opts>
    const initial = model.value
    write(mask, initial)
    read(mask)
    instance.value = mask
    mask.on('accept', handleAccept)
    if (bound === 'typed') input.addEventListener('blur', handleBlur)
    // An empty model stays quiet on mount: a placeholder such as `HH:MM` is not a correction.
    if (initial != null && initial !== '' && !isSameValue(initial, boundReading())) model.value = boundReading()
  }

  function detach(input: HTMLInputElement | null | undefined) {
    input?.removeEventListener('blur', handleBlur)
    instance.value?.destroy()
    instance.value = null
  }

  // `sync`, not `post`: Vue sets a template ref in its own post flush, and a `post` watcher
  // that this triggers waits one more tick. The field would then accept input with no mask.
  watch(() => toValue(el), (input, previous) => {
    detach(previous)
    if (input) attach(input)
  }, { immediate: true, flush: 'sync' })

  watch(model, (value) => {
    const mask = instance.value
    if (!mask || isSameValue(value, boundReading())) return
    write(mask, value)
    read(mask)
    // imask stays quiet when the text does not change; the model must still match the mask.
    if (!isSameValue(value, boundReading())) model.value = boundReading()
  })

  onScopeDispose(() => detach(toValue(el)))

  return {
    instance,
    masked: readonly(masked),
    unmasked: readonly(unmasked),
    // Shallow: a deep readonly proxy around a `Date` makes every `Date` method throw.
    typed: shallowReadonly(typed),
  }
}
