<script setup lang="ts">
import type { FactoryOpts, InputMask } from 'imask'
import { MaskedRange } from 'imask'
import Dropdown from '~/components/Dropdown.vue'

const props = withDefaults(defineProps<{
  hourStep?: number
  minuteStep?: number
}>(), { hourStep: 1, minuteStep: 1 })
const inputRef = useTemplateRef('inputRef')

const maskOptions = {
  mask: 'HH:MM',
  blocks: {
    HH: {
      mask: MaskedRange,
      from: 0,
      to: 23,
      placeholderChar: 'H',
    },
    MM: {
      mask: MaskedRange,
      placeholderChar: 'M',
      from: 0,
      to: 59,
    },
  },
  lazy: false,
  autofix: 'pad',
  overwrite: true,
  eager: 'remove',
} satisfies FactoryOpts

const _unmasked = defineModel<string>({ default: '' })
const _maskedValue = defineModel<string>('masked', { default: '' })
const _typedValue = defineModel<InputMask<FactoryOpts>['typedValue']>('typed')
const { unmasked, masked, typed, mask } = useMask(inputRef as any, maskOptions)

function handleBlur() {
  if (masked.value === 'HH:MM') return
  let [hour, minute] = masked.value.split(':') as [string, string]
  if (hour.includes('H')) hour = `${hour[0]}0`
  if (minute === 'MM') minute = '00'
  else if (minute.endsWith('M')) minute = `0${minute[0]}`
  masked.value = `${hour}:${minute}`
}

const hours = Array.from(
  { length: Math.ceil(24 / props.hourStep) },
  (_, i) => {
    const val = i * props.hourStep
    return { label: val, value: String(val).padStart(2, '0') }
  },
)
const minutes = Array.from(
  { length: Math.ceil(60 / props.minuteStep) },
  (_, i) => {
    const val = i * props.minuteStep
    return { label: val, value: String(val).padStart(2, '0') }
  },
)

const selectedHour = computed(() => _unmasked.value.slice(0, 2))
const selectedMinute = computed(() => _unmasked.value.slice(2))

function onSelectHour(val: string) {
  _unmasked.value = val + _unmasked.value.slice(2)
}

function onSelectMinute(val: string) {
  _unmasked.value = _unmasked.value.slice(0, 2) + val
}

syncRef(_unmasked, unmasked)
syncRef(_maskedValue, masked)
syncRef(_typedValue, typed)
defineExpose({ unmasked, masked, typed, mask })
</script>

<template>
  <Dropdown placement="bottom-start">
    <input
      ref="inputRef"
      type="text" class="inputtext"
      @blur="handleBlur"
    >
    <template #popover>
      <div class="flex">
        <!-- hours -->
        <div class="flex max-h-[200px] scrollbar-none flex-col overflow-y-auto border-r border-elevated p-1">
          <button
            v-for="hour in hours" :key="hour.label"
            class="w-full rounded px-3 py-1.5 hover:bg-elevated/60 data-selected:bg-primary data-selected:text-surface"
            :data-selected="hour.value === selectedHour ? true : undefined"
            @click="onSelectHour(hour.value)"
          >
            {{ hour.label }}
          </button>
        </div>
        <!-- minutes -->
        <div class="flex max-h-[200px] scrollbar-none flex-col overflow-y-auto p-1">
          <button
            v-for="minute in minutes" :key="minute.label"
            class="w-full rounded px-3 py-1.5 hover:bg-elevated/60 data-selected:bg-primary data-selected:text-surface"
            :data-selected="minute.value === selectedMinute ? true : undefined"
            @click="onSelectMinute(minute.value)"
          >
            {{ minute.label }}
          </button>
        </div>
      </div>
    </template>
  </Dropdown>
</template>
