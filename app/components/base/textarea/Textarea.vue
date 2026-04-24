<script lang="ts" setup>
interface PropsType {
  maxChars?: number
  maxLines?: number
  modelValue: string
  initialRows?: number
  textareaMaxRows?: number
  preview?: boolean
}
const props = withDefaults(defineProps<PropsType>(), {
  maxChars: 40,
  initialRows: 1,
})

const emit = defineEmits<{ (e: 'update:modelValue', payload: string): void }>()

const textareaRef = ref()
const htmlareaRef = useTemplateRef('htmlareaRef')
const lineExcessStartIndex = ref<number | null>(null)
const lineCount = ref(0)
const measureRef = useTemplateRef('measureRef')
const effectiveLimit = computed(() => {
  const charLimit = props.maxChars < 0 ? Infinity : props.maxChars
  const rowLimit = !lineExcessStartIndex.value ? Infinity : lineExcessStartIndex.value
  return Math.min(charLimit, rowLimit)
})
const valueAllowed = computed(() => {
  return props.modelValue.slice(0, effectiveLimit.value)
})
const valueExcess = computed(() => {
  return props.modelValue.slice(effectiveLimit.value)
})
const limitStatus = computed(() => {
  return (props.modelValue.length / props.maxChars) * 100
})
const remainingCharacters = computed(() => {
  return props.maxChars - props.modelValue.length
})

function updateValue(e: Event) {
  const value = (e.target as HTMLInputElement).value
  emit(`update:modelValue`, value)
  textareaGrow(value)
}

// #region preview
const previewRef = useTemplateRef('previewRef')
const isFocused = ref(!props.preview)
const savedRows = ref(0)
const previewEvents = {
  onPointerdown(e: Event) {
    isFocused.value = true
    if (savedRows.value) {
      animateRows(savedRows.value)
    }
    htmlareaRef.value!.style.height = ''
    // reset overflow when focused
    htmlareaRef.value!.style.overflowY = ''
    textareaRef.value!.style.overflowY = ''
    const target = e.target as HTMLInputElement
    const selStart = target.selectionStart ?? 0
    const selEnd = target.selectionEnd ?? selStart
    textareaRef.value.focus()
    textareaRef.value.selectionStart = selStart
    textareaRef.value.selectionEnd = selEnd
  },
  onBlur() {
    // Ignore redundant blurs: when the user switches browser tabs, blur fires
    // while rows is still the expanded value. On tab return, the browser
    // auto-restores focus to the textarea, so clicking elsewhere fires blur
    // again — but rows is now already collapsed, which would overwrite
    // savedRows with the wrong (preview) value.
    if (!isFocused.value) return
    isFocused.value = false
    handleCollapse()
  },
}

function handleCollapse() {
  if (!htmlareaRef.value || !textareaRef.value) return
  htmlareaRef.value.scrollTop = 0
  textareaRef.value.scrollTop = 0
  // prevent scroll when previewing
  htmlareaRef.value.style.overflowY = 'hidden'
  textareaRef.value.style.overflowY = 'hidden'
  textareaRef.value.selectionStart = 0
  textareaRef.value.selectionEnd = 0
  savedRows.value = textareaRef.value.rows
  animateRows(props.initialRows)
  // Freeze htmlarea height to preview height
  nextTick(() => {
    const previewHeight = previewRef.value!.offsetHeight
    htmlareaRef.value!.style.height = `${previewHeight}px`
  })
}

function animateRows(rows: number) {
  const textarea = textareaRef.value as HTMLTextAreaElement
  // 1. Lock current height so transition has a start point
  textarea.style.height = `${textarea.offsetHeight}px`

  // 2. Update rows attribute
  textarea.rows = rows

  // 3. Wait for Vue to apply new rows, then animate to calculated height
  nextTick(() => {
    const computedStyle = getComputedStyle(textarea)
    const lineHeight = parseFloat(computedStyle.lineHeight)
    const padding = parseFloat(computedStyle.paddingTop)
      + parseFloat(computedStyle.paddingBottom)

    textarea.style.height = `${rows * lineHeight + padding}px`
  })
}
// #endregion preview
onMounted(() => {
  textareaGrow(props.modelValue)
  if (props.preview) {
    nextTick(() => {
      handleCollapse()
    })
  }
})

function textareaGrow(value: string = props.modelValue) {
  const computedStyle = getComputedStyle(textareaRef.value)
  const padding = parseFloat(computedStyle.paddingTop) + parseFloat(computedStyle.paddingBottom)
  const lineHeight = parseFloat(computedStyle.lineHeight)

  // 1. Auto-resize textarea rows
  if (props.textareaMaxRows && props.textareaMaxRows > 1) {
    // Clear any height set by animateRows before measuring, otherwise scrollHeight
    // reflects the pinned pixel value instead of the natural content height
    textareaRef.value.style.height = ''
    // trigger reflow
    textareaRef.value.getBoundingClientRect()
    // Hide overflow to prevent scrollbar from reducing content width during measurement
    textareaRef.value.style.overflow = 'hidden'
    textareaRef.value.style.height = '0'
    const innerHeight = textareaRef.value.scrollHeight - padding
    textareaRef.value.style.height = ''
    textareaRef.value.style.overflow = ''

    lineCount.value = Math.round(innerHeight / lineHeight)
    const isOverflow = lineCount.value > props.textareaMaxRows
    if (isOverflow) {
      htmlareaRef.value!.style.overflowY = 'scroll'
      measureRef.value!.style.overflowY = 'scroll'
    } else {
      htmlareaRef.value!.style.overflowY = 'hidden'
      measureRef.value!.style.overflowY = 'hidden'
    }
    const newRows = clamp(lineCount.value, props.initialRows, props.textareaMaxRows)
    animateRows(newRows)
  }
  // 2. Compute lineExcessStartIndex via binary search
  if (props.maxLines && measureRef.value) {
    const measure = measureRef.value
    const maxScrollHeight
      = props.maxLines * lineHeight + padding
    measure.textContent = value
    if (measure.scrollHeight > maxScrollHeight + 1) {
      let lo = 0
      let hi = value.length
      while (lo < hi) {
        const mid = (lo + hi) >>> 1
        measure.textContent = value.slice(0, mid + 1)
        if (measure.scrollHeight <= maxScrollHeight + 1) {
          lo = mid + 1
        } else {
          hi = mid
        }
      }
      lineExcessStartIndex.value = lo
    } else {
      lineExcessStartIndex.value = null
    }
  }
}

