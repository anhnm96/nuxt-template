import type { FactoryOpts, InputMask, InputMaskElement } from 'imask'
import imask from 'imask/holder'
import 'imask/masked/number'
import 'imask/masked/pattern'
import 'imask/masked/regexp'
import 'imask/masked/function'
import 'imask/masked/factory'
import 'imask/masked/dynamic'

export function useMask<MaskElement extends InputMaskElement, Opts extends FactoryOpts>(el: MaybeRefOrGetter<MaskElement | null>, maskOptions: MaybeRef<Opts>, initOnMounted = true) {
  const unmasked = ref<string>('')
  const masked = ref<string>('')
  const typed = ref<InputMask<Opts>['typedValue']>()

  const mask = shallowRef<InputMask<Opts> | null>(null)

  let $lastAcceptedValue: InputMask<Opts>['value'] | undefined = masked.value
  let $lastAcceptedUnmaskedValue: InputMask<Opts>['unmaskedValue'] | undefined = unmasked.value
  let $lastAcceptedTypedValue: InputMask<Opts>['typedValue'] | undefined = typed.value
  function storeLastAcceptedValues() {
    // $lastAcceptedTypedValue = typed.value = (mask.value as InputMask<FactoryOpts>).typedValue
    $lastAcceptedUnmaskedValue = unmasked.value = (mask.value as InputMask<Opts>).unmaskedValue
    $lastAcceptedValue = masked.value = (mask.value as InputMask<Opts>).value
  }

  if (initOnMounted) {
    onMounted(() => {
      initMask()
    })
  }

  function _onAccept() {
    storeLastAcceptedValues()
  }

  function initMask() {
    const inputRef = toValue(el)!
    mask.value = imask(inputRef, toValue(maskOptions))
    mask.value.unmaskedValue = unmasked.value
    masked.value = mask.value.value

    updateUnmaskedValue()
    updateMaskedValue()
    updateTypedValue()

    storeLastAcceptedValues()

    mask.value.on('accept', _onAccept)
    mask.value.on('complete', () => {
      $lastAcceptedTypedValue = typed.value = (mask.value as InputMask<FactoryOpts>).typedValue
    })
  }
  function updateUnmaskedValue() {
    if (!mask.value || unmasked.value === undefined) return

    if ($lastAcceptedUnmaskedValue !== unmasked.value) {
      mask.value.unmaskedValue = unmasked.value
    }
    $lastAcceptedUnmaskedValue = undefined
  }
  watch(unmasked, updateUnmaskedValue)

  function updateMaskedValue() {
    if (!mask.value || masked.value === undefined) return

    if ($lastAcceptedValue !== masked.value) {
      mask.value.value = masked.value
    }
    $lastAcceptedValue = undefined
  }
  watch(masked, updateMaskedValue)

  function updateTypedValue() {
    if (!mask.value || typed.value === undefined) return

    if ($lastAcceptedTypedValue !== typed.value) {
      mask.value.typedValue = typed.value
      if (!mask.value.masked.typedValueEquals(typed.value)) _onAccept()
    }
    $lastAcceptedTypedValue = undefined
  }
  watch(typed, updateTypedValue)

  function destroyMask() {
    mask.value?.destroy()
    mask.value = null
  }

  onScopeDispose(() => {
    destroyMask()
  })

  return { mask, unmasked, masked, typed, initMask }
}
