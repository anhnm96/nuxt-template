<script lang="ts" setup>
interface PropsType {
  maxChars?: number
  maxLines?: number
  modelValue: string
  initialRows?: number
  textareaMaxRows?: number
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
const textareaStyle = computed(() => {
  return getComputedStyle(textareaRef.value)
})
onMounted(() => {
  // It might be tempting to use a watcher instead of
  // triggering `textareaGrow()` in both, the `mounted()`
  // lifecycle hook and in the `updateValue()` method
  // but because watchers, which are set to run immediately,
  // are triggered before evaluating computed properties,
  // a watcher wouldn't work.
  textareaGrow()
})

function updateValue(e: Event) {
  const value = (e.target as HTMLInputElement).value
  emit(`update:modelValue`, value)
  textareaGrow(value)
}

function textareaGrow(value: string = props.modelValue) {
  const paddingTop = parseFloat(textareaStyle.value.getPropertyValue('padding-top'))
  const paddingBottom = parseFloat(textareaStyle.value.getPropertyValue('padding-bottom'))
  const lineHeight = parseFloat(textareaStyle.value.getPropertyValue('line-height'))

  // 1. Auto-resize textarea rows
  if (props.textareaMaxRows && props.textareaMaxRows > 1) {
    // Hide overflow to prevent scrollbar from reducing content width during measurement
    textareaRef.value.style.overflow = 'hidden'
    textareaRef.value.style.height = '0'
    const innerHeight = textareaRef.value.scrollHeight - paddingTop - paddingBottom
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
    textareaRef.value.rows = clamp(lineCount.value, props.initialRows, props.textareaMaxRows)
  }
  // 2. Compute lineExcessStartIndex via binary search
  if (props.maxLines && measureRef.value) {
    const measure = measureRef.value
    const maxScrollHeight
      = props.maxLines * lineHeight + paddingTop + paddingBottom
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
    <textarea
      ref="textareaRef" class="tweetbox__textarea" :value="modelValue" rows="1" @input="updateValue"
      @scroll="syncScroll"
    />
    <div ref="htmlareaRef" class="tweetbox__htmlarea" aria-hidden="true">
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
}

.tweetbox__htmlarea,
.tweetbox__textarea,
.tweetbox__measure {
  padding: 1rem;
  /* padding-right: 3.75rem; */
  width: 100%;
  line-height: 1.25;
  border: 2px solid transparent;
  border-radius: 0.5rem;
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
  transition: border-color 200ms ease;
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
