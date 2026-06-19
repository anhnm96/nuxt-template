<script setup lang="ts">
import type { FactoryOpts, InputMask } from 'imask'
import { MaskedRange } from 'imask'
import Dropdown from '~/components/Dropdown.vue'

defineOptions({
  inhertiAttrs: false,
})

const props = withDefaults(defineProps<{
  hourStep?: number
  minuteStep?: number
}>(), { hourStep: 1, minuteStep: 1 })

const inputRef = useTemplateRef('inputRef')

// #region mask
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

function onBlur() {
  if (masked.value === 'HH:MM') return
  let [hour, minute] = masked.value.split(':') as [string, string]
  hour = hour.replaceAll('H', '').padStart(2, '0')
  minute = minute.replaceAll('M', '').padStart(2, '0')
  masked.value = `${hour}:${minute}`
}

syncRef(_unmasked, unmasked)
syncRef(_maskedValue, masked)
syncRef(_typedValue, typed)

defineExpose({ unmasked, masked, typed, mask })
// #endregion mask

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
const hourListRef = useTemplateRef('hourListRef')
const minuteListRef = useTemplateRef('minuteListRef')
const COLUMN = {
  HOUR: 0,
  MINUTE: 1,
} as const
const activeColumn = ref<ValueOf<typeof COLUMN>>(COLUMN.HOUR)

const selectedHour = computed(() => masked.value.slice(0, 2))
const selectedMinute = computed(() => masked.value.slice(3))

function onSelectHour(val: string) {
  _unmasked.value = val + _unmasked.value.slice(2)
}

function onSelectMinute(val: string) {
  _unmasked.value = _unmasked.value.slice(0, 2) + val
}

const columns = {
  [COLUMN.HOUR]: { list: hours, listRef: hourListRef, selected: selectedHour, select: onSelectHour },
  [COLUMN.MINUTE]: { list: minutes, listRef: minuteListRef, selected: selectedMinute, select: onSelectMinute },
} as const

const colonIndex = computed(() => masked.value.indexOf(':'))

// Move activeColumn to whichever column the caret currently sits in.
function syncActiveColumnFromCaret() {
  const el = inputRef.value
  if (!el || colonIndex.value === -1) return
  const pos = el.selectionStart ?? 0
  activeColumn.value = pos <= colonIndex.value ? COLUMN.HOUR : COLUMN.MINUTE
}

const open = ref(false)
watch(open, async (newOpen) => {
  if (!newOpen) return
  await nextTick()
  // scroll the selected hour and minute into view
  scrollIntoItem()
  // align the focused column with the caret
  syncActiveColumnFromCaret()
})

function scrollIntoItem() {
  for (const col of Object.values(columns)) {
    const index = col.list.findIndex(item => item.value === col.selected.value)
    col.listRef.value?.children[index]?.scrollIntoView({ block: 'nearest' })
  }
}

watch(masked, async () => {
  if (!open.value) return
  scrollIntoItem()
})

// Keep the caret in sync with the activeColumn. Only nudge the caret when it
// is on the wrong side of the colon, so arrow-key moves don't fight the user.
function syncCaretFromActiveColumn() {
  const el = inputRef.value
  if (!el || colonIndex.value === -1) return
  const pos = el.selectionStart ?? 0
  if (activeColumn.value === COLUMN.HOUR && pos > colonIndex.value) {
    el.setSelectionRange(0, 0)
  } else if (activeColumn.value === COLUMN.MINUTE && pos <= colonIndex.value) {
    el.setSelectionRange(colonIndex.value + 1, colonIndex.value + 1)
  }
}

function stepColumn(direction: -1 | 1) {
  const col = columns[activeColumn.value]
  const currentIndex = col.list.findIndex(item => item.value === col.selected.value)
  const len = col.list.length
  // -1 means nothing selected yet: Down -> first item, Up -> last item
  const nextIndex = currentIndex === -1
    ? (direction === 1 ? 0 : len - 1)
    : (currentIndex + direction + len) % len

  // Updating the value makes imask rewrite the input and reset the caret to the
  // end, so snapshot the selection and restore it once the value has settled.
  const el = inputRef.value
  const start = el?.selectionStart ?? null
  const end = el?.selectionEnd ?? null
  col.select(col.list[nextIndex]!.value)
  nextTick(() => {
    if (el && start !== null) el.setSelectionRange(start, end)
  })

  col.listRef.value?.children[nextIndex]?.scrollIntoView({ block: 'nearest' })
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault()
    if (!open.value) open.value = true
    stepColumn(e.key === 'ArrowUp' ? -1 : 1)
  } else if (e.key === 'Tab' && open.value) {
    e.preventDefault()
    activeColumn.value = activeColumn.value === COLUMN.MINUTE ? COLUMN.HOUR : COLUMN.MINUTE
    syncCaretFromActiveColumn()
  }
}

// Keys that move the caret within the input: by keyup the browser has already
// placed it, so just read its position back into the focused column.
const CARET_MOVE_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'Home', 'End'])
function onKeyUp(e: KeyboardEvent) {
  if (CARET_MOVE_KEYS.has(e.key)) syncActiveColumnFromCaret()
}
</script>

<template>
  <Dropdown v-model:open="open" placement="bottom-start" :focus-on-open="false">
    <input
      v-bind="$attrs"
      ref="inputRef"
      type="text" class="inputtext"
      :aria-expanded="open"
      inputmode="numeric"
      autocomplete="off"
      autocorrect="off"
      spellcheck="false"
      @blur="onBlur"
      @keydown="onKeyDown"
      @keyup="onKeyUp"
      @input="syncActiveColumnFromCaret"
    >
    <template #popover>
      <div class="flex">
        <!-- hours -->
        <div
          ref="hourListRef" class="flex max-h-[200px] scrollbar-none flex-col overflow-y-auto border-r border-elevated p-1"
          role="listbox" tabindex="-1"
        >
          <button
            v-for="hour in hours" :key="hour.label"
            class="w-full rounded px-3 py-1.5 hover:bg-elevated/60 data-selected:bg-primary data-selected:text-surface data-focus:data-selected:ring-[3px] data-focus:data-selected:ring-ring"
            :data-selected="hour.value === selectedHour ? true : undefined"
            :data-focus="activeColumn === COLUMN.HOUR ? true : undefined"
            :data-value="hour.value"
            role="option"
            :aria-selected="hour.value === selectedHour"
            @click="onSelectHour(hour.value)"
          >
            {{ hour.label }}
          </button>
        </div>
        <!-- minutes -->
        <div
          ref="minuteListRef" class="flex max-h-[200px] scrollbar-none flex-col overflow-y-auto p-1"
          role="listbox" tabindex="-1"
        >
          <button
            v-for="minute in minutes" :key="minute.label"
            class="w-full rounded px-3 py-1.5 hover:bg-elevated/60 data-selected:bg-primary data-selected:text-surface data-focus:data-selected:ring-[3px] data-focus:data-selected:ring-ring"
            :data-selected="minute.value === selectedMinute ? true : undefined"
            :data-focus="activeColumn === COLUMN.MINUTE ? true : undefined"
            :data-value="minute.value"
            role="option"
            :aria-selected="minute.value === selectedMinute"
            @click="onSelectMinute(minute.value)"
          >
            {{ minute.label }}
          </button>
        </div>
      </div>
    </template>
  </Dropdown>
</template>
