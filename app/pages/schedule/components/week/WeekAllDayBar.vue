<script setup lang="ts">
import type { StyleValue } from 'vue'
import type { AllDayBar } from '../../utils/week'
import dayjs from 'dayjs/esm'
import EventTooltip from '../EventTooltip.vue'

const props = defineProps<{
  bar: AllDayBar
  /** Geometry (left/width/top/height) computed by the row. */
  barStyle: StyleValue
  /** Any gesture is in flight — suppresses the hover tooltip. */
  dragging?: boolean
  /** This bar is the one being dragged. */
  dragTarget?: boolean
  /** This bar is the all-day row's single tab stop. */
  tabbable?: boolean
}>()

const emit = defineEmits<{
  move: [event: PointerEvent]
  resize: [event: PointerEvent, edge: 'start' | 'end']
  edit: []
}>()

const event = computed(() => props.bar.event)

/**
 * A promoted event is a timed one long enough to live here; showing its clock
 * times keeps it distinguishable from a true all-day event, whose date range
 * is the whole story.
 */
const label = computed(() => {
  if (!props.bar.promoted) return event.value.title
  const from = dayjs(event.value.start).format('D MMM HH:mm')
  const to = dayjs(event.value.end).format('D MMM HH:mm')
  return `${event.value.title} · ${from} – ${to}`
})

const ariaLabel = computed(() => {
  const from = dayjs(event.value.start).format('ddd D MMM')
  const to = dayjs(event.value.end).format('ddd D MMM')
  const kind = props.bar.promoted ? 'Long event' : 'All-day event'
  return `${kind}, ${event.value.title}, ${from} to ${to}`
})
</script>

<template>
  <!--
    `title=""` is deliberate: the row's track carries a "double-click or drag to
    create" tooltip for its empty space, and without a title of its own a bar
    would inherit it — advice that is both wrong here (a double-click on a bar
    creates nothing) and duplicated by EventTooltip. An empty title states that
    no ancestor's advisory text applies.
  -->
  <button
    type="button"
    class="week-all-day-bar group/bar absolute flex cursor-grab items-center gap-1 truncate rounded-md px-2 text-left text-xs font-medium select-none"
    :class="[
      bar.continuesBefore ? 'rounded-l-none' : '',
      bar.continuesAfter ? 'rounded-r-none' : '',
      { 'ring-2 ring-primary/70': dragTarget, 'week-all-day-bar--promoted': bar.promoted },
    ]"
    :style="[barStyle, { '--event-color': event.color }]"
    :tabindex="tabbable ? 0 : -1"
    :aria-label="ariaLabel"
    title=""
    @dblclick.stop
    @pointerdown.stop="emit('move', $event)"
    @click="emit('edit')"
  >
    <Icon v-if="bar.promoted" size="11" class="shrink-0 opacity-70" name="mdi:clock-time-seven-outline" />
    <span class="truncate">{{ label }}</span>

    <!-- Handles only on ends that are really the event's own; an end cut by the
      displayed range has no date to drag. -->
    <span
      v-if="!bar.continuesBefore"
      class="resize-handle left-0 cursor-ew-resize"
      @pointerdown.stop="emit('resize', $event, 'start')"
      @click.stop
    />
    <span
      v-if="!bar.continuesAfter"
      class="resize-handle right-0 cursor-ew-resize"
      @pointerdown.stop="emit('resize', $event, 'end')"
      @click.stop
    />

    <EventTooltip placement="bottom" :event="event" :dragging="dragging" />
  </button>
</template>

<style scoped>
/* Opaque, and mixed against the theme tokens, for the reasons WeekEventBlock
  gives — the row sits directly above the grid, so the two must match. */
.week-all-day-bar {
  background: color-mix(in oklch, var(--event-color) 20%, var(--color-surface));
  border-left: 4px solid var(--event-color);
  color: color-mix(in oklch, var(--event-color) 50%, var(--color-surface-inverted));
}

/* A promoted event is really a timed one; the doubled edge and the fainter
  fill say so at a glance. */
.week-all-day-bar--promoted {
  border-left-style: double;
  background: color-mix(in oklch, var(--event-color) 16%, var(--color-surface));
}

.resize-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 8px;
  opacity: 0;
  transition: opacity 0.12s ease;
}

.resize-handle::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  width: 3px;
  height: 60%;
  transform: translate(-50%, -50%);
  border-radius: 9999px;
  background: var(--event-color);
}

.group\/bar:hover .resize-handle,
.group\/bar:focus-visible .resize-handle {
  opacity: 1;
}
</style>
