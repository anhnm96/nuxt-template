<script setup lang="ts">
import { InputText } from 'primevue'
import ColorPreview from './ColorPreview.vue'

interface Props {
  disabled?: boolean
  shouldAllowShortHexCode?: boolean
  modelValue?: string
  pt?: {
    confirmLabel?: string
    cancelLabel?: string
  }
}

const props = defineProps<Props>()
const emits = defineEmits<{
  'update:modelValue': [v?: string]
  'close': []
}>()

const pressedDebounceTime = 0
const saturationRef = ref<HTMLElement | null>(null)
const hueRef = ref<HTMLElement | null>(null)

const {
  elementX: saturationX,
  elementY: saturationY,
  elementWidth: saturationWidth,
  elementHeight: saturationHeight,
} = useMouseInElement(saturationRef)
const { pressed: saturationPressed } = useMousePressed({ target: saturationRef })
const saturationDebouncePressed = ref(false)
const saturationDebouncePressedTimeout = ref()
const saturationHandleTop = ref(0)
const saturationHandleLeft = ref(0)

const {
  elementY: hueY,
  elementHeight: hueHeight,
} = useMouseInElement(hueRef)
const { pressed: huePressed } = useMousePressed({ target: hueRef })
const hueDebouncePressed = ref(false)
const hueDebouncePressedTimeout = ref()
const hueHandleTop = ref(0)

const hexColor = ref<string>()
const hexColorInputValue = ref<string>()

// RGB values
const red = ref<string>()
const green = ref<string>()
const blue = ref<string>()

const hsv = computed(() => {
  return {
    h: 360 - (hueHandleTop.value * 360 / 100),
    s: saturationHandleLeft.value / 100,
    v: 1 - (saturationHandleTop.value / 100),
  }
})

const saturationContainerStyle = computed(() => ({
  backgroundColor: hsvToHex(hsv.value?.h ?? 0, 1, 1),
}))

const saturationHandleStyle = computed(() => ({
  top: `${saturationHandleTop.value}%`,
  left: `${saturationHandleLeft.value}%`,
}))

const hueHandleStyle = computed(() => ({
  top: `${hueHandleTop.value}%`,
}))

// debounce saturation pressed
watchEffect(() => {
  if (saturationDebouncePressedTimeout.value) {
    clearTimeout(saturationDebouncePressedTimeout.value)
  }

  if (saturationPressed.value) {
    saturationDebouncePressed.value = true

    return
  }

  saturationDebouncePressedTimeout.value = setTimeout(() => {
    saturationDebouncePressed.value = false
  }, pressedDebounceTime)
})

// debounce hue pressed
watchEffect(() => {
  if (hueDebouncePressedTimeout.value) {
    clearTimeout(hueDebouncePressedTimeout.value)
  }

  if (huePressed.value) {
    hueDebouncePressed.value = true

    return
  }

  hueDebouncePressedTimeout.value = setTimeout(() => {
    hueDebouncePressed.value = false
  }, pressedDebounceTime)
})

// handle drag saturation
watchEffect(() => {
  if (!(
    !props.disabled
    && saturationPressed.value
    && typeof saturationX.value === 'number'
    && typeof saturationWidth.value === 'number'
    && saturationWidth.value > 0
    && typeof saturationHeight.value === 'number'
    && saturationHeight.value > 0
  )) {
    return
  }

  const left = Math.min(Math.max(0, saturationX.value), saturationWidth.value)
  const top = Math.min(Math.max(0, saturationY.value), saturationHeight.value)

  saturationHandleLeft.value = left * 100 / saturationWidth.value
  saturationHandleTop.value = top * 100 / saturationHeight.value

  triggerChangeColor()
})

// handle drag hue
watchEffect(() => {
  if (!(
    !props.disabled
    && huePressed.value
    && typeof hueY.value === 'number'
    && typeof hueHeight.value === 'number'
    && hueHeight.value > 0
  )) {
    return
  }

  const top = Math.min(Math.max(0, hueY.value), hueHeight.value)

  hueHandleTop.value = top * 100 / hueHeight.value

  triggerChangeColor()
})

