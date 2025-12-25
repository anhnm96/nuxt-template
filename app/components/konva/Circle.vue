<script setup lang="ts">
import type { KonvaEventObject } from 'konva/lib/Node'
import type { CircleConfig } from 'konva/lib/shapes/Circle'
import { HIT_PADDING_SHAPE } from './constants'

defineProps<{
  config: CircleConfig
}>()

const emit = defineEmits<{
  updateConfig: [payload: Partial<CircleConfig>]
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

  emit('updateConfig', { x: node.x(), y: node.y(), scaleX, scaleY, rotation: node.rotation() })
  emit('transformEnd', e.target.id())
}
</script>

<template>
  <v-circle
    :ref="(r: any) => shapeRefs.set(config.id!, r)"

    :config="{
      ...config,
      draggable: isShapeDraggable,
      hitStrokeWidth: HIT_PADDING_SHAPE,
      strokeScaleEnabled: false,
    }"
    @mouseover="cursorStyle = 'pointer'"
    @mouseout="cursorStyle = 'default'"
    @dragend="handleDragEnd"
    @transformend="handleTransformEnd"
  />
</template>
