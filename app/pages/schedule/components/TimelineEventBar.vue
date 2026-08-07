<script setup lang="ts">
import type { StyleValue } from 'vue'
import type { TimelineDragEdge, TimelineDragItem } from '../composables/useTimelineGestures'
import type { ScheduleEventUI } from '~/services/schedule'
import EventTooltip from './EventTooltip.vue'

const props = defineProps<{
  /** The placed event: its clamped minute range plus its lane. */
  item: TimelineDragItem<ScheduleEventUI>
  /** Geometry (left/width/top/height) computed by the timeline. */
  barStyle: StyleValue
  /** This bar is the one currently being dragged (resized or moved). */
  dragTarget?: boolean
  /** The in-flight drag on this bar is a move (not a resize). */
  moving?: boolean
  /** Any drag is in flight — suppresses the hover tooltip. */
  dragging?: boolean
  /**
   * X where the scrollable timeline starts (the frozen columns' combined
   * width). A label that fits its bar sticks here so it stays readable while a
   * long bar is scrolled through, instead of scrolling off behind the columns.
   */
  stickyLeft?: number
}>()

const emit = defineEmits<{
  (e: 'move', event: PointerEvent): void
  (e: 'resize', event: PointerEvent, edge: Extract<TimelineDragEdge, 'start' | 'end'>): void
  (e: 'edit'): void
}>()

const event = computed(() => props.item.event)

/**
 * The label either sticks to the timeline's left edge
 * or, when it cannot fit inside the bar,
 * falls back to being clipped with an ellipsis. Sticking requires no clipping
 * ancestor between the label and the scroll container, so the two modes are
 * mutually exclusive — hence the measurement.
 */
const label = useTemplateRef('label')
const labelContent = useTemplateRef('labelContent')
const isXOverflowed = ref(false)

function update() {
  const box = label.value
  const inner = labelContent.value
  if (!box || !inner) {
    isXOverflowed.value = false
    return
  }
  const style = getComputedStyle(box)
  const availableX = box.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
  isXOverflowed.value = inner.scrollWidth > availableX
}

onMounted(() => {
  update()
})
watch(event, (newVal, oldVal) => {
  if (newVal.title !== oldVal?.title || newVal.start !== oldVal?.start || newVal.end !== oldVal?.end) {
    update()
  }
}, { deep: true, flush: 'post' })
</script>

<template>
  <div
    class="timeline-event group/event absolute flex flex-col justify-center rounded-lg px-3 select-none"
    :class="[
      event.timed ? 'cursor-grab' : 'cursor-pointer',
      // Clipping is only switched on when there is something to clip: an
      // `overflow` other than `visible` would anchor the sticky label to this
      // bar instead of to the scroll container.
      isXOverflowed ? 'overflow-hidden' : 'overflow-visible',
      { 'z-(--z-dragged-bar)': dragTarget, 'cursor-grabbing!': moving },
    ]"
    :style="[barStyle, { '--event-color': event.color }]"
    @pointerdown.stop="event.timed && emit('move', $event)"
    @click="emit('edit')"
  >
    <!-- Full width whatever the mode, so the measurement stays comparable. -->
    <div ref="label">
      <!-- Shrink-wrapped, so sticky has room to slide within the bar. -->
      <div
        ref="labelContent"
        class="space-x-0.5 text-xs leading-tight whitespace-nowrap"
        :class="[isXOverflowed ? 'truncate' : 'sticky inline-flex']"
        :style="!isXOverflowed && { left: `${stickyLeft ?? 0}px` }"
      >
        <span class="font-semibold">{{ event.title }}</span>
        <span class="opacity-80">
          <template v-if="event.timed">
            {{ formatDateTime(event.start, "HH:mm") }} - {{ formatDateTime(event.end, "HH:mm") }}
          </template>
          <template v-else>All day</template>
        </span>
      </div>
    </div>
    <!-- Edge resize handles (timed events only — resizing an
      all-day event by the minute would make it a timed one) -->
    <template v-if="event.timed">
      <div
        data-slot="gantt-resize-handle"
        class="resize-handle hit-area-x-0.5 left-0 pointer-coarse:opacity-100"
        :class="{ 'resize-handle--active': dragTarget }"
        @pointerdown.stop="emit('resize', $event, 'start')"
        @click.stop
      />
      <div
        data-slot="gantt-resize-handle"
        class="resize-handle hit-area-x-0.5 right-0 pointer-coarse:opacity-100"
        :class="{ 'resize-handle--active': dragTarget }"
        @pointerdown.stop="emit('resize', $event, 'end')"
        @click.stop
      />
    </template>
    <EventTooltip placement="bottom" :event="event" :dragging="dragging" />
  </div>
</template>

<style scoped>
/*
 * The bar's fill/border colors live in TimelineDay's scoped style (`.timeline-event`,
 * shared with the all-day chips) — a parent's scope id is also applied to a child
 * component's root element, so those rules still reach this root.
 * The resize handles are only ever rendered here, so their styles belong here.
 */

/* Edge resize handle: hidden by default, shown on event hover or while dragging. */
.resize-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: ew-resize;
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

.group\/event:hover .resize-handle,
.resize-handle--active {
  opacity: 1;
}
</style>
