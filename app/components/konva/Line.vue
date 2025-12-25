<script setup lang="ts">
import type { KonvaEventObject } from 'konva/lib/Node'
import type { Line as KonvaLine, LineConfig } from 'konva/lib/shapes/Line'

const props = defineProps<{
  config: LineConfig
}>()

const emit = defineEmits<{
  dragStart: []
  updateToolbarPosition: []
  updateLine: [points: number[]]
  updateConfig: [payload: Partial<LineConfig>]
  dragEnd: [id: string]
  transformEnd: [id: string]
  updateAnchor1Config: [config: { x: number, y: number }]
  updateAnchor2Config: [config: { x: number, y: number }]
}>()

const editImageStore = useEditImageStore()
const { cursorStyle, tool, shapeRefs, selectedIds } = storeToRefs(editImageStore)

function handleLineDragEnd(e: KonvaEventObject<MouseEvent>) {
  emit('updateConfig', { x: e.target.x(), y: e.target.y() })
  emit('dragEnd', e.target.id())
}

function handleLineTransformEnd(e: KonvaEventObject<Event>) {
  const node = e.target as KonvaLine
  const rotation = node.rotation()
  const scaleX = node.scaleX()
  const scaleY = node.scaleY()
  const points = node.points()
  const x = node.x()
  const y = node.y()

  // Check if there are any transformations to bake into points
  const hasRotation = rotation !== 0
  const hasScale = scaleX !== 1 || scaleY !== 1

  if (hasRotation || hasScale) {
    const angleRadians = (rotation * Math.PI) / 180
    const cos = Math.cos(angleRadians)
    const sin = Math.sin(angleRadians)

    // Get world coordinates of endpoints after applying scale and rotation
    // First apply scale to relative points
    const scaledP1x = points[0]! * scaleX
    const scaledP1y = points[1]! * scaleY
    const scaledP2x = points[2]! * scaleX
    const scaledP2y = points[3]! * scaleY

    // Then rotate around the line's center (x, y)
    const rotatedP1x = x + scaledP1x * cos - scaledP1y * sin
    const rotatedP1y = y + scaledP1x * sin + scaledP1y * cos
    const rotatedP2x = x + scaledP2x * cos - scaledP2y * sin
    const rotatedP2y = y + scaledP2x * sin + scaledP2y * cos

    // Convert back to relative coordinates (new position stays the same)
    const newPoints = [
      rotatedP1x - x,
      rotatedP1y - y,
      rotatedP2x - x,
      rotatedP2y - y,
    ]

    // Update the node - reset transformations and set new points
    node.rotation(0)
    node.scaleX(1)
    node.scaleY(1)

    // Update the stored line data
    emit('updateConfig', {
      x,
      y,
      points: newPoints,
    })
    emit('transformEnd', e.target.id())
  }
}

onMounted(() => {
  // Auto-select the newly created line
  selectedIds.value = [props.config.id!]
})

function handleDragMoveLine(e: KonvaEventObject<MouseEvent>) {
  const node = e.target as KonvaLine
  emit('updateAnchor1Config', { x: node.x() + node.points()[0]!, y: node.y() + node.points()[1]! })
  emit('updateAnchor2Config', { x: node.x() + node.points()[2]!, y: node.y() + node.points()[3]! })
}
</script>

<template>
  <v-line
    :ref="(r: any) => shapeRefs.set(config.id!, r)"
    :config="{
      ...config,
      draggable: tool === 'select' || tool === 'multiselect',
      lineCap: 'round',
      lineJoin: 'round',
      strokeScaleEnabled: true,
    }"
    @mouseover="cursorStyle = 'pointer'"
    @mouseout="cursorStyle = 'default'"
    @dragmove="handleDragMoveLine"
    @dragend="handleLineDragEnd"
    @transformend="handleLineTransformEnd"
  />
</template>
