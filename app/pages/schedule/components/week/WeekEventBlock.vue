<script setup lang="ts">
import type { PlacedSegment } from '../../utils/week'
import dayjs from 'dayjs/esm'
import EventTooltip from '../EventTooltip.vue'

const props = defineProps<{
  /** The placed segment: one day's slice of an event, with its geometry. */
  segment: PlacedSegment
  /** Replaces the segment's vertical geometry while a gesture previews it. */
  preview?: { top: number, height: number } | null
  /** Any gesture is in flight — suppresses the hover tooltip. */
  dragging?: boolean
  /** This block is the one being dragged. */
  dragTarget?: boolean
  /** The block is being moved: it stays in place as a ghost while a copy follows the pointer. */
  ghosted?: boolean
  /** Rendered outside the column as the pointer-following copy of a moving block. */
  floating?: boolean
  /** This block is the events layer's single tab stop. */
  tabbable?: boolean
}>()

const emit = defineEmits<{
  move: [event: PointerEvent]
  resize: [event: PointerEvent, edge: 'start' | 'end']
  edit: []
}>()

const event = computed(() => props.segment.event)
const height = computed(() => props.preview?.height ?? props.segment.height)

/**
 * Content thins out as the block shrinks: below two lines the time is dropped,
 * and below one it shares the title's line. A 15-minute event at the compact
 * zoom is 10px tall, so this is the common case, not an edge case.
 */
const density = computed(() => {
  if (height.value < 26) return 'inline'
  if (height.value < 42) return 'title'
  return 'full'
})

/** Start/end of the whole event, not of this day's slice. */
const timeLabel = computed(() => {
  const from = dayjs(event.value.start)
  const to = dayjs(event.value.end)
  return `${from.format('HH:mm')} – ${to.format('HH:mm')}`
})

const ariaLabel = computed(() => {
  const day = dayjs(event.value.start).format('ddd D MMM')
  const clipped = props.segment.continuesBefore || props.segment.continuesAfter ? ', continues' : ''
  return `${event.value.title}, ${day} ${timeLabel.value}${clipped}`
})

const style = computed(() => ({
  'top': `${props.preview?.top ?? props.segment.top}px`,
  'height': `${Math.max(height.value, 12)}px`,
  'left': props.floating ? '0px' : props.segment.left,
  'width': props.floating ? '100%' : props.segment.width,
  'zIndex': props.segment.zIndex,
  '--event-color': event.value.color,
}))
</script>

<template>
  <button
    type="button"
    class="week-event group/event absolute flex cursor-grab flex-col overflow-hidden px-1.5 text-left select-none"
    :class="[
      density === 'full' ? 'py-1' : 'py-0',
      segment.continuesBefore ? 'rounded-t-none' : 'rounded-t-md',
      segment.continuesAfter ? 'rounded-b-none' : 'rounded-b-md',
      {
        'opacity-40': ghosted,
        'pointer-events-none z-30 cursor-grabbing shadow-lg': floating,
        'ring-2 ring-primary/70': dragTarget && !floating,
      },
    ]"
    :style="style"
    :tabindex="tabbable ? 0 : -1"
    :aria-label="ariaLabel"
    @pointerdown.stop="emit('move', $event)"
    @click="emit('edit')"
  >
    <div v-if="density === 'inline'" class="flex gap-1 truncate text-[10px] leading-none">
      <span class="truncate font-medium">{{ event.title }}</span>
      <span class="opacity-70">{{ dayjs(event.start).format('HH:mm') }}</span>
    </div>
    <template v-else>
      <div class="truncate text-xs leading-tight font-medium">
        {{ event.title }}
      </div>
      <div v-if="density === 'full'" class="truncate text-[10px] leading-tight opacity-80">
        {{ timeLabel }}
      </div>
    </template>

    <!-- Edge handles, only on edges that are really the event's own: a segment
      cut by midnight or by the visible hour range has nothing to resize there. -->
    <span
      v-if="!segment.continuesBefore && !floating"
      class="resize-handle top-0 cursor-ns-resize"
      @pointerdown.stop="emit('resize', $event, 'start')"
      @click.stop
    />
    <span
      v-if="!segment.continuesAfter && !floating"
      class="resize-handle bottom-0 cursor-ns-resize"
      @pointerdown.stop="emit('resize', $event, 'end')"
      @click.stop
    />

    <EventTooltip :event="event" :dragging="dragging" />
  </button>
</template>

<style scoped>
/*
 * An opaque fill, not a tint: the hour rules showing through a translucent
 * block made it hard to read as one object.
 *
 * Both mixes end on a `light-dark()` token, so one rule serves both themes —
 * `.dark` sets `color-scheme`, which is what resolves them. The text's 50% is
 * the lowest share that clears 4.5:1 against the fill on every hue in the
 * palette; a fixed mix with black cannot, because it ignores how light the hue
 * already is. WeekAllDayBar and TimelineDay follow this rule.
 */
.week-event {
  background: color-mix(in oklch, var(--event-color) 20%, var(--color-surface));
  border-left: 4px solid var(--event-color);
  color: color-mix(in oklch, var(--event-color) 50%, var(--color-surface-inverted));
}

/* Edge resize handle: hidden until the block is hovered or focused. */
.resize-handle {
  position: absolute;
  right: 0;
  left: 0;
  height: 7px;
  opacity: 0;
  transition: opacity 0.12s ease;
}

.resize-handle::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  width: 40%;
  height: 3px;
  transform: translate(-50%, -50%);
  border-radius: 9999px;
  background: var(--event-color);
}

.group\/event:hover .resize-handle,
.group\/event:focus-visible .resize-handle {
  opacity: 1;
}
</style>
