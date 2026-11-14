<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import DragItem from '~/components/base/dnd/DragItem.vue'

const trash = useTemplateRef<ComponentPublicInstance>('trash')
const hasTrash = ref(false)

/** Which smiley shows: 0 at the start of the drag, 5 at the trash. */
const step = ref(0)
/** The distance from the first cursor position of a drag to the trash. */
let totalDistance: number | undefined

/** The step changes when the remaining part of the distance goes below each of these. */
const thresholds = [0.9, 0.7, 0.5, 0.3, 0.1]

function onDrag(event: MouseEvent) {
  const { top, left, height, width } = (trash.value!.$el as HTMLElement).getBoundingClientRect()
  const remaining = Math.hypot(left + width / 2 - event.clientX, top + height / 2 - event.clientY)
  totalDistance ??= remaining

  const ratio = totalDistance ? remaining / totalDistance : 0
  step.value = thresholds.filter(threshold => ratio < threshold).length
}

function onDragend() {
  totalDistance = undefined
  step.value = 0
}
</script>

<template>
  <div>
    <!-- trash -->
    <DragItem
      ref="trash"
      hover-class="hovering"
      :class="{ full: hasTrash }"
      class="trash"
      @dropped="hasTrash = true"
    />
    <!-- document -->
    <DragItem
      :droppable="false"
      :payload="{ value: 'doc1' }"
      class="inline-block"
      @customdrag="onDrag"
      @dragend="onDragend"
    >
      <img :draggable="false" class="document" src="~/assets/img/drag/document.png">
      <!-- `v-show`, so each image is loaded before the drag needs it. -->
      <template #drag-image>
        <img v-show="step === 0" class="drag-image" src="~/assets/img/drag/smiley01.png">
        <img v-show="step === 1" class="drag-image" src="~/assets/img/drag/smiley02.png">
        <img v-show="step === 2" class="drag-image" src="~/assets/img/drag/smiley03.png">
        <img v-show="step === 3" class="drag-image" src="~/assets/img/drag/smiley04.png">
        <img v-show="step === 4" class="drag-image" src="~/assets/img/drag/smiley05.png">
        <img v-show="step === 5" class="drag-image" src="~/assets/img/drag/smiley06.png">
      </template>
    </DragItem>
  </div>
</template>

<style scoped>
.trash {
  background-image: url('~/assets/img/drag/trash.png');
  background-position: top left;
  background-repeat: no-repeat;
  height: 128px;
  width: 128px;
  margin-top: 90px;
  float: right;
  opacity: 0.7;
}
.trash.full {
  background-position: top right;
}
.document {
  margin-top: 10px;
  display: block;
  cursor: grab;
}
.drag-image {
  max-width: unset;
  width: 100px;
  height: 100px;
}
.hovering {
  box-shadow: 0 0 2px 4px gray;
}
</style>
