<script lang="ts">
import { clamp } from 'lodash-es'

/** `[number, number]` when `range` is set, a single `number` otherwise. */
export type SliderValue<R extends boolean = false> = R extends true ? [number, number] : number

export interface SliderProps<R extends boolean = false> {
  /**
   * Draws two Thumbs and narrows `v-model` to `[number, number]`.
   *
   * `R & boolean`, never a bare `R`: a naked type parameter compiles to `type: null`, so Vue
   * skips Boolean casting and `<Slider range>` arrives as `''` — falsy — silently behaving as
   * a single Slider. The intersection gives the compiler a concrete `boolean` to emit while
   * TypeScript still infers the literal. See ADR-0003, and `pages/playground/slider-types.vue`
   * for the narrowing probe.
   */
  range?: R & boolean
  min?: number
  max?: number
  /** The grid values snap to. `0` means continuous; the ends stay reachable either way. */
  step?: number
  /** The value the Fill grows from. Defaults to `min`. */
  origin?: number
  /** Whether a Thumb is drawn *at rest*. Focus reveals it regardless; see DESIGN.md. */
  thumb?: boolean
  /** What a press on the Track does. A press on a Thumb is always a relative drag. */
  trackPress?: 'jump' | 'ignore'
  disabled?: boolean
  label?: string
  /** Composed with `label` for each Thumb in range mode. Pass `$t()` output to translate. */
  rangeLabels?: [string, string]
  /** Produces `aria-valuetext`, so a reader announces "¥1,200" rather than "1200". */
  formatValue?: (value: number) => string
}
</script>

<script setup lang="ts" generic="R extends boolean = false">
const props = withDefaults(defineProps<SliderProps<R>>(), {
  min: 0,
  max: 100,
  step: 1,
  thumb: true,
  trackPress: 'jump',
  rangeLabels: () => ['minimum', 'maximum'],
})

/** Fires once when a gesture ends or a key commits. `update:modelValue` fires throughout. */
const emit = defineEmits<{ change: [value: SliderValue<R>] }>()

const model = defineModel<SliderValue<R>>()

/*
  `withDefaults` cannot type a generic prop's default, so `range`'s fallback is restated here.
  Losing this restatement makes `range` `undefined` at runtime. Same tax as Calendar's `mode`.
*/
const isRange = computed(() => props.range ?? false)

const trackEl = useTemplateRef<HTMLElement>('trackEl')
const thumbEls = useTemplateRef<HTMLElement[]>('thumbEls')

const origin = computed(() => clamp(props.origin ?? props.min, props.min, props.max))

// --- value arithmetic -------------------------------------------------------------------

/** Decimals a number carries, including the ones `1e-7` hides behind exponential notation. */
function decimalsOf(value: number) {
  if (!Number.isFinite(value)) return 0
  const text = String(value)
  const exponent = text.indexOf('e')
  if (exponent === -1) {
    const dot = text.indexOf('.')
    return dot === -1 ? 0 : text.length - dot - 1
  }
  const mantissa = text.slice(0, exponent)
  const dot = mantissa.indexOf('.')
  const mantissaDecimals = dot === -1 ? 0 : mantissa.length - dot - 1
  return Math.max(0, mantissaDecimals - Number(text.slice(exponent + 1)))
}

/**
 * Decimals to round a snapped value back to, undoing binary float drift
 * (0.1 * 3 = 0.30000000000000004).
 *
 * All three of `step`, `min` and `max` feed it, not `step` alone: the grid is *offset* by
 * `min` and the ends are grid candidates, so a value can legitimately carry more decimals
 * than the step does. Rounding to the step's decimals alone turned `max: 10.5` into 11 — a
 * value outside the Slider's own bounds.
 */
const precision = computed(() =>
  Math.max(decimalsOf(props.step), decimalsOf(props.min), decimalsOf(props.max)),
)

