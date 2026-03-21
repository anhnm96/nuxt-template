<script lang="ts" setup>
import { clamp, throttle } from 'lodash-es'

const props = withDefaults(
  defineProps<{
    modelValue?: number
    min?: number
    max?: number
    step?: number
    /**
     * `absolute`: jumps to cursor position on press, tracks cursor on drag.
     * `relative`: iOS-style, drags from current value without jumping.
     */
    mode?: 'absolute' | 'relative'
    /** When true, track expands in height and width on hover/drag. */
    expandOnHover?: boolean
    idleHeight?: number
    trackHeight?: number
    padding?: number
  }>(),
  {
    modelValue: 0,
    min: 0,
    max: 100,
    step: 1,
    mode: 'absolute',
    idleHeight: 4,
    trackHeight: 12,
    padding: 12,
  },
)

const transition = { type: 'spring', bounce: 0, duration: 0.3 }
const progress = defineModel<number>({
  default: 0,
})
const range = computed(() => props.max - props.min)

function snap(value: number) {
  if (!props.step) return value
  return Math.round((value - props.min) / props.step) * props.step + props.min
}

const width = computed(() => `${((progress.value - props.min) / range.value) * 100}%`)

const hovered = ref(false)
const panning = ref(false)
const state = computed(() =>
  panning.value ? 'panning' : hovered.value ? 'hovered' : 'idle',
)
const full = { width: 'calc(100% - 48px)' }
const widthVariants = computed(() => ({
  idle: props.expandOnHover ? { width: 'calc(95% - 48px)' } : full,
  hovered: full,
  panning: full,
}))

const trackElement = ref<HTMLElement>()
const dragStartX = ref(0)
const dragStartProgress = ref(0)

function getTrackRect() {
  return trackElement.value!.getBoundingClientRect()
}

function setAbsolute(e: MouseEvent) {
  const { left, width } = getTrackRect()
  const ratio = clamp((e.clientX - left) / width, 0, 1)
  progress.value = snap(ratio * range.value + props.min)
}

function setRelative(e: MouseEvent) {
  const { width } = getTrackRect()
  const deltaRatio = (e.clientX - dragStartX.value) / width
  progress.value = snap(clamp(
    dragStartProgress.value + deltaRatio * range.value,
    props.min,
    props.max,
  ))
}

const pointermove = throttle((e: PointerEvent) => {
  if (props.mode === 'absolute') setAbsolute(e)
  else setRelative(e)
}, 10)

function pointerdown(e: PointerEvent) {
  dragStartX.value = e.clientX
  dragStartProgress.value = progress.value
  if (props.mode === 'absolute') setAbsolute(e)
  panning.value = true
  window.addEventListener('pointermove', pointermove)
  window.addEventListener('pointerup', pointerup)
}

function pointerup() {
  panning.value = false
  window.removeEventListener('pointermove', pointermove)
  window.removeEventListener('pointerup', pointerup)
}

const fullHeight = computed(() => ({ height: `${props.trackHeight}px` }))
const heightVariants = computed(() => ({
  idle: props.expandOnHover ? { height: `${props.idleHeight}px` } : fullHeight.value,
  hovered: fullHeight.value,
  panning: fullHeight.value,
}))
</script>

<template>
  <div>
    <slot name="left" :hovered="hovered" :panning="panning" />
    <Motion
      :animate="widthVariants[state]"
      :transition="transition"
      :style="{
        height: `${trackHeight + padding}px`,
      }"
      class="relative flex grow-0 touch-none items-center justify-center"
      :initial="false"
      @pointerenter="hovered = true"
      @pointerleave="hovered = false"
      @pointerdown="pointerdown"
      @dragstart.capture.stop.prevent
    >
      <Motion
        :initial="false"
        :animate="heightVariants[state]"
        :transition="transition"
        class="relative w-full cursor-pointer overflow-hidden rounded-full"
      >
        <div ref="trackElement" class="h-full w-full bg-surface-inverted/20 select-none" />
        <div class="absolute inset-0 bg-surface-inverted select-none" :style="{ width }" />
      </Motion>
    </Motion>
    <slot name="right" :hovered="hovered" :panning="panning" />
  </div>
</template>
