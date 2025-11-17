<script setup lang="ts">
// import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { ArrowConfig } from 'konva/lib/shapes/Arrow'
import type { CircleConfig } from 'konva/lib/shapes/Circle'
import type { LineConfig } from 'konva/lib/shapes/Line'
import type { RectConfig } from 'konva/lib/shapes/Rect'
import type { Box, Transformer } from 'konva/lib/shapes/Transformer'
import { Util } from 'konva/lib/Util'
import Dropdown from '@/components/Dropdown.vue'
import Text from '~/components/konva/Text.vue'

const props = defineProps<{
  imageUrl?: string
}>()
// Container dimensions
const containerWidth = 649
const containerHeight = 472
const MIN_SCALE = 0.5
const MAX_SCALE = 5
const SCALE_STEP = 0.1

const editImageStore = useEditImageStore()
const { cursorStyle, texts, textRefs, selectedIds } = storeToRefs(editImageStore)
const imageDimensions = ref({
  width: 0,
  height: 0,
})
const image = shallowRef<HTMLImageElement>()
function loadImage(file: File) {
  const imageUrl = URL.createObjectURL(file)
  // Load the image to get its natural dimensions
  const img = new Image()
  img.onload = () => {
    imageDimensions.value = {
      width: img.naturalWidth,
      height: img.naturalHeight,
    }
    image.value = img
  }
  img.src = imageUrl
}

// Calculate scaled dimensions to fit within container while maintaining aspect ratio
function calculateDimensions() {
  if (!imageDimensions.value.width || !imageDimensions.value.height) {
    return {
      width: containerWidth,
      height: containerHeight,
      x: 0,
      y: 0,
      offsetX: 0,
      offsetY: 0,
    }
  }

  // For 90 and 270 degree rotations, swap width and height
  // const isRotated = rotation === -90 || rotation === -270;
  const isRotated = false
  const effectiveWidth = isRotated ? imageDimensions.value.height : imageDimensions.value.width
  const effectiveHeight = isRotated ? imageDimensions.value.width : imageDimensions.value.height

  const imageAspectRatio = effectiveWidth / effectiveHeight
  const containerAspectRatio = containerWidth / containerHeight

  let scaledWidth, scaledHeight

  if (imageAspectRatio > containerAspectRatio) {
    // Image is wider than container
    scaledWidth = containerWidth
    scaledHeight = containerWidth / imageAspectRatio
  } else {
    // Image is taller than container
    scaledHeight = containerHeight
    scaledWidth = containerHeight * imageAspectRatio
  }

  // Calculate center position for rotation
  // The image rotates around its center point
  const centerX = containerWidth / 2
  const centerY = containerHeight / 2

  return {
    width: scaledWidth,
    height: scaledHeight,
    x: centerX,
    y: centerY,
    offsetX: scaledWidth / 2,
    offsetY: scaledHeight / 2,
  }
}

const dimensions = shallowRef({
  width: 0,
  height: 0,
  x: 0,
  y: 0,
  offsetX: 0,
  offsetY: 0,
})
watch(image, (newImage) => {
  if (newImage) {
    dimensions.value = calculateDimensions()
  }
})

const DEFAULT_STROKE_COLOR = '#E52E3E'
const DEFAULT_STROKE_WIDTH = 2
const HIT_STROKE_WIDTH_LINE = 44 // Wider hit area for lines/arrows
const HIT_PADDING_SHAPE = 22 // Padding for circles/rectangles
const isSelecting = ref(false)
const stageRef = useTemplateRef('stageRef')
const transformerRef = useTemplateRef('transformerRef')
const toolbarPosition = ref({
  x: 0,
  y: 0,
  visible: false,
})
const rectRefs = ref<Transformer[]>([])
const circleRefs = ref<Transformer[]>([])
const lines = ref<LineConfig[]>([])
const arrows = ref<ArrowConfig[]>([])
const circles = ref<CircleConfig[]>([])
const rectangles = ref<RectConfig[]>([])