function snap(value: number) {
  const bounded = clamp(value, props.min, props.max)
  if (!props.step) return bounded
  const grid = props.min + Math.round((bounded - props.min) / props.step) * props.step
  // `min` and `max` join the grid as candidates, so both ends stay reachable when the step
  // does not divide the span evenly. Nearest wins; a tie keeps the grid value. See DESIGN.md.
  const nearest = [clamp(grid, props.min, props.max), props.min, props.max].reduce(
    (best, candidate) => Math.abs(candidate - bounded) < Math.abs(best - bounded) ? candidate : best,
  )
  // Clamped again after rounding: the cap at 10 decimals can still nudge a value with more
  // than that, and staying inside the bounds matters more than landing on the grid.
  return clamp(Number(nearest.toFixed(Math.min(precision.value, 10))), props.min, props.max)
}

/** A value as a percentage along the Track, ready for `left`. */
function percentOf(value: number) {
  const span = props.max - props.min
  if (span <= 0) return '0%'
  return `${((clamp(value, props.min, props.max) - props.min) / span) * 100}%`
}

function valueAt(clientX: number) {
  const rect = trackEl.value?.getBoundingClientRect()
  if (!rect?.width) return props.min
  return props.min + clamp((clientX - rect.left) / rect.width, 0, 1) * (props.max - props.min)
}

// --- Thumb positions --------------------------------------------------------------------

/** Raw Thumb positions in Thumb order, never sorted. May sit outside the Track; see ADR-0010. */
const positions = ref<number[]>([])

/** Positions pulled into the Track. Everything but the model reads these. */
const clamped = computed(() => positions.value.map(value => clamp(value, props.min, props.max)))

const dragging = ref<number | null>(null)
const focused = ref<number | null>(null)

/** The Driven Thumb. While one exists the model is not read back; see ADR-0010. */
const driven = computed(() => dragging.value ?? focused.value)

const modelValues = computed<number[]>(() => {
  const value = model.value
  if (isRange.value) {
    const pair = Array.isArray(value) ? value : []
    return [pair[0] ?? props.min, pair[1] ?? props.max]
  }
  return [typeof value === 'number' ? value : props.min]
})

/** Thumb indices from the smallest position to the largest. */
function orderOf(values: number[]) {
  return values.map((_, index) => index).sort((a, b) => values[a]! - values[b]!)
}

/**
 * Maps the sorted model back onto Thumbs by current order, not by index. Without this a
 * crossed pair reconciles into a swap and the Thumbs teleport through each other.
 */
function assignByOrder(values: number[], current: number[]) {
  if (values.length !== current.length) return [...values]
  const next: number[] = []
  orderOf(current).forEach((thumb, rank) => {
    next[thumb] = values[rank]!
  })
  return next
}

watch(
  [modelValues, driven],
  () => {
    if (driven.value !== null) return
    positions.value = assignByOrder(modelValues.value, positions.value)
  },
  { immediate: true },
)

/** Each Thumb's rank by value. Drives the labels, so they follow order rather than identity. */
const ranks = computed(() => {
  const result: number[] = []
  orderOf(clamped.value).forEach((thumb, rank) => {
    result[thumb] = rank
  })
  return result
})

/** Thumb positions in value order. The model is this; `change` compares against it. */
function sorted() {
  return [...positions.value].sort((a, b) => a - b)
}

function sortedValue() {
  const values = sorted()
  return (isRange.value ? values : values[0]) as SliderValue<R>
}

function syncModel() {
  const next = sortedValue()
  const current = model.value
  if (Array.isArray(next) && Array.isArray(current)) {
    if (next[0] === current[0] && next[1] === current[1]) return
  } else if (next === current) {
    return
  }
  model.value = next
}

function setThumb(index: number, value: number) {
  const next = [...positions.value]
  next[index] = snap(value)
  positions.value = next
  syncModel()
}

/**
 * Emits `change` only when the gesture actually moved something, matching native's
 * `input`/`change` pair. Without the comparison a key press held at `max`, or a tap that
 * lands on the current value, fires `change` repeatedly with the value it already had — and
 * `change` exists precisely so an expensive consumer can do real work on each one.
 */
function commit(before: number[]) {
  const after = sorted()
  if (before.length === after.length && before.every((value, i) => value === after[i])) return
  emit('change', sortedValue())
}

// --- pointer ----------------------------------------------------------------------------

let dragKind: 'absolute' | 'relative' = 'absolute'
let dragFromX = 0
let dragFromValue = 0
/** The value the gesture started from, so `change` can tell whether anything moved. */
let dragFromSorted: number[] = []