let isSyncing = false
function syncScroll() {
  if (isSyncing) return
  isSyncing = true
  htmlareaRef.value!.scrollTop = textareaRef.value?.scrollTop
  htmlareaRef.value!.scrollLeft = textareaRef.value?.scrollLeft
  isSyncing = false
}
</script>

<template>
  <div
    class="tweetbox" :class="[
      {
        'has-exceeded-limit': limitStatus > 100,
      },
    ]"
  >
    <!-- textarea for preview -->
    <div
      v-if="preview"
      ref="previewRef"
      :style="{ '--line-clamp': initialRows }"
      class="tweetbox__preview line-clamp-(--line-clamp)"
      :class="[isFocused ? 'hidden' : '']"
    >
      {{ modelValue }}
    </div>
    <!-- textarea for focused -->
    <textarea
      ref="textareaRef"
      class="tweetbox__textarea"
      :class="[isFocused ? '' : 'opacity-0']"
      :value="modelValue" :rows="initialRows"
      v-bind="preview ? previewEvents : {}"
      @input="updateValue"
      @scroll="syncScroll"
    />
    <!-- htmlarea for displaying valueAllowed and valueExcess -->
    <div
      ref="htmlareaRef"
      class="tweetbox__htmlarea"
      aria-hidden="true"
    >
      <span>{{ valueAllowed }}</span>
      <span class="text-excess">{{ valueExcess }}</span>
      <br>
    </div>
    <!-- Hidden clone for scrollHeight / line counting -->
    <div
      ref="measureRef"
      class="tweetbox__measure"
      aria-hidden="true"
    />
    <div class="tweetbox__limit cursor-pointer">
      <span class="tweetbox__remainingCharacters">{{ lineCount }}/{{
        remainingCharacters
      }}</span>
      <svg
        class="tweetbox__counter" viewBox="0 0 33.83098862 33.83098862" height="20" width="20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          class="tweetbox__counterUnderlay" cx="16.91549431" cy="16.91549431" r="15.91549431" fill="none"
          stroke-width="2"
        />
        <circle
          class="tweetbox__counterProgress" :stroke-dasharray="`${limitStatus},100`" cx="16.91549431"
          cy="16.91549431" r="15.91549431" fill="none" stroke-width="4"
        />
      </svg>
    </div>
  </div>
</template>

<style>
.tweetbox {
  position: relative;
  border: 2px solid #99dde6;
  border-radius: 0.5rem;
  transition: height 200ms ease;
}

.tweetbox__htmlarea,
.tweetbox__textarea,
.tweetbox__measure,
.tweetbox__preview {
  padding: 1rem;
  /* padding-right: 3.75rem; */
  width: 100%;
  line-height: 1.25;
  scrollbar-gutter: stable;
}

.tweetbox__htmlarea {
  position: absolute;
  height: 100%;
  background-color: #fff;
  color: transparent;
  /* word breaks behave exactly like in a textarea */
  white-space: pre-wrap;
  word-wrap: break-word;
  top: 0;
  left: 0;
  background: transparent;
  mix-blend-mode: lighten;
  pointer-events: none;
  user-select: none;
  overflow: auto;
}

.tweetbox__preview {
  position: absolute;
  top: 0;
  left: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  padding-bottom: 0;
  pointer-events: none;
}

.tweetbox__measure {
  position: absolute;
  visibility: hidden;
  height: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
  top: 0;
  left: 0;
  pointer-events: none;
  overflow: hidden;
}

.tweetbox__textarea {
  display: block;
  position: relative;
  border-color: #99dde6;
  outline: 0;
  resize: none;
  transition: border-color 200ms ease, height 200ms ease;
}

.tweetbox__textarea:focus {
  border-color: #47c2d2;
}

.tweetbox .text-excess {
  /* background: #ffb8c2; */
  color: red;
  text-shadow: 0 0 2px red;
}

.tweetbox__limit {
  display: flex;
  position: absolute;
  right: 0.75rem;
  bottom: 0.75rem;
  align-items: center;
}

.tweetbox__remainingCharacters {
  margin-right: 0.5rem;
  color: #657786;
  font-size: 0.75rem;
}

.has-exceeded-limit .tweetbox__remainingCharacters {
  color: #e0245e;
}

.tweetbox__counter {
  overflow: visible;
  transform: rotate(-90deg);
  transform-origin: center;
}

.tweetbox__counterUnderlay {
  stroke: #ccd6dd;
}

.tweetbox__counterProgress {
  stroke: #1da1f2;
}

.has-exceeded-limit .tweetbox__counterProgress {
  stroke: #e0245e;
  animation: counterPulse 0.3s ease-in-out;
  animation-iteration-count: 1;
}

@keyframes counterPulse {
  0% {
    stroke-width: 4;
  }

  50% {
    stroke-width: 6;
  }

  100% {
    stroke-width: 4;
  }
}
</style>
