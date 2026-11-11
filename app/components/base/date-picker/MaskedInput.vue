<script setup lang="ts" generic="Opts extends FactoryOpts, B extends MaskReading = 'unmasked'">
import type { FactoryOpts } from 'imask'
import type { MaskBoundValue, MaskReading, MaskReadings } from '~/composables/useMask'

const props = defineProps<{
  /** Read one time, at mount. To change the mask, change the `:key`; see DESIGN.md. */
  maskOptions: Opts
  /**
   * The reading that `v-model` carries. The other two are read-only; see `accept`.
   * Read one time, at mount, like `maskOptions`.
   */
  bound?: B
}>()

const emit = defineEmits<{
  accept: [readings: MaskReadings<Opts>]
}>()

const model = defineModel<MaskBoundValue<Opts, B>>()

const inputRef = useTemplateRef('inputRef')
const { instance, masked, unmasked, typed } = useMask(
  inputRef,
  props.maskOptions,
  { bound: (props.bound ?? 'unmasked') as B, model },
  readings => emit('accept', readings),
)

defineExpose({ instance, masked, unmasked, typed })
</script>

<template>
  <input
    ref="inputRef"
    type="text"
    class="inputtext"
  >
</template>
