<script setup lang="ts">
import type { DraggingPayload } from '~/stores/dnd'
import DragItem from '~/components/base/dnd/DragItem.vue'

defineProps<{
  /** Keeps this demo apart from the other demos on the page. */
  group: string
  /** Restricts what the drop zone takes. Without it the zone takes every item. */
  acceptData?: (payload?: DraggingPayload) => boolean | undefined
}>()

const items = [1, 2, 3, 4, 5, 6, 7]
const dropped = ref<number[]>([])
/** True while the dragged item is over the drop zone. The drag image changes with it. */
const entering = ref(false)

function onDropped({ source }: { source: DraggingPayload | null }) {
  if (typeof source?.value === 'number') dropped.value.push(source.value)
}
</script>

<template>
  <div>
    <div class="flex">
      <DragItem
        v-for="i in items"
        :key="i"
        :group
        as="span"
        :droppable="false"
        :payload="{ value: i }"
        @dragend="entering = false"
      >
        <template #default="{ dragging }">
          <span class="drag" :class="{ 'opacity-40': dragging }">{{ i }}</span>
        </template>
        <template #drag-image="{ data }">
          <span class="drag" :class="{ 'rounded-full': entering }">
            {{ entering ? 'DROP' : data?.value }}
          </span>
        </template>
      </DragItem>
    </div>
    <!-- drop zone -->
    <DragItem
      :draggable="false"
      :group
      :accept-data
      hover-class="hovering"
      class="copy"
      @dragenter="entering = true"
      @dragleave="entering = false"
      @dropped="onDropped"
    >
      <!-- `dragleave` above also fires for a child, and that must not clear `entering`. -->
      <div class="pointer-events-none">
        <!-- An item can be dropped two times, so its value is not a key. -->
        <span v-for="(value, index) in dropped" :key="index">{{ value }}</span>
      </div>
    </DragItem>
  </div>
</template>

<style scoped>
.drag {
  width: 60px;
  height: 60px;
  background-color: var(--color-surface);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 10px 10px 0 10px;
  font-size: 20px;
  transition: all 0.5s;
}
.copy {
  margin: 20px 10px;
  border: 1px solid black;
  height: 100px;
  position: relative;
}
.copy::before {
  content: 'COPY';
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  color: rgba(0, 0, 0, 0.4);
  font-size: 25px;
  font-weight: bold;
}
.hovering {
  box-shadow: 0 0 2px 4px gray;
}
/* `DragItem` adds these two while a drag is in progress and `acceptData` gives an answer. */
.drop-allowed {
  background-color: rgba(0, 255, 0, 0.2);
}
.drop-forbidden {
  background-color: rgba(255, 0, 0, 0.2);
}
</style>
