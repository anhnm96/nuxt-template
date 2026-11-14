<script setup lang="ts">
import type { FactoryOpts } from 'imask'
import MaskedRange from 'imask/masked/range'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<{
  hourStep?: number
  minuteStep?: number
  /** The accessible name of the hour column. */
  hoursLabel?: string
  /** The accessible name of the minute column. */
  minutesLabel?: string
}>(), { hourStep: 1, minuteStep: 1, hoursLabel: 'Hours', minutesLabel: 'Minutes' })

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

const EMPTY_TIME = 'HH:MM'

const COMPLETE_TIME = /^\d{2}:\d{2}$/

const time = defineModel<string>({ default: '' })
/**
 * The Masked Value, which can hold a Partial Entry such as `09:MM`. `time` carries only a
 * complete `HH:mm`, or `''` for the empty mask, so a schema never sees placeholder characters.
 */
const fieldText = ref(time.value || EMPTY_TIME)
/** The `time` that `fieldText` stands for. A Partial Entry stands for none. */
function timeOf(text: string) {
  if (text === EMPTY_TIME) return ''
  return COMPLETE_TIME.test(text) ? text : undefined
}
watch(fieldText, (text) => {
  const next = timeOf(text)
  if (next !== undefined) time.value = next
})
watch(time, (value) => {
  if (value !== timeOf(fieldText.value)) fieldText.value = value || EMPTY_TIME
})
const { instance, masked, typed } = useMask(inputRef, maskOptions, { bound: 'masked', model: fieldText })

/**
 * A column pick and the blur padding are user input, so they go into the mask as a keystroke
 * does. The mask then updates `time`. A write to `time` would first emit the uncorrected text.
 */
function enterTime(value: string) {
  if (instance.value) instance.value.value = value
}

function onBlur() {
  if (masked.value === EMPTY_TIME) return
  let [hour, minute] = masked.value.split(':') as [string, string]
  hour = hour.replaceAll('H', '').padStart(2, '0')
  minute = minute.replaceAll('M', '').padStart(2, '0')
  enterTime(`${hour}:${minute}`)
}

defineExpose({ instance, masked, typed })
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
const COLUMN = {
  HOUR: 0,
  MINUTE: 1,
} as const
type Column = ValueOf<typeof COLUMN>
const activeColumn = ref<Column>(COLUMN.HOUR)

const selectedHour = computed(() => masked.value.slice(0, 2))
const selectedMinute = computed(() => masked.value.slice(3))

/** The column elements. Read only to scroll an option into view, so they are not reactive. */
const listEls: Record<Column, HTMLElement | null> = { [COLUMN.HOUR]: null, [COLUMN.MINUTE]: null }

const columns = {
  [COLUMN.HOUR]: { id: COLUMN.HOUR, list: hours, selected: selectedHour, label: () => props.hoursLabel },
  [COLUMN.MINUTE]: { id: COLUMN.MINUTE, list: minutes, selected: selectedMinute, label: () => props.minutesLabel },
} as const

// The Masked Value is always five characters wide, so a slice replaces exactly one column.
function selectInColumn(column: Column, val: string) {
  enterTime(column === COLUMN.HOUR ? val + masked.value.slice(2) : masked.value.slice(0, 3) + val)
  focusColumn(column)
}

const pickerId = useId()
const listboxIds = {
  [COLUMN.HOUR]: `${pickerId}-hours`,
  [COLUMN.MINUTE]: `${pickerId}-minutes`,
} as const
const optionId = (column: Column, value: string) => `${listboxIds[column]}-${value}`

const colonIndex = 2

// Move activeColumn to whichever column the caret currently sits in.
function syncActiveColumnFromCaret() {
  const el = inputRef.value
  if (!el) return
  const pos = el.selectionStart ?? 0
  activeColumn.value = pos <= colonIndex ? COLUMN.HOUR : COLUMN.MINUTE
}

const open = ref(false)

/** The selected option of the active column, while the popover shows it. */
const activeDescendant = computed(() => {
  if (!open.value) return undefined
  const col = columns[activeColumn.value]
  return col.list.some(item => item.value === col.selected.value)
    ? optionId(activeColumn.value, col.selected.value)
    : undefined
})

watch(open, async (newOpen) => {
  if (!newOpen) {
    onBlur()
    return
  }
  await nextTick()
  // scroll the selected hour and minute into view
  scrollIntoItem()
  // align the focused column with the caret
  syncActiveColumnFromCaret()
})