// set color from modelValue
watch(hexColor, () => {
  if (saturationDebouncePressed.value || hueDebouncePressed.value) {
    return
  }

  if (!hexColor.value) {
    hueHandleTop.value = 0
    saturationHandleTop.value = 0
    saturationHandleLeft.value = 0

    return
  }

  const hsv = hexToHsv(hexColor.value)

  if (!hsv) {
    return
  }

  hueHandleTop.value = (360 - hsv.h) * 100 / 360
  saturationHandleTop.value = (1 - hsv.v) * 100
  saturationHandleLeft.value = hsv.s * 100
})

function triggerChangeColor() {
  const rgb = hsvToRgb(hsv.value.h, hsv.value.s, hsv.value.v)

  updateHexColor(rgbToHex(rgb.r, rgb.g, rgb.b))
  updateRGB(rgb)
}

function updateRGB(rgb?: { r: number, g: number, b: number }) {
  if (!rgb) {
    red.value = undefined
    green.value = undefined
    blue.value = undefined

    return
  }

  red.value = rgb.r.toString()
  green.value = rgb.g.toString()
  blue.value = rgb.b.toString()
}

function updateHexColor(hex?: string) {
  if (!hex) return
  hexColor.value = hex
  hexColorInputValue.value = hex
}

function handleInputRGB(event: any, type: string) {
  if (props.disabled) {
    return
  }

  let rgbElement

  switch (type) {
    case 'red':
      rgbElement = red
      break
    case 'green':
      rgbElement = green
      break
    case 'blue':
      rgbElement = blue
      break
    default:
      return
  }

  rgbElement.value = filterInputValue(event, (value: string) => {
    const filteredValue = filterNumberOnly(value)

    if (!filteredValue) {
      return ''
    }

    const filteredValueNum = Number(filteredValue)

    if (event.inputType === 'insertCompositionText' && rgbElement.value?.length === 3) {
      return rgbElement.value
    }

    if (filteredValueNum > 255) {
      return '255'
    }

    return filteredValue
  }) || undefined

  if (!red.value || !green.value || !blue.value) {
    updateHexColor()

    return
  }

  updateHexColor(rgbToHex(Number(red.value), Number(green.value), Number(blue.value)))
}

function handleApplyColor() {
  if (props.disabled) {
    return
  }

  emits('update:modelValue', hexColor.value)
  emits('close')
}

function handleCancelColor() {
  emits('close')
}

async function handleInputHexColor(event: Event) {
  if (props.disabled) {
    return
  }

  await sleep(0)

  let color = filterInputValue(event, filterHexColorOnly)

  if (!(color.length > 0)) {
    color = '#'
  }

  hexColorInputValue.value = color

  if (!hexColorInputValue.value || !isValidColorHexCode(hexColorInputValue.value, props.shouldAllowShortHexCode)) {
    hexColor.value = undefined
    updateRGB()

    return
  }

  hexColor.value = hexColorInputValue.value
  updateRGB(hexToRgb(hexColor.value!))
}
function handleInputHexColor2(event: Event) {
  if (props.disabled) {
    return
  }

  hexColorInputValue.value = filterInputValue(event, filterHexColorOnly)

  if (!hexColorInputValue.value || !isValidColorHexCode(hexColorInputValue.value, props.shouldAllowShortHexCode)) {
    hexColor.value = undefined
    updateRGB()

    return
  }

  hexColor.value = hexColorInputValue.value
  updateRGB(hexToRgb(hexColor.value!))
}

function init() {
  if (!props.modelValue) {
    return
  }

  if (!isValidColorHexCode(props.modelValue, props.shouldAllowShortHexCode)) {
    return
  }

  updateHexColor(props.modelValue)
  updateRGB(hexToRgb(hexColor.value!))
}

onMounted(init)
</script>