const tool = ref<string | null>('select')
function setTool(newTool: string) {
  if (newTool === tool.value) {
    tool.value = null
  } else {
    tool.value = newTool
  }
}

const rotation = ref(0)
const scaleX = ref(1)
const scaleY = ref(1)
const toolbarButtons = [
  { label: 'Undo', value: 'undo', icon: 'ph:arrow-arc-left-bold' },
  { label: 'Redo', value: 'redo', icon: 'ph:arrow-arc-right-bold' },
  { label: 'Select', value: 'select', onClick: () => setTool('select'), icon: 'ph:cursor-bold' },
  { label: 'Circle', value: 'circle', onClick: createCircle, icon: 'ph:circle-bold' },
  { label: 'Rectangle', value: 'rectangle', onClick: createRectangle, icon: 'ph:rectangle-bold' },
  { label: 'Arrow', value: 'arrow', icon: 'ph:arrow-up-right-bold' },
  { label: 'Line', value: 'line', icon: 'ph:line-vertical-bold' },
  { label: 'Text', value: 'text', onClick: createText, icon: 'ph:text-aa-bold' },
  { label: 'Brightness', value: 'brightness', icon: 'ph:sun-dim-bold' },
  { label: 'Crop', value: 'crop', onClick: initCropScene, icon: 'ph:crop-bold' },

]

const imageRef = useTemplateRef('imageRef')
const isCropping = computed(() => tool.value === 'crop')
const cropRect = ref({ x: 0, y: 0, width: 0, height: 0 })
const cropRectRef = useTemplateRef('cropRectRef')
const clipGroupRef = useTemplateRef('clipGroupRef')
const cropTransformerRef = useTemplateRef('cropTransformerRef')
const showPreview = ref(false)
const previewCrop = ref<{ x: number, y: number, width: number, height: number } | null>(null)
const originImage = ref(null)

async function initCropScene() {
  tool.value = 'crop'
  await nextTick()
  scaleX.value = 0.9
  scaleY.value = 0.9
  const left = dimensions.value.x - dimensions.value.offsetX * scaleX.value
  const top = dimensions.value.y - dimensions.value.offsetY * scaleY.value
  const drawnW = dimensions.value.width * Math.abs(scaleX.value)
  const drawnH = dimensions.value.height * Math.abs(scaleY.value)
  const margin = 24
  cropRect.value = {
    x: left + margin,
    y: top + margin,
    width: drawnW - margin * 2,
    height: drawnH - margin * 2,
  }
  const imageNode = imageRef.value.getNode()
  const abspos = imageNode.absolutePosition()
  const ratio = imageNode.width() / (imageNode.cropWidth() || 1)
  const originWidth = ratio * imageNode.image().width
  const originHeight = ratio * imageNode.image().height
  const cropX = imageNode.cropX() * ratio
  const cropY = imageNode.cropY() * ratio
  originImage.value = imageNode.clone({
    cropX: 0,
    cropY: 0,
    cropWidth: 0,
    cropHeight: 0,
    width: originWidth,
    height: originHeight,
    draggable: false,
  })

  clipGroupRef.value.getNode().add(imageNode.clone({
    x: -margin,
    y: -margin,
    width: drawnW,
    height: drawnH,
    offsetX: 0,
    offsetY: 0,
  }))
  // adjust position
  // Object.assign(cropRect.value, { x: -cropX, y: -cropY })
  // const pos = cropRectRef.value.getNode().absolutePosition()
  // cropGroup.value.absolutePosition = { ...pos }
  // Object.assign(cropRect.value, { x: cropX, y: cropY })

  nextTick(() => {
    const node = cropRectRef.value!.getNode()
    cropTransformerRef.value!.getNode().nodes([node])
  })
}