const drag = usePointerDrag({
  onMove(event) {
    const index = dragging.value
    if (index === null || props.disabled) return
    if (dragKind === 'absolute') {
      setThumb(index, valueAt(event.clientX))
      return
    }
    const width = trackEl.value?.getBoundingClientRect().width ?? 0
    const delta = width ? ((event.clientX - dragFromX) / width) * (props.max - props.min) : 0
    setThumb(index, dragFromValue + delta)
  },
  onEnd() {
    dragging.value = null
    commit(dragFromSorted)
  },
})

/*
  A Slider disabled mid-gesture stops tracking at once. `drag.stop()` does not run `onEnd`, so
  the Driven Thumb is cleared by hand — leaving it set would freeze reconciliation and the
  Slider would never read its model again.
*/
watch(() => props.disabled, (disabled) => {
  if (!disabled) return
  drag.stop()
  dragging.value = null
})

/** Ties go to the first Thumb. Harmless because Thumbs may cross; see ADR-0010. */
function nearestThumb(value: number) {
  if (!isRange.value) return 0
  const [first, second] = clamped.value
  return Math.abs(first! - value) <= Math.abs(second! - value) ? 0 : 1
}

function focusThumb(index: number) {
  // `focusVisible: false` matters twice here: Chromium forces `:focus-visible` on a
  // script-driven focus (the trap Radio.vue documents), and a revealed-on-focus Thumb would
  // then appear under a plain mouse press, which is what `thumb: false` rules out.
  thumbEls.value?.[index]?.focus({ focusVisible: false })
}

function onPointerDown(event: PointerEvent) {
  /*
    Only the primary pointer drives the Slider. A second finger landing mid-drag would
    otherwise reassign the Driven Thumb and the drag origin under the first one, which then
    carried on dragging the Thumb it never touched.

    `isPrimary` rather than "is a drag already running": a drag whose `pointerup` never
    arrived — the window loses focus mid-press — leaves that state set with no way to clear
    it, and rejecting on it would wedge the Slider against the pointer for good.
  */
  if (props.disabled || event.button !== 0 || !event.isPrimary) return
  const thumb = (event.target as HTMLElement).closest<HTMLElement>('[data-slot="slider-thumb"]')
  const pressed = valueAt(event.clientX)
  const index = thumb ? Number(thumb.dataset.index) : nearestThumb(pressed)

  // A primary press while a gesture is still registered means that gesture is stale, since a
  // primary pointer cannot press twice without releasing. Release it, or `drag.start()` below
  // is a no-op and the new press would jump without ever tracking.
  if (dragging.value !== null) drag.stop()

  dragging.value = index
  dragFromX = event.clientX
  dragFromValue = clamped.value[index]!
  dragFromSorted = sorted()

  // Grabbing a Thumb keeps the grab offset, so it never lurches under the cursor.
  if (!thumb && props.trackPress === 'jump') {
    dragKind = 'absolute'
    setThumb(index, pressed)
  } else {
    dragKind = 'relative'
  }

  focusThumb(index)
  drag.start(event)
  event.preventDefault()
}

// --- keyboard ---------------------------------------------------------------------------

/** Ten presses cross any range, whatever the units. */
const largeStep = computed(() => Math.max((props.max - props.min) / 10, props.step || 1))

function onKeydown(event: KeyboardEvent, index: number) {
  if (props.disabled) return
  const current = clamped.value[index]!
  const nudge = props.step || 1
  const next: number | undefined = {
    ArrowRight: current + nudge,
    ArrowUp: current + nudge,
    ArrowLeft: current - nudge,
    ArrowDown: current - nudge,
    PageUp: current + largeStep.value,
    PageDown: current - largeStep.value,
    Home: props.min,
    End: props.max,
  }[event.key]
  if (next === undefined) return
  event.preventDefault()
  const before = sorted()
  setThumb(index, next)
  commit(before)
}

// --- presentation -----------------------------------------------------------------------

const fillStyle = computed(() => {
  const [first, second] = clamped.value
  const from = isRange.value ? Math.min(first!, second!) : Math.min(origin.value, first!)
  const to = isRange.value ? Math.max(first!, second!) : Math.max(origin.value, first!)
  return { left: percentOf(from), right: `calc(100% - ${percentOf(to)})` }
})