<template>
  <div class="box-content flex w-75 flex-wrap gap-2 rounded-sm border border-elevated bg-white p-2 select-none">
    <!-- saturation -->
    <div class="size-32 text-inherit" :style="saturationContainerStyle">
      <!-- gradient wrapper - background: linear-gradient(to top, #000 0%, rgb(0 0 0 / 0) 100%), linear-gradient(to right, #fff 0%, rgb(255 255 255 / 0) 100%) -->
      <div
        ref="saturationRef"
        class="relative h-full w-full bg-gradient-to-r from-white to-transparent text-inherit before:absolute before:h-full before:w-full before:bg-gradient-to-t before:from-black before:to-transparent before:content-['']"
        :class="{ 'cursor-pointer': !disabled }"
      >
        <!-- handle -->
        <div class="pointer-events-none absolute h-1/20 w-1/20 -translate-1/2 rounded-full border border-solid border-white/80 text-inherit shadow-[0_0_0.5em_0.01em_rgba(0,0,0,.4)]" :style="saturationHandleStyle" />
      </div>
    </div>
    <!-- hue - background: linear-gradient(0deg, #f00 0, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00) -->
    <div
      ref="hueRef"
      class="relative flex h-32 w-4 flex-col text-inherit"
      :class="{ 'cursor-pointer': !disabled }"
    >
      <div class="w-full flex-1 bg-gradient-to-b from-[#f00] to-[#f0f]" />
      <div class="w-full flex-1 bg-gradient-to-b from-[#f0f] to-[#00f]" />
      <div class="w-full flex-1 bg-gradient-to-b from-[#00f] to-[#0ff]" />
      <div class="w-full flex-1 bg-gradient-to-b from-[#0ff] to-[#0f0]" />
      <div class="w-full flex-1 bg-gradient-to-b from-[#0f0] to-[#ff0]" />
      <div class="w-full flex-1 bg-gradient-to-b from-[#ff0] to-[#f00]" />
      <!-- handle -->
      <div class="pointer-events-none absolute left-0 -ml-1 h-1/20 w-14/10 -translate-y-1/2 border border-solid border-white/80 shadow-[0_0_0.5em_0.01em_rgba(0,0,0,.4)]" :style="hueHandleStyle" />
    </div>

    <div class="flex w-20 flex-1 flex-col gap-y-2 text-xs">
      <ColorPreview
        class="flex-1 rounded-sm shadow-[0_0.1rem_1.2rem_rgba(0,0,0,0.1)]"
        :color="hexColor"
      />
      <div class="flex items-center justify-between gap-1">
        <span>RGB:</span>
        <input
          type="text"
          :value="red"
          max-length="3"
          class="inputtext p-1 text-center"
          :disabled="disabled"
          @input="handleInputRGB($event, 'red')"
          @keydown.enter="handleApplyColor"
        >
        <input
          type="text"
          :value="green"
          max-length="3"
          :disabled="disabled"
          class="inputtext p-1 text-center "
          @input="handleInputRGB($event, 'green')"
          @keydown.enter="handleApplyColor"
        >
        <input
          type="text"
          :value="blue"
          max-length="3"
          :disabled="disabled"
          class="inputtext p-1 text-center"
          @input="handleInputRGB($event, 'blue')"
          @keydown.enter="handleApplyColor"
        >
      </div>
      <!-- Hex color -->
      <div v-if="false" class="flex items-center justify-between gap-1">
        <span>HEX:</span>
        <InputText
          class="w-full"
          fluid
          maxlength="7"
          size="small"
          :model-value="hexColorInputValue"
          :disabled="disabled"
          @input="checkComposingMaxLength($event, handleInputHexColor2)"
          @keydown.enter="handleApplyColor"
        />
      </div>
      <div class="flex items-center justify-between gap-1 text-xs">
        <span>HEX:</span>
        <MaskedInput
          class="inputtext w-full p-1 !text-xs"
          fluid
          maxlength="7"
          size="small"
          placeholder="#"
          :mask-options="{
            mask: '#x',
            blocks: {
              x: {
                mask: /^[0-9a-f]{0,6}$/i,
              },
            },
            lazy: true,
          }"
          :model-value="hexColorInputValue"
          :disabled="disabled"
          @input="checkComposingMaxLength($event, handleInputHexColor)"
          @keydown.enter="handleApplyColor"
        />
      </div>
    </div>

    <!-- actions -->
    <div class="basis-full">
      <div class="flex gap-2">
        <button
          class="btn btn-outline p-1.5 text-xs"
          @click="handleCancelColor"
        >
          Cancel
        </button>
        <button
          class="btn btn-primary p-1.5 text-xs"
          :disabled="disabled"
          @click="handleApplyColor"
        >
          Confirm
        </button>
      </div>
    </div>
  </div>
</template>