function imageDragBoundFunc(pos: { x: number, y: number }) {
  const drawnW = dimensions.value.width * Math.abs(scaleX.value)
  const drawnH = dimensions.value.height * Math.abs(scaleY.value)
  const offsetXScaled = dimensions.value.offsetX * scaleX.value
  const offsetYScaled = dimensions.value.offsetY * scaleY.value
  const left = pos.x - offsetXScaled
  const top = pos.y - offsetYScaled
  const right = left + drawnW
  const bottom = top + drawnH
  let x = pos.x
  let y = pos.y
  if (left > cropRect.value.x) x = cropRect.value.x + offsetXScaled
  if (top > cropRect.value.y) y = cropRect.value.y + offsetYScaled
  if (right < cropRect.value.x + cropRect.value.width) x = cropRect.value.x + cropRect.value.width - drawnW + offsetXScaled
  if (bottom < cropRect.value.y + cropRect.value.height) y = cropRect.value.y + cropRect.value.height - drawnH + offsetYScaled
  return { x, y }
}

function handleImageDragEnd(e: KonvaEventObject<MouseEvent>) {
  // dimensions.value.x = e.target.x()
  // dimensions.value.y = e.target.y()
}

function handleCropWheel(e: WheelEvent) {
  if (!isCropping.value) return
  e.preventDefault()
  const delta = e.deltaY < 0 ? SCALE_STEP : -SCALE_STEP
  const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scaleX.value + delta))
  scaleX.value = next
  scaleY.value = next
}

function handleCropTransformEnd() {
  // updateCropPreview()
}

function handleCropDragEnd() {
  // updateCropPreview()
}

// #region rotation and reflection
function handleRotate() {
  rotation.value = (rotation.value - 90) % 360
}

function handleReflectHorizontal() {
  scaleX.value = scaleX.value * -1
}
function handleReflectVertical() {
  scaleY.value = scaleY.value * -1
}

function createRectangle() {
  const centerX = containerWidth / 2
  const centerY = containerHeight / 2
  const offset = rectangles.value.length * 20

  // Calculate position with offset, ensuring it stays within image boundaries
  const x = Math.min(centerX - 50 + offset, containerWidth - 100)
  const y = Math.min(centerY - 50 + offset, containerHeight - 100)

  const newRect = {
    id: `rect-${rectangles.value.length + 1}`,
    name: 'rect',
    x,
    y,
    width: 100,
    height: 100,
    stroke: DEFAULT_STROKE_COLOR,
    strokeWidth: DEFAULT_STROKE_WIDTH,
    rotation: 0,
    fill: '',
  }
  rectangles.value.push(newRect)

  nextTick(() => {
    // Auto-select the newly created rectangle
    selectedIds.value = [newRect.id]
  })
}

function createCircle() {
  const centerX = containerWidth / 2
  const centerY = containerHeight / 2
  const offset = circles.value.length * 20

  // Calculate position with offset, ensuring it stays within image boundaries
  const x = Math.min(centerX + offset, containerWidth - 50)
  const y = Math.min(centerY + offset, containerHeight - 50)

  const newCircle = {
    id: `circle-${circles.value.length + 1}`,
    name: 'circle',
    x,
    y,
    radius: 50, // 50px radius for 100px diameter circle
    stroke: DEFAULT_STROKE_COLOR,
    strokeWidth: DEFAULT_STROKE_WIDTH,
    rotation: 0,
    fill: '',
  }
  circles.value.push(newCircle)

  nextTick(() => {
    // Auto-select the newly created circle
    selectedIds.value = [newCircle.id]
  })
}

function createText() {
  const centerX = containerWidth / 2
  const centerY = containerHeight / 2
  const offset = texts.value.length * 20

  // Calculate position with offset, ensuring it stays within image boundaries
  const x = Math.min(centerX - 50 + offset, containerWidth - 100)
  const y = Math.min(centerY - 50 + offset, containerHeight - 100)

  const newText = {
    id: `text-${texts.value.length + 1}`,
    name: 'text',
    x,
    y,
    text: 'text',
    fontSize: 24,
    fontFamily: 'Arial',
    fill: DEFAULT_STROKE_COLOR,
    rotation: 0,
  }
  texts.value.push(newText)
}

