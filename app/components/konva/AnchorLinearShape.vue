<script setup lang="ts">
import type { KonvaEventObject } from 'konva/lib/Node'

defineProps<{
  isMousingDown: boolean
  anchor1Config: { x: number, y: number }
  anchor2Config: { x: number, y: number }
}>()
const emit = defineEmits<{
  'updateLinearShape': [points: number[] ]
  'saveHistory': []
  'updateToolbarPosition': []
  'update:anchor1Config': [config: { x: number, y: number }]
  'update:anchor2Config': [config: { x: number, y: number }]
}>()

const anchor1Ref = useTemplateRef('anchor1Ref')
const anchor2Ref = useTemplateRef('anchor2Ref')
const editImageStore = useEditImageStore()
const { cursorStyle, selectedIds, shapeRefs } = storeToRefs(editImageStore)

function handleDragMoveAnchor() {
  const shape = shapeRefs.value.get(selectedIds.value[0]!)
  if (!shape) return
  const points = [
    anchor1Ref.value.getNode().x() - shape.getNode().x(),
    anchor1Ref.value.getNode().y() - shape.getNode().y(),
    anchor2Ref.value.getNode().x() - shape.getNode().x(),
    anchor2Ref.value.getNode().y() - shape.getNode().y(),
  ]
  emit('updateLinearShape', points)
}

function handleDragEnd(e: KonvaEventObject<MouseEvent>, eventName: 'update:anchor1Config' | 'update:anchor2Config') {
  const node = e.target
  emit(eventName as any, {
    x: node.x(),
    y: node.y(),
  })
  emit('updateToolbarPosition')
  requestAnimationFrame(() => {
    emit('saveHistory')
  })
}
</script>

<template>
  <v-circle
    ref="anchor1Ref"
    :config="{
      name: 'linear-shape-anchor',
      x: anchor1Config.x,
      y: anchor1Config.y,
      radius: 6,
      stroke: 'rgb(0, 161, 255)',
      strokeWidth: 1,
      fill: 'white',
      hitStrokeWidth: 6,
      draggable: true,
      visible: !isMousingDown,
    }"
    @mouseover="cursorStyle = 'move'"
    @mouseout="cursorStyle = 'default'"
    @dragmove="handleDragMoveAnchor"
    @dragend="handleDragEnd($event, 'update:anchor1Config')"
  />
  <v-circle
    ref="anchor2Ref"
    :config="{
      name: 'linear-shape-anchor',
      x: anchor2Config.x,
      y: anchor2Config.y,
      radius: 6,
      stroke: 'rgb(0, 161, 255)',
      strokeWidth: 1,
      fill: 'white',
      hitStrokeWidth: 6,
      draggable: true,
      visible: !isMousingDown,
    }"
    @mouseover="cursorStyle = 'move'"
    @mouseout="cursorStyle = 'default'"
    @dragmove="handleDragMoveAnchor"
    @dragend="handleDragEnd($event, 'update:anchor2Config')"
  />
</template>
