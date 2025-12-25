<script setup lang="ts">
import type { KonvaEventObject } from 'konva/lib/Node'
import type { RectConfig } from 'konva/lib/shapes/Rect'
import { HIT_PADDING_SHAPE } from './constants'

defineProps<{
  config: RectConfig
}>()

const emit = defineEmits<{
  updateConfig: [payload: Partial<RectConfig>]
  dragEnd: [id: string]
  transformEnd: [id: string]
}>()

const editImageStore = useEditImageStore()
const { cursorStyle, isShapeDraggable, shapeRefs } = storeToRefs(editImageStore)

function handleDragEnd(e: KonvaEventObject<MouseEvent>) {
  emit('updateConfig', { x: e.target.x(), y: e.target.y() })
  emit('dragEnd', e.target.id())
}

function handleTransformEnd(e: KonvaEventObject<Event>) {
  const node = e.target

  const scaleX = node.scaleX()
  const scaleY = node.scaleY()

  // Reset scale
  node.scaleX(1)
  node.scaleY(1)

  emit('updateConfig', { x: node.x(), y: node.y(), width: Math.max(44, node.width() * scaleX), height: Math.max(44, node.height() * scaleY), rotation: node.rotation() })
  emit('transformEnd', e.target.id())
}
</script>

<template>
  <v-rect
    :ref="(r: any) => shapeRefs.set(config.id!, r)"
    :config="{ ...config,
               draggable: isShapeDraggable,
               strokeScaleEnabled: false,
               hitStrokeWidth: HIT_PADDING_SHAPE }"
    @mouseover="cursorStyle = 'pointer'"
    @mouseout="cursorStyle = 'default'"
    @dragend="handleDragEnd"
    @transformend="handleTransformEnd"
  />
</template>