function getClientRect(rect: RectConfig) {
  return {
    x: rect.x || 0,
    y: rect.y || 0,
    width: rect.width || 0,
    height: rect.height || 0,
  }
}

// #endregion rotation and reflection

function handleZoomIn() {
  const newScale = scaleX.value + SCALE_STEP
  if (newScale <= MAX_SCALE) {
    scaleX.value = newScale
    scaleY.value = newScale
  }
}
function handleZoomOut() {
  const newScale = scaleX.value - SCALE_STEP
  if (newScale >= MIN_SCALE) {
    scaleX.value = newScale
    scaleY.value = newScale
  }
}
const selectionRectangle = ref({
  visible: false,
  x1: 0,
  y1: 0,
  x2: 0,
  y2: 0,
})
function handleMouseDown(e: KonvaEventObject<MouseEvent>) {
  const stage = e.target.getStage()
  console.log(e.target.name())
  if (tool.value === 'select') {
    // Do nothing if we mousedown on any shape
    if (e.target !== stage && !e.target.hasName('background-image')) {
      return
    }
    // Start selection rectangle
    isSelecting.value = true
    const pos = stage!.getPointerPosition()!
    selectionRectangle.value = {
      visible: true,
      x1: pos.x,
      y1: pos.y,
      x2: pos.x,
      y2: pos.y,
    }
  }
}
function handleMouseMove(e: KonvaEventObject<MouseEvent>) {
  // do nothing if we didn't start selection
  if (!isSelecting.value) {
    return
  }

  const pos = e.target.getStage()!.getPointerPosition()!
  selectionRectangle.value.x2 = pos.x
  selectionRectangle.value.y2 = pos.y
}
function handleMouseUp() {
  // do nothing if we didn't start selection
  if (!isSelecting.value) {
    return
  }

  isSelecting.value = false

  // update visibility in timeout, so we can check it in click event
  setTimeout(() => {
    selectionRectangle.value.visible = false
  })

  const selBox = {
    x: Math.min(selectionRectangle.value.x1, selectionRectangle.value.x2),
    y: Math.min(selectionRectangle.value.y1, selectionRectangle.value.y2),
    width: Math.abs(selectionRectangle.value.x2 - selectionRectangle.value.x1),
    height: Math.abs(selectionRectangle.value.y2 - selectionRectangle.value.y1),
  }

  const selectedRects = rectangles.value.filter((rect) => {
    // Check if rectangle intersects with selection box
    return Util.haveIntersection(selBox, getClientRect(rect))
  })

  const selectedCircles = circles.value.filter((circle) => {
    // Check if circle intersects with selection box
    // For circles, we need to check if the circle's bounding box intersects with selection box
    const circleBox = {
      x: circle.x || 0 - circle.radius! || 0,
      y: circle.y || 0 - circle.radius! || 0,
      width: circle.radius || 0 * 2,
      height: circle.radius || 0 * 2,
    }
    return Util.haveIntersection(selBox, circleBox)
  })

  selectedIds.value = [
    ...selectedRects.map(rect => rect.id!),
    ...selectedCircles.map(circle => circle.id!),
  ]
}

// Update transformer nodes when selection changes
watch(selectedIds, (newValue) => {
  if (!transformerRef.value) return

  if (newValue.length > 0) {
    const nodes = selectedIds.value.map((id) => {
      // Check if it's a rectangle
      const rectNode = rectRefs.value.find(ref => ref.getNode().attrs.id === id)?.getNode()
      if (rectNode) return rectNode

      // Check if it's a circle
      const circleNode = circleRefs.value.find(ref => ref.getNode().attrs.id === id)?.getNode()
      if (circleNode) return circleNode

      // Check if it's a text
      const textNode = textRefs.value.find(ref => ref.getNode().attrs.id === id)?.getNode()
      if (textNode) return textNode

      return null
    }).filter(Boolean)

    transformerRef.value.getNode().nodes(nodes)
    // Calculate toolbar position after a small delay to ensure transformer is updated
    setTimeout(() => {
      updateToolbarPosition()
    }, 0)
  } else {
    // Clear selection
    transformerRef.value.getNode().nodes([])
    toolbarPosition.value = { x: 0, y: 0, visible: false }
  }
})

