<script lang="ts">
import { clamp } from 'lodash-es'

export interface ProgressBarProps {
  /**
   * How far the task has got, from 0 to `max`.
   *
   * Omit it for an Indeterminate bar: the task runs and nothing knows how far it has got.
   * There is no `indeterminate` prop, so the contradictory state cannot be expressed. See
   * ADR-0011.
   */
  value?: number
  /** The Progress at complete. Defaults to 100, so a percentage needs nothing else. */
  max?: number
  /** Draws the Readout inside the Fill. Raises the Track to fit a line of text. */
  showReadout?: boolean
  /**
   * Produces `aria-valuetext`, so a reader announces "4 of 10 files" rather than "40 percent".
   * It receives the clamped value, which is why it exists rather than a plain `aria-valuetext`
   * on the call site: the two would otherwise disagree whenever a value is out of range.
   */
  formatValue?: (value: number, max: number) => string
}
</script>

<script setup lang="ts">
const props = withDefaults(defineProps<ProgressBarProps>(), {
  max: 100,
})

defineSlots<{
  /** The Readout's content. Rendered only when `showReadout` is set. */
  default?: (props: { value: number, max: number, percent: number }) => unknown
}>()

const attrs = useAttrs()

const indeterminate = computed(() => props.value === undefined || props.value === null)

/*
  A `max` of 0 or NaN would divide the Fill's width by zero. It is treated as broken rather
  than replaced with a default: native `<progress>` silently falls back to 1, which is how a
  wrong `max` reaches production looking correct.
*/
const validMax = computed(() => Number.isFinite(props.max) && props.max > 0)

const outOfRange = computed(() => {
  if (indeterminate.value) return false
  if (!validMax.value) return true
  return !Number.isFinite(props.value!) || props.value! < 0 || props.value! > props.max
})

/** The drawn value. Clamped, because a Fill cannot be 150% wide and ARIA forbids the claim. */
const progress = computed(() => {
  if (indeterminate.value || !validMax.value || !Number.isFinite(props.value!)) return 0
  return clamp(props.value!, 0, props.max)
})

const percent = computed(() => validMax.value ? (progress.value / props.max) * 100 : 0)

/*
  `import.meta.dev` is false under vitest and `import.meta.env.DEV` is the true one, so both
  are tested. Both are compile-time literals, so a production build still drops the block.
*/
if (import.meta.dev || import.meta.env.DEV) {
  /*
    Once per kind of fault, not once per instance. A value arrives per upload chunk, so a
    warning per chunk is noise; but a `max` that breaks after a bad value has its own message,
    and a single latch would leave the console describing a problem that was already fixed.
  */
  const warned = new Set<string>()

  watchEffect(() => {
    if (!outOfRange.value) return

    const fault = validMax.value ? 'value' : 'max'
    if (warned.has(fault)) return
    warned.add(fault)

    if (fault === 'max') {
      console.warn(`[ProgressBar] \`max\` must be a finite number above 0, received ${props.max}. The Progress is drawn as 0.`)
    } else {
      console.warn(`[ProgressBar] \`value\` ${props.value} is outside 0..${props.max}. It is clamped for the Fill and for \`aria-valuenow\`.`)
    }
  })

  /*
    There is no `label` prop — `role="progressbar"` sits on the root, so the attribute falls
    through. Nothing then prompts anyone to supply a name, and an unnamed progress bar is
    announced as a bare "busy".
  */
  // An empty `aria-label` is ignored by a reader, so it is not a name either.
  const supplied = (attribute: unknown) => attribute !== undefined && attribute !== null && String(attribute).trim() !== ''

  onMounted(() => {
    if (!supplied(attrs['aria-label']) && !supplied(attrs['aria-labelledby'])) {
      console.warn('[ProgressBar] No accessible name. Pass `aria-label` or `aria-labelledby`.')
    }
  })
}
</script>

<template>
  <div
    class="progress"
    data-slot="progress"
    role="progressbar"
    :data-indeterminate="indeterminate || undefined"
    :data-out-of-range="outOfRange || undefined"
    :aria-valuemin="0"
    :aria-valuemax="validMax ? max : undefined"
    :aria-valuenow="indeterminate ? undefined : progress"
    :aria-valuetext="indeterminate ? undefined : formatValue?.(progress, max)"
  >
    <!-- track -->
    <div
      class="progress-track"
      data-slot="progress-track"
      :data-readout="showReadout || undefined"
    >
      <div
        class="progress-fill"
        data-slot="progress-fill"
        :style="indeterminate ? undefined : { inlineSize: `${percent}%` }"
      >
        <!-- readout; drawn inside the Fill, so it is clipped until the Fill is wide enough -->
        <span
          v-if="showReadout && !indeterminate"
          class="progress-readout"
          data-slot="progress-readout"
        >
          <slot :value="progress" :max="max" :percent="percent">{{ Math.round(percent) }}%</slot>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "#main.css";

.progress {
  --progress-track-height: 0.5rem;
  --progress-track-color: color-mix(in oklab, var(--color-surface-inverted) 20%, transparent);
  --progress-fill-color: var(--color-primary);
  --progress-readout-color: var(--color-surface);

  @apply relative flex w-full items-center;
}

.progress-track {
  width: 100%;
  height: var(--progress-track-height);
  background: var(--progress-track-color);

  @apply relative overflow-hidden rounded-full;
}

/*
  A Readout needs a line of text to fit, and the Track is 8px by default. The floor raises the
  Track instead of clipping the text away, so `show-readout` on a thin bar is wrong in a way
  that shows on screen. It is set by the prop, not by the Readout, so the bar does not change
  height when the value goes away.
*/
.progress-track[data-readout] {
  min-height: 1lh;
}

.progress-fill {
  background: var(--progress-fill-color);
  transition: inline-size 150ms ease-out;

  @apply absolute inset-y-0 inset-s-0 flex items-center justify-end rounded-full;
}

.progress-readout {
  color: var(--progress-readout-color);

  @apply px-2 text-xs leading-none font-medium whitespace-nowrap;
}

/*
  A segment that crosses the Track, rather than a full-width Fill that pulses or stripes: the
  full-width versions are indistinguishable from a finished task, which is the one misreading
  that matters when the task has not started.
*/
.progress[data-indeterminate] .progress-fill {
  inline-size: 30%;
  transition: none;
  animation: progress-slide 1.4s ease-in-out infinite;
}

@keyframes progress-slide {
  from {
    translate: -100%;
  }

  to {
    translate: 333.34%;
  }
}

/*
  The house answer to this query is `transition: none`, and it does not transfer: an
  indeterminate bar with its animation removed is a motionless stripe that says nothing, which
  is the component's whole job gone. The vestibular trigger is the translation, so the segment
  stops travelling and pulses in place. It stays at partial width, so it still cannot be read
  as finished.
*/
@media (prefers-reduced-motion: reduce) {
  .progress-fill {
    transition: none;
  }

  .progress[data-indeterminate] .progress-fill {
    translate: none;
    animation: progress-pulse 1.6s ease-in-out infinite;
  }
}

@keyframes progress-pulse {
  0%,
  100% {
    opacity: 0.35;
  }

  50% {
    opacity: 1;
  }
}
</style>
