<script setup lang="ts">
import type { KonvaEventObject } from 'konva/lib/Node'
import type { Line as KonvaLine, LineConfig } from 'konva/lib/shapes/Line'

defineOptions({
  inheritAttrs: false,
})
const props = defineProps<{
  tool: string | null
  line: LineConfig
  index: number
  isMousingDown: boolean
}>()

const emit = defineEmits<{
  dragStart: []
  updateToolbarPosition: []
  updateLine: [points: number[]]
  initializeSelection: [ids: string[]]
}>()

const editImageStore = useEditImageStore()
const { setLineRef } = editImageStore
const { cursorStyle, lines, lineRefs, selectedIds } = storeToRefs(editImageStore)
const anchor1Ref = ref<any>(null)
const anchor2Ref = ref<any>(null)

const anchor1Config = ref({ x: props.line.x! + props.line.points![0]!, y: props.line.y! + props.line.points![1]! })
const anchor2Config = ref({ x: props.line.x! + props.line.points![2]!, y: props.line.y! + props.line.points![3]! })

const isSelected = computed(() => {
  return selectedIds.value.length === 1 && selectedIds.value.includes(props.line.id!)
})

watch(isSelected, (newValue) => {
  if (newValue && selectedIds.value.length === 1) {
    emit('initializeSelection', [props.line.id!])
    const node = lineRefs.value[props.index]!.getNode() as KonvaLine
    anchor1Config.value.x = node.x() + node.points()[0]!
    anchor1Config.value.y = node.y() + node.points()[1]!
    anchor2Config.value.x = node.x() + node.points()[2]!
    anchor2Config.value.y = node.y() + node.points()[3]!
  }
})

function handleLineDragEnd(e: KonvaEventObject<MouseEvent>, index: number) {
  const node = lineRefs.value[index]!.getNode() as KonvaLine

  Object.assign(lines.value[index]!, {
    x: node.x(),
    y: node.y(),
  })

  // Update toolbar position after drag
  setTimeout(() => {
    emit('updateToolbarPosition')
  }, 0)
}

function handleLineTransformEnd(e: KonvaEventObject<Event>, index: number) {
  const node = lineRefs.value[index]!.getNode() as KonvaLine
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
    Object.assign(lines.value[index]!, {
      x,
      y,
      points: newPoints,
    })
  }
}

onMounted(() => {
  // Auto-select the newly created line
  selectedIds.value = [props.line.id!]
})

function handleDragMoveLine(e: KonvaEventObject<MouseEvent>) {
  const node = e.target as KonvaLine
  anchor1Config.value.x = node.x() + node.points()[0]!
  anchor1Config.value.y = node.y() + node.points()[1]!
  anchor2Config.value.x = node.x() + node.points()[2]!
  anchor2Config.value.y = node.y() + node.points()[3]!
}

function handleDragMoveLineAnchor() {
  const points = [
    anchor1Ref.value.getNode().x() - props.line.x!,
    anchor1Ref.value.getNode().y() - props.line.y!,
    anchor2Ref.value.getNode().x() - props.line.x!,
    anchor2Ref.value.getNode().y() - props.line.y!,
  ]
  emit('updateLine', points)
  // layer.batchDraw();
}

function handleDragEndLineAnchor() {
  emit('updateToolbarPosition')
}

function mouseOverAnchor() {
  cursorStyle.value = 'move'
}
function mouseOutAnchor() {
  cursorStyle.value = 'default'
}
</script>

<template>
  <v-line
    v-bind="$attrs"
    :ref="(r: any) => setLineRef(r, index)"
    :config="{
      ...line,
      draggable: tool === 'select' || tool === 'multiselect',
      lineCap: 'round',
      lineJoin: 'round',
      strokeScaleEnabled: true,
    }"
    @mouseover="cursorStyle = 'pointer'"
    @mouseout="cursorStyle = 'default'"
    @dragmove="handleDragMoveLine"
    @dragend="handleLineDragEnd($event, index)"
    @transformend="handleLineTransformEnd($event, index)"
  />
  <template v-if="isSelected">
    <v-circle
      ref="anchor1Ref"
      :config="{
        name: 'line-anchor',
        x: anchor1Config.x,
        y: anchor1Config.y,
        radius: 6,
        stroke: 'rgb(0, 161, 255)',
        strokeWidth: 1,
        fill: 'white',
        draggable: true,
        visible: !isMousingDown }"
      @mouseover="mouseOverAnchor"
      @mouseout="mouseOutAnchor"
      @dragmove="handleDragMoveLineAnchor"
      @dragend="handleDragEndLineAnchor"
    />
    <v-circle
      ref="anchor2Ref"
      :config="{
        name: 'line-anchor',
        x: anchor2Config.x,
        y: anchor2Config.y,
        radius: 6,
        stroke: 'rgb(0, 161, 255)',
        strokeWidth: 1,
        fill: 'white',
        draggable: true,
        visible: !isMousingDown }"
      @mouseover="mouseOverAnchor"
      @mouseout="mouseOutAnchor"
      @dragmove="handleDragMoveLineAnchor"
      @dragend="handleDragEndLineAnchor"
    />
  </template>
</template>