// Function to update toolbar position based on transformer bounding box
function updateToolbarPosition() {
  if (!transformerRef.value || !stageRef.value) return
  const transformer = transformerRef.value
  const stage = stageRef.value

  // Get the bounding box of the transformer in stage coordinates
  const box = transformer.getNode().getClientRect({ relativeTo: stage })

  if (!box) return
  // Calculate position below the transformer
  // Account for stage scale and position
  const toolbarX = box.x + box.width / 2 // Center horizontally
  const toolbarY = box.y + box.height + 10 // 10px below the transformer

  toolbarPosition.value = {
    x: toolbarX,
    y: toolbarY,
    visible: selectedIds.value.length > 0,
  }
}

// Toolbar current properties states
const currentFillColor = ref<string | null>(DEFAULT_STROKE_COLOR)
const currentStrokeColor = ref<string | null>(DEFAULT_STROKE_COLOR)
const currentStrokeWidth = ref<number | null>(DEFAULT_STROKE_WIDTH)

// Helper function to update current properties based on first selected shape
function updateCurrentPropertiesFromSelection(ids: string[]) {
  if (ids.length === 0) return

  const firstId = ids[0]
  const rect = rectangles.value.find(r => r.id === firstId)
  const circle = circles.value.find(c => c.id === firstId)
  const line = lines.value.find(l => l.id === firstId)
  const arrow = arrows.value.find(a => a.id === firstId)
  const text = texts.value.find(t => t.id === firstId)

  if (rect) {
    currentStrokeColor.value = rect.strokeColor || DEFAULT_STROKE_COLOR
    currentStrokeWidth.value = rect.strokeWidth || DEFAULT_STROKE_WIDTH
    currentFillColor.value = rect.fill as string || null
  } else if (circle) {
    currentStrokeColor.value = circle.strokeColor || DEFAULT_STROKE_COLOR
    currentStrokeWidth.value = circle.strokeWidth || DEFAULT_STROKE_WIDTH
    currentFillColor.value = circle.fill as string || null
  } else if (line) {
    currentStrokeColor.value = line.strokeColor || DEFAULT_STROKE_COLOR
    currentStrokeWidth.value = line.strokeWidth || DEFAULT_STROKE_WIDTH
    currentFillColor.value = null // Lines don't have fill
  } else if (arrow) {
    currentStrokeColor.value = arrow.strokeColor || DEFAULT_STROKE_COLOR
    currentStrokeWidth.value = arrow.strokeWidth || DEFAULT_STROKE_WIDTH
    currentFillColor.value = null // Arrows don't have fill
  } else if (text) {
    currentFillColor.value = text.fill as string || DEFAULT_STROKE_COLOR // Text uses fill for color
    currentStrokeColor.value = null // Text doesn't have stroke
    currentStrokeWidth.value = null
  }
}

function handleStageClick(e: KonvaEventObject<MouseEvent>) {
  // if we are selecting with rect, do nothing
  if (selectionRectangle.value.visible
    || e.target.hasName('background-image')) return

  // if click on empty area - remove all selections
  if (e.target === e.target.getStage()) {
    selectedIds.value = []
    return
  }

  // Check if clicked on any selectable shape (line, circle, rect, arrow, or text)
  const isSelectableShape
    = e.target.hasName('rect')
      || e.target.hasName('line')
      || e.target.hasName('arrow')
      || e.target.hasName('circle')
      || e.target.hasName('text')

  if (!isSelectableShape) return

  const clickedId = e.target.attrs.id

  // do we pressed shift or ctrl?
  const metaPressed = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey
  const isSelected = selectedIds.value.includes(clickedId)

  if (!metaPressed && !isSelected) {
    // if no key pressed and the node is not selected
    // select just one
    selectedIds.value = [clickedId]
  } else if (metaPressed && isSelected) {
    // if we pressed keys and node was selected
    // we need to remove it from selection:
    selectedIds.value = selectedIds.value.filter(id => id !== clickedId)
  } else if (metaPressed && !isSelected) {
    // add the node into selection
    selectedIds.value = [...selectedIds.value, clickedId]
  }
  updateCurrentPropertiesFromSelection(selectedIds.value)
}