/** The model holds a value the Track cannot show. Never corrected; see ADR-0007's reasoning. */
const outOfRange = computed(() =>
  modelValues.value.some(value => value < props.min || value > props.max),
)

function labelFor(index: number) {
  if (!isRange.value) return props.label
  const position = props.rangeLabels[ranks.value[index]!]
  return props.label ? `${props.label} ${position}` : position
}
</script>

<template>
  <div
    class="slider"
    data-slot="slider"
    :data-disabled="disabled || undefined"
    :data-dragging="dragging !== null || undefined"
    :data-out-of-range="outOfRange || undefined"
    @pointerdown="onPointerDown"
    @dragstart.capture.stop.prevent
  >
    <!-- track -->
    <div ref="trackEl" class="slider-track" data-slot="slider-track">
      <div class="slider-fill" data-slot="slider-fill" :style="fillStyle" />
    </div>

    <!-- thumbs -->
    <div
      v-for="(value, index) in clamped"
      :key="index"
      ref="thumbEls"
      class="slider-thumb"
      data-slot="slider-thumb"
      :data-index="index"
      :data-hidden="!thumb || undefined"
      role="slider"
      aria-orientation="horizontal"
      :tabindex="disabled ? undefined : 0"
      :aria-disabled="disabled || undefined"
      :aria-label="labelFor(index)"
      :aria-valuemin="min"
      :aria-valuemax="max"
      :aria-valuenow="value"
      :aria-valuetext="formatValue?.(value)"
      :style="{ left: percentOf(value) }"
      @focus="focused = index"
      @blur="focused = null"
      @keydown="onKeydown($event, index)"
    />

    <slot :values="clamped" :percent-of="percentOf" :disabled="disabled" />
  </div>
</template>

<style scoped>
@reference "#main.css";

/*
  One token drives the geometry: the Track's thickness sets the Thumb's size, so a chunky
  iOS-style bar does not leave a dot swimming in it. Override `--slider-thumb-size` to break
  the ratio, exactly as `--calendar-font-size` breaks Calendar's.
*/
.slider {
  --slider-track-height: 0.75rem;
  --slider-track-color: color-mix(in oklab, var(--color-surface-inverted) 20%, transparent);
  --slider-fill-color: var(--color-surface-inverted);
  --slider-thumb-size: calc(var(--slider-track-height) * 1.5);

  position: relative;
  min-height: max(var(--slider-track-height), var(--slider-thumb-size));

  @apply flex w-full cursor-pointer touch-none items-center select-none;

  &[data-disabled] {
    @apply cursor-default opacity-60;
  }
}

/*
  The clip lives here rather than on the root: it rounds the Fill's corners, and anything a
  consumer renders in the default slot sits outside it so tick labels are not cut off.
*/
.slider-track {
  width: 100%;
  height: var(--slider-track-height);
  background: var(--slider-track-color);

  @apply relative overflow-hidden rounded-full;
}

.slider-fill {
  background: var(--slider-fill-color);

  @apply absolute inset-y-0;
}

.slider-thumb {
  width: var(--slider-thumb-size);
  height: var(--slider-thumb-size);
  background: var(--slider-fill-color);
  translate: -50% -50%;

  @apply absolute top-1/2 rounded-full outline-none;
}

/*
  `thumb: false` means "not drawn at rest", not "not there". The element keeps `role="slider"`
  and its Tab stop; `pointer-events: none` hands every press to the Track, which is what makes
  the iOS feel work. Keyboard focus draws it anyway — a focused control with no visible
  indicator fails WCAG 2.4.7, and in range mode a ring on the Track cannot say which Thumb.
*/
.slider-thumb[data-hidden] {
  @apply pointer-events-none opacity-0;
}

.slider-thumb[data-hidden]:focus-visible {
  @apply pointer-events-auto opacity-100;
}

/*
  Drawn on a pseudo-element for the reason CalendarCell.vue records: Tailwind's alpha modifier
  resolves to white against a `light-dark()` colour, because `color-mix` cannot take one apart.
*/
.slider-thumb:focus-visible::after {
  content: '';
  border: 2px solid var(--color-primary);
  border-radius: inherit;
  box-shadow: 0 0 6px 1px var(--color-primary);
  opacity: 0.6;

  @apply pointer-events-none absolute -inset-[3px];
}
</style>