function scrollIntoItem() {
  for (const col of Object.values(columns)) {
    const index = col.list.findIndex(item => item.value === col.selected.value)
    listEls[col.id]?.children[index]?.scrollIntoView({ block: 'nearest' })
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
  if (!el) return
  const pos = el.selectionStart ?? 0
  if (activeColumn.value === COLUMN.HOUR && pos > colonIndex) {
    el.setSelectionRange(0, 0)
  } else if (activeColumn.value === COLUMN.MINUTE && pos <= colonIndex) {
    el.setSelectionRange(colonIndex + 1, colonIndex + 1)
  }
}

// Clicking a popover option moves focus to the button, so hand focus back to
// the input and select the segment that was just picked: it shows which column
// is active, and `overwrite` makes the next keystroke replace it cleanly.
function focusColumn(column: Column) {
  activeColumn.value = column
  nextTick(() => {
    const el = inputRef.value
    if (!el) return
    el.focus()
    if (column === COLUMN.HOUR) el.setSelectionRange(0, colonIndex)
    else el.setSelectionRange(colonIndex + 1, el.value.length)
  })
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
  selectInColumn(col.id, col.list[nextIndex]!.value)
  nextTick(() => {
    if (el && start !== null) el.setSelectionRange(start, end)
  })

  listEls[col.id]?.children[nextIndex]?.scrollIntoView({ block: 'nearest' })
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault()
    if (!open.value) open.value = true
    stepColumn(e.key === 'ArrowUp' ? -1 : 1)
  } else if (e.key === 'Tab' && open.value) {
    // Tab moves forward through the columns and Shift+Tab back. Past the last column in that
    // direction, the key closes the popover and moves focus on, so the field is not a trap.
    const target = e.shiftKey ? COLUMN.HOUR : COLUMN.MINUTE
    if (activeColumn.value === target) {
      open.value = false
      return
    }
    e.preventDefault()
    activeColumn.value = target
    syncCaretFromActiveColumn()
  }
}

function onClick() {
  open.value = true
  syncActiveColumnFromCaret()
}

// Keys that move the caret within the input: by keyup the browser has already
// placed it, so just read its position back into the focused column.
const CARET_MOVE_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'Home', 'End'])
function onKeyUp(e: KeyboardEvent) {
  if (CARET_MOVE_KEYS.has(e.key)) syncActiveColumnFromCaret()
}
</script>

<template>
  <!--
    A Field Popover: the input owns every key, including the `ArrowDown` that opens the
    Popover — `onKeyDown` does that itself. See CONTEXT.md — Field Popover.
    The input is the Popover's anchor, so a click in it never reaches click-outside.
  -->
  <Popover v-model:open="open" placement="bottom-start" slot-name="time-picker">
    <template #default>
      <!--
        `role="combobox"`, not a bare `aria-expanded`: a reader ignores `aria-expanded` on the
        implicit `textbox` role. Focus never leaves the field, so `aria-activedescendant` names
        the option that the arrow keys move. `aria-controls` names the columns only while they
        are rendered.
        A click opens and never closes, so it can place the caret: closing pads the entry,
        and would turn `09:MM` into `09:00`. The click also moves the active column to the
        caret, as the caret keys do.
      -->
      <input
        v-bind="$attrs"
        ref="inputRef"
        type="text" class="inputtext"
        role="combobox"
        aria-haspopup="listbox"
        :aria-expanded="open"
        :aria-controls="open ? `${listboxIds[COLUMN.HOUR]} ${listboxIds[COLUMN.MINUTE]}` : undefined"
        :aria-activedescendant="activeDescendant"
        inputmode="numeric"
        autocomplete="off"
        autocorrect="off"
        spellcheck="false"
        @click="onClick"
        @blur="onBlur"
        @keydown="onKeyDown"
        @keyup="onKeyUp"
        @input="syncActiveColumnFromCaret"
      >
    </template>

    <template #popover>
      <!--
        `@mousedown.prevent` on both columns keeps focus in the field (CONTEXT.md — Field
        Popover). It covers the options, the gaps between them and the column padding: a
        press on any of them would move focus to the column. The blur would then pad `09:MM`
        to `09:00` and scroll the minute list before the click ends, so the click misses.
      -->
      <div class="flex" @mousedown.prevent>
        <!-- column -->
        <div
          v-for="col in columns"
          :id="listboxIds[col.id]"
          :key="col.id"
          :ref="(el) => { listEls[col.id] = el as HTMLElement | null }"
          class="flex max-h-[200px] scrollbar-none flex-col overflow-y-auto p-1"
          :class="{ 'border-r border-elevated': col.id === COLUMN.HOUR }"
          role="listbox" tabindex="-1" :aria-label="col.label()"
        >
          <button
            v-for="item in col.list" :id="optionId(col.id, item.value)" :key="item.label"
            tabindex="-1"
            class="w-full rounded px-3 py-1.5 hover:bg-elevated/60 data-selected:bg-primary data-selected:text-surface data-focus:data-selected:ring-[3px] data-focus:data-selected:ring-ring"
            :data-selected="item.value === col.selected.value ? true : undefined"
            :data-focus="activeColumn === col.id ? true : undefined"
            :data-value="item.value"
            role="option"
            :aria-selected="item.value === col.selected.value"
            @click="selectInColumn(col.id, item.value)"
          >
            {{ item.label }}
          </button>
        </div>
      </div>
    </template>
  </Popover>
</template>