const openToolbarFillColor = ref(false)
const openToolbarStrokeSettings = ref(false)
function handleOpenToolbarFillColor() {
  // Get the fill color of the first selected object
  const firstSelectedId = selectedIds.value[0]
  if (firstSelectedId) {
    const selectedRect = rectangles.value.find(r => r.id === firstSelectedId)
    const selectedCircle = circles.value.find(c => c.id === firstSelectedId)

    if (selectedRect) {
      currentFillColor.value = selectedRect.fill as string || null
    } else if (selectedCircle) {
      currentFillColor.value = selectedCircle.fill as string || null
    }
  }
  openToolbarFillColor.value = true
}
const fillColors = [
  { label: '赤', color: '#E52E3E' },
  { label: '青', color: '#1362EC' },
  { label: '緑', color: '#35C918' },
  { label: '黄', color: '#EDE52B' },
  { label: '黒', color: '#000000' },
  {
    label: '白',
    color: '#fff',
    style: { border: `1px solid #ccc` },
  },
]

function handleDragStart() {
  toolbarPosition.value.visible = false
  openToolbarFillColor.value = false
  openToolbarStrokeSettings.value = false
}

function handleDragEnd(e: KonvaEventObject<MouseEvent>, index: number) {
  Object.assign(rectangles.value[index]!, {
    x: e.target.x(),
    y: e.target.y(),
  })

  // Update toolbar position after drag
  setTimeout(() => {
    updateToolbarPosition()
  }, 0)
}

function handleTransformEnd(e: KonvaEventObject<Event>, index: number) {
  const node = rectRefs.value[index]!.getNode()
  const scaleX = node.scaleX()
  const scaleY = node.scaleY()

  node.scaleX(1)
  node.scaleY(1)

  Object.assign(rectangles.value[index]!, {
    x: node.x(),
    y: node.y(),
    width: Math.max(5, node.width() * scaleX),
    height: Math.max(node.height() * scaleY),
    rotation: node.rotation(),
  })
}

function handleCircleDragEnd(e: KonvaEventObject<MouseEvent>, index: number) {
  Object.assign(circles.value[index]!, {
    x: e.target.x(),
    y: e.target.y(),
  })

  // Update toolbar position after drag
  setTimeout(() => {
    updateToolbarPosition()
  }, 0)
}

function handleCircleTransformEnd(e: KonvaEventObject<Event>, index: number) {
  const node = circleRefs.value[index]!.getNode()!
  const scaleX = node.scaleX()
  const scaleY = node.scaleY()

  node.scaleX(1)
  node.scaleY(1)

  Object.assign(circles.value[index]!, {
    x: node.x(),
    y: node.y(),
    rotation: node.rotation(),
    scaleX,
    scaleY,
  })
}

