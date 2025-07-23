import type { FactoryArg, InputMask } from 'imask'
import imask from 'imask/holder'

export function useMask(el: MaybeRefOrGetter<HTMLInputElement | null>, maskOptions: FactoryArg, initOnMounted = true) {
  const rawValue = ref<string>('')
  const maskedValue = ref<string>('')
  const typedValue = ref<string | number>('')

  let mask: InputMask<any> | null = null

  if (initOnMounted) {
    onMounted(() => {
      initMask()
    })
  }

  function initMask() {
    const inputRef = toValue(el)!
    mask = imask(inputRef, maskOptions)
    mask.unmaskedValue = rawValue.value
    maskedValue.value = mask.value
    mask.on('accept', () => {
      rawValue.value = mask!.unmaskedValue
      maskedValue.value = mask!.value
      if (mask!.masked.isComplete) {
        typedValue.value = mask!.typedValue
      }
    })
  }

  watch(rawValue, (newValue) => {
    if (!mask) return
    mask.unmaskedValue = `${newValue}`
  })

  onScopeDispose(() => {
    mask?.destroy()
    mask = null
  })

  return { mask, rawValue, maskedValue, typedValue, initMask }
}
