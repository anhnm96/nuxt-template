<script setup lang="ts">
import type { KonvaEventObject } from 'konva/lib/Node'
import type { Line as KonvaLine, LineConfig } from 'konva/lib/shapes/Line'

const props = defineProps<{
  tool: string | null
  line: LineConfig
  index: number
}>()

const emit = defineEmits<{
  dragStart: []
  updateToolbarPosition: []
}>()

const editImageStore = useEditImageStore()
const { setLineRef } = editImageStore
const { cursorStyle, lines, lineRefs, selectedIds } = storeToRefs(editImageStore)

function handleLineDragEnd(e: KonvaEventObject<MouseEvent>, index: number) {
  const node = lineRefs.value[index]!.getNode() as KonvaLine
  const points = node.points()

  Object.assign(lines.value[index]!, {
    points: [...points],
  })

  // Update toolbar position after drag
  setTimeout(() => {
    emit('updateToolbarPosition')
  }, 0)
}

function handleLineTransformEnd(e: KonvaEventObject<Event>, index: number) {
  const node = lineRefs.value[index]!.getNode() as KonvaLine
  const points = node.points()

  Object.assign(lines.value[index]!, {
    points: [...points],
    rotation: node.rotation(),
  })
}

onMounted(() => {
  // Auto-select the newly created line
  selectedIds.value = [props.line.id!]
})
</script>

<template>
  <v-line
    :ref="(r: any) => setLineRef(r, index)"
    :config="{
      ...line,
      draggable: tool === 'select',
      lineCap: 'round',
      lineJoin: 'round',
    }"
    @mouseover="cursorStyle = 'pointer'"
    @mouseout="cursorStyle = 'default'"
    @dragend="handleLineDragEnd($event, index)"
    @transformend="handleLineTransformEnd($event, index)"
  />
</template>
