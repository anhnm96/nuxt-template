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

const isSelected = computed(() => {
  return selectedIds.value.includes(props.line.id!)
})

watch(isSelected, (newValue) => {
  if (newValue) {
    emit('initializeSelection', [props.line.id!])
  }
})

function handleLineDragEnd(e: KonvaEventObject<MouseEvent>, index: number) {
  const node = lineRefs.value[index]!.getNode() as KonvaLine
  const points = node.points()

  Object.assign(lines.value[index]!, {
    x: node.x(),
    y: node.y(),
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

const anchor1Ref = ref<any>(null)
const anchor2Ref = ref<any>(null)
function updateLine() {
  const points = [
    anchor1Ref.value.getNode().x() - props.line.x!,
    anchor1Ref.value.getNode().y() - props.line.y!,
    anchor2Ref.value.getNode().x() - props.line.x!,
    anchor2Ref.value.getNode().y() - props.line.y!,
  ]
  emit('updateLine', points)
  // layer.batchDraw();
}

const anchor1Config = ref({ x: props.line.x! + props.line.points![0]!, y: props.line.y! + props.line.points![1]! })
const anchor2Config = ref({ x: props.line.x! + props.line.points![2]!, y: props.line.y! + props.line.points![3]! })
function handleLineDragMove(e: KonvaEventObject<MouseEvent>) {
  const node = e.target
  anchor1Config.value.x = node.x() + props.line.points![0]!
  anchor1Config.value.y = node.y() + props.line.points![1]!
  anchor2Config.value.x = node.x() + props.line.points![2]!
  anchor2Config.value.y = node.y() + props.line.points![3]!
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
      draggable: tool === 'select',
      lineCap: 'round',
      lineJoin: 'round',
    }"
    @mouseover="cursorStyle = 'pointer'"
    @mouseout="cursorStyle = 'default'"
    @dragmove="handleLineDragMove"
    @dragend="handleLineDragEnd($event, index)"
    @transformend="handleLineTransformEnd($event, index)"
  />
  <template v-if="isSelected">
    <v-circle
      ref="anchor1Ref"
      :config="{
        x: anchor1Config.x,
        y: anchor1Config.y,
        radius: 4,
        stroke: 'blue',
        strokeWidth: 2,
        fill: 'white',
        draggable: true }"
      @mouseover="mouseOverAnchor"
      @mouseout="mouseOutAnchor"
      @dragmove="updateLine"
    />
    <v-circle
      ref="anchor2Ref"
      :config="{
        x: anchor2Config.x,
        y: anchor2Config.y,
        radius: 4,
        stroke: 'blue',
        strokeWidth: 2,
        fill: 'white',
        draggable: true }"
      @mouseover="mouseOverAnchor"
      @mouseout="mouseOutAnchor"
      @dragmove="updateLine"
    />
  </template>
</template>