// Handle fill color change for selected objects
function handleFillColorChange(colorValue: string) {
  selectedIds.value.forEach((id) => {
    // Update rectangles
    const rect = rectangles.value.find(r => r.id === id)
    if (rect) {
      if (rect.strokeWidth === 1) {
        rect.strokeColor = colorValue
        // If any selected object has strokeWidth of 1, update stroke color too
        currentStrokeColor.value = colorValue
      }
      rect.fill = colorValue
    }

    // Update circles
    const circle = circles.value.find(c => c.id === id)
    if (circle) {
      if (circle.strokeWidth === 1) {
        circle.strokeColor = colorValue
        // If any selected object has strokeWidth of 1, update stroke color too
        currentStrokeColor.value = colorValue
      }
      circle.fill = colorValue
    }

    // Lines don't typically have fill, but we could update stroke color if needed
    // setLines((prevLines) =>
    //   prevLines.map((line) =>
    //     line.id === id ? { ...line, strokeColor: colorValue } : line
    //   )
    // );

    // Update text fill color
    const text = texts.value.find(t => t.id === id)
    if (text) {
      text.fill = colorValue
    }
  })

  // Update current fill color
  currentFillColor.value = colorValue
}

defineExpose({ loadImage })
</script>

<template>
  <div>
    <!-- image container -->
    <div class="stage relative mx-auto grid h-[472px] w-[649px] place-items-center">
      <template v-if="image">
        <v-stage
          ref="stageRef"
          :width="containerWidth" :height="containerHeight"
          :style="{ cursor: cursorStyle }"
          :draggable="tool === null"
          @mousedown="handleMouseDown"
          @mousemove="handleMouseMove"
          @mouseup="handleMouseUp"
          @click="handleStageClick"
          @wheel="handleCropWheel"
        >
          <v-layer>
            <v-image
              ref="imageRef"
              name="background-image" :config="{
                image,
                x: dimensions.x,
                y: dimensions.y,
                offsetX: dimensions.offsetX,
                offsetY: dimensions.offsetY,
                width: dimensions.width,
                height: dimensions.height,
                rotation,
                scaleX,
                scaleY,
                draggable: tool === 'crop' && scaleX > 1,
                dragBoundFunc: imageDragBoundFunc,
              }"
              @dragend="handleImageDragEnd"
            />
            <v-group v-if="tool === 'crop'">
              <v-rect :config="{ x: 0, y: 0, width: containerWidth, height: containerHeight, fill: 'rgba(0,0,0,0.4)' }" />
              <!-- <v-rect :config="{ x: 0, y: 0, width: containerWidth, height: cropRect.y, fill: 'rgba(0,0,0,0.4)' }" />
              <v-rect :config="{ x: 0, y: cropRect.y, width: cropRect.x, height: cropRect.height, fill: 'rgba(0,0,0,0.4)' }" />
              <v-rect :config="{ x: cropRect.x + cropRect.width, y: cropRect.y, width: containerWidth - (cropRect.x + cropRect.width), height: cropRect.height, fill: 'rgba(0,0,0,0.4)' }" />
              <v-rect :config="{ x: 0, y: cropRect.y + cropRect.height, width: containerWidth, height: containerHeight - (cropRect.y + cropRect.height), fill: 'rgba(0,0,0,0.4)' }" /> -->
              <v-group ref="clipGroupRef" :config="{ ...cropRect }" />
              <v-rect
                ref="cropRectRef"
                :config="{ ...cropRect, stroke: '#fff', strokeWidth: 2, draggable: true }"
                @dragend="handleCropDragEnd"
                @transformend="handleCropTransformEnd"
              />
              <v-transformer
                ref="cropTransformerRef"
                :config="{ flipEnabled: false,
                           keepRatio: false,
                           rotateEnabled: false }"
              />
            </v-group>
            <v-rect
              v-for="(rect, i) in rectangles"
              :key="i"
              ref="rectRefs"
              :config="{
                ...rect,
                draggable: tool === 'select',
              }"
              @mouseover="cursorStyle = 'pointer'"
              @mouseout="cursorStyle = 'default'"
              @dragstart="handleDragStart"
              @dragend="handleDragEnd($event, i)"
              @transformend="handleTransformEnd($event, i)"
            />
            <v-circle
              v-for="(circle, i) in circles"
              :key="i"
              ref="circleRefs"
              :config="{
                ...circle,
                draggable: tool === 'select',
              }"
              @mouseover="cursorStyle = 'pointer'"
              @mouseout="cursorStyle = 'default'"
              @dragstart="handleDragStart"
              @dragend="handleCircleDragEnd($event, i)"
              @transformend="handleCircleTransformEnd($event, i)"
            />
            <Text
              v-for="(text, i) in texts"
              :key="i"
              :index="i"
              :text="text"
              :tool="tool"
              @dragstart="handleDragStart"
              @update-toolbar-position="updateToolbarPosition"
            />
            <v-transformer
              ref="transformerRef"
              :config="{
                boundBoxFunc: (oldBox: Box, newBox: Box) => {
                  // limit resize
                  if (newBox.width < 5 || newBox.height < 5) {
                    return oldBox;
                  }
                  return newBox;
                },
              }"
            />
            <v-rect
              v-if="selectionRectangle.visible"
              :config="{
                x: Math.min(selectionRectangle.x1, selectionRectangle.x2),
                y: Math.min(selectionRectangle.y1, selectionRectangle.y2),
                width: Math.abs(selectionRectangle.x2 - selectionRectangle.x1),
                height: Math.abs(selectionRectangle.y2 - selectionRectangle.y1),
                fill: 'rgba(0,0,255,0.5)',
              }"
            />
          </v-layer>
        </v-stage>
        <!-- item toolbar -->
        <div v-if="toolbarPosition.visible" class="absolute flex -translate-x-1/2 gap-2 bg-abg p-3" :style="{ left: `${toolbarPosition.x}px`, top: `${toolbarPosition.y}px` }">
          <Dropdown>
            <button class="btn btn-icon btn-text" @click="handleOpenToolbarFillColor">
              <div v-if="currentFillColor" class="size-6 rounded-full border border-elevated" :style="{ background: currentFillColor }" />
              <Icon v-else name="ph:checkerboard-duotone" />
            </button>
            <template #popover="{ toggleShow }">
              <div class="flex gap-2 p-3">
                <button
                  v-for="item in fillColors" :key="item.label" class="grid size-6 place-items-center rounded-full border border-elevated" :style="{ background: item.color, ...item.style }"
                  @click="() => { handleFillColorChange(item.color);toggleShow() }"
                >
                  <Icon v-if="currentFillColor === item.color" class="text-sm text-primary" name="ph:check-fat-fill" />
                </button>
              </div>
            </template>
          </Dropdown>
        </div>
        <!-- edit image toolbar -->
        <div class="absolute top-0 -right-4 flex translate-x-full flex-col rounded-sm border border-elevated">
          <button class="btn btn-icon btn-text" @click="handleRotate">
            <Icon name="lucide:rotate-ccw" />
          </button>
          <button class="btn btn-icon btn-text" :class="{ 'btn-active': scaleX === -1 }" @click="handleReflectHorizontal">
            <Icon name="lucide:flip-horizontal" />
          </button>
          <button class="btn btn-icon btn-text" :class="{ 'btn-active': scaleY === -1 }" @click="handleReflectVertical">
            <Icon name="lucide:flip-vertical" />
          </button>
          <button class="btn btn-icon btn-text" @click="handleZoomIn">
            <Icon name="ph:magnifying-glass-plus-bold" />
          </button>
          <button class="btn btn-icon btn-text" @click="handleZoomOut">
            <Icon name="ph:magnifying-glass-minus-bold" />
          </button>
        </div>
      </template>
      <div v-else>
        Select an image
      </div>
    </div>
    <!-- toolbar -->
    <div class="mt-4 flex justify-center gap-2">
      <button
        v-for="item in toolbarButtons" :key="item.label" class="btn btn-icon btn-text"
        :class="{ 'btn-active': item.value === tool }" :title="item.label"
        @click="item.onClick"
      >
        <Icon :name="item.icon" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.stage {
  background-image: url('~/assets/img/checkerboard-tiled.png');
}

.btn-active {
  background-color: var(--color-slate-100);
}

.dark {
  .btn-active {
    background-color: var(--color-slate-800);
  }
}
</style>
