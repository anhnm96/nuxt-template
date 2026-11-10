<script setup lang="ts">
import type { TocItem } from '~/utils/docsToc'

const props = defineProps<{ items: TocItem[] }>()

// A heading is "passed" once its top reaches this offset from the viewport top. It matches the
// `scroll-margin-top` of the headings, so a click on an entry makes that entry current.
const OFFSET = 112

/** The heading the reader is in, as an index into `items`. */
const currentIndex = ref(0)
/** The headings whose sections are on screen, as indices into `items`. The indicator spans them. */
const range = ref<{ from: number, to: number }>({ from: 0, to: 0 })
const indicator = reactive({ y: 0, height: 0, shown: false, animate: false })

const itemEls: (HTMLElement | null)[] = []
function setItemEl(el: unknown, index: number) {
  itemEls[index] = el as HTMLElement | null
}

function measure() {
  const count = props.items.length
  if (!count) return

  const tops = props.items.map(item => document.getElementById(item.id)?.getBoundingClientRect().top ?? Infinity)
  const endOfDocument = document.documentElement.scrollHeight - window.scrollY

  let current = 0
  let from = -1
  let to = -1
  for (let i = 0; i < count; i++) {
    if (tops[i]! <= OFFSET) current = i
    // A section runs from its heading to the next one, and the last runs to the end of the page.
    const bottom = i + 1 < count ? tops[i + 1]! : endOfDocument
    if (tops[i]! < window.innerHeight && bottom > OFFSET) {
      if (from === -1) from = i
      to = i
    }
  }

  // The last heading may never reach the offset when the page ends below it.
  const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
  if (atBottom) current = count - 1

  currentIndex.value = current
  range.value = from === -1 ? { from: current, to: current } : { from, to }
  placeIndicator()
}

function placeIndicator() {
  const first = itemEls[range.value.from]
  const last = itemEls[range.value.to]
  if (!first || !last) {
    indicator.shown = false
    return
  }
  indicator.y = first.offsetTop
  indicator.height = last.offsetTop + last.offsetHeight - first.offsetTop
  indicator.shown = true
}

// The track steps right at a child heading and back at the next parent. One path is drawn twice:
// grey for the whole track, and primary inside a clip that follows the headings in view.
/** Sideways step per depth level. It matches the step between `pl-3` and `pl-6` on the links. */
const INDENT = 12
/** Vertical run of the slanted join between two depths. Both ends of a join are this far from the row edge. */
const SLANT = 6
/** Width of the track drawing: the deepest step plus the stroke. */
const TRACK_WIDTH = INDENT + 2

const track = reactive({ d: '', height: 0 })

function buildTrack() {
  const els = props.items.map((_, index) => itemEls[index])
  if (!els.length || els.some(el => !el)) {
    track.d = ''
    track.height = 0
    return
  }

  // The stroke is 2px wide and centered on `x`, so the line starts 1px in.
  const xs = props.items.map(item => 1 + (item.depth - 2) * INDENT)
  let d = ''
  els.forEach((el, i) => {
    const top = el!.offsetTop
    const bottom = top + el!.offsetHeight
    const x = xs[i]!
    const start = i > 0 && xs[i - 1] !== x ? top + SLANT : top
    const end = i < els.length - 1 && xs[i + 1] !== x ? bottom - SLANT : bottom
    // The segment from the previous row's end to this row's start is the join: vertical when the
    // depth is the same, slanted when it is not.
    d += `${i === 0 ? 'M' : 'L'} ${x} ${start} L ${x} ${end} `
  })
  track.d = d.trim()
  track.height = els.at(-1)!.offsetTop + els.at(-1)!.offsetHeight
}

// Scroll events arrive faster than frames, so one measurement runs per frame.
let frame = 0
function schedule() {
  if (frame) return
  frame = requestAnimationFrame(() => {
    frame = 0
    measure()
  })
}

useEventListener('scroll', schedule, { passive: true })
// A resize can rewrap the labels, so the track is drawn again as well.
useEventListener('resize', () => {
  buildTrack()
  schedule()
})
onScopeDispose(() => cancelAnimationFrame(frame))

onMounted(async () => {
  buildTrack()
  measure()
  // The first placement jumps; only later moves slide.
  await nextTick()
  indicator.animate = true
})
watch(() => props.items, () => nextTick(() => {
  buildTrack()
  measure()
}))

const isInRange = (index: number) => index >= range.value.from && index <= range.value.to
</script>

<template>
  <nav v-if="items.length" aria-label="On this page" class="text-sm">
    <p class="mb-3 text-xs font-semibold tracking-wide uppercase opacity-60">
      On this page
    </p>

    <div class="relative">
      <!-- track: inside the left edge, because the scroll container clips anything beyond it -->
      <div
        aria-hidden="true"
        class="pointer-events-none absolute top-0 left-0"
        :style="{ width: `${TRACK_WIDTH}px`, height: `${track.height}px` }"
      >
        <svg class="absolute inset-0" :width="TRACK_WIDTH" :height="track.height" fill="none">
          <path :d="track.d" stroke-width="2" class="stroke-black/10 dark:stroke-white/10" />
        </svg>

        <!-- lit part: the same path, clipped to the headings in view -->
        <div
          class="absolute inset-x-0 top-0 overflow-hidden"
          :class="indicator.animate ? 'transition-[transform,height,opacity] duration-200 ease-out motion-reduce:transition-none' : ''"
          :style="{
            transform: `translateY(${indicator.y}px)`,
            height: `${indicator.height}px`,
            opacity: indicator.shown ? 1 : 0,
          }"
        >
          <svg
            class="absolute top-0 left-0"
            :class="indicator.animate ? 'transition-transform duration-200 ease-out motion-reduce:transition-none' : ''"
            :style="{ transform: `translateY(${-indicator.y}px)` }"
            :width="TRACK_WIDTH" :height="track.height" fill="none"
          >
            <path :d="track.d" stroke-width="2" class="stroke-primary" />
          </svg>
        </div>
      </div>

      <ul>
        <li v-for="(item, index) in items" :key="item.id" :ref="el => setItemEl(el, index)">
          <a
            :href="`#${item.id}`"
            class="block py-1 transition-colors"
            :class="[
              item.depth === 3 ? 'pl-6' : 'pl-3',
              isInRange(index) ? 'text-primary' : 'text-muted hover:text-bold',
              currentIndex === index ? 'font-medium' : '',
            ]"
            :aria-current="currentIndex === index ? 'location' : undefined"
          >
            {{ item.text }}
          </a>
        </li>
      </ul>
    </div>
  </nav>
</template>
