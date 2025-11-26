<script setup lang="ts">
// import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { Shape, ShapeConfig } from 'konva/lib/Shape'
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
const MIN_SCALE = 1
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

const imageConfig = ref({
  width: 0,
  height: 0,
  x: 0,
  y: 0,
  offsetX: 0,
  offsetY: 0,
})
watch(image, (newImage) => {
  if (newImage) {
    imageConfig.value = calculateDimensions()
  }
})

const DEFAULT_STROKE_COLOR = '#E52E3E'
const DEFAULT_STROKE_WIDTH = 2
const HIT_STROKE_WIDTH_LINE = 44 // Wider hit area for lines/arrows
const HIT_PADDING_SHAPE = 22 // Padding for circles/rectangles
const isSelecting = ref(false)
const stageRef = useTemplateRef('stageRef')
const transformerRef = useTemplateRef('transformerRef')
const layerImageRef = useTemplateRef('layerImageRef')
const layerImageBackRef = useTemplateRef('layerImageBackRef')
const groupImageRef = useTemplateRef('groupImageRef')
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

const stageConfig = ref({
  width: containerWidth,
  height: containerHeight,
  scaleX: 1,
  scaleY: 1,
})
const imageRef = useTemplateRef('imageRef')
const isCropping = computed(() => tool.value === 'crop')
const cropRect = ref({ x: 0, y: 0, width: 0, height: 0 })
const cropRectRef = useTemplateRef('cropRectRef')
const cropTransformerRef = useTemplateRef('cropTransformerRef')
const originalScaleX = ref(1)
const originalScaleY = ref(1)
const originalDimensions = ref<{ width: number, height: number, x: number, y: number, offsetX: number, offsetY: number } | null>(null)

function zoom(shape: Shape, shapeConfig: ShapeConfig | undefined, scaleBy: number, zoomOut: boolean = true) {
  console.log('zoom', toRaw(shape), toRaw(shapeConfig), scaleBy)
  const oldScale = shape.scaleX()

  const center = {
    x: shape.width() / 2,
    y: shape.height() / 2,
  }

  const relatedTo = {
    x: (center.x - shape.x()) / oldScale,
    y: (center.y - shape.y()) / oldScale,
  }

  const newScale = zoomOut ? oldScale * scaleBy : oldScale / scaleBy
  // const newScale
  //   = e.evt.deltaY > 0 ? oldScale * scaleBy : oldScale / scaleBy

  shape.scale({
    x: newScale,
    y: newScale,
  })

  const newPos = {
    x: center.x - relatedTo.x * newScale,
    y: center.y - relatedTo.y * newScale,
  }

  shape.position(newPos)
  // shape.batchDraw()

  if (shapeConfig)
    Object.assign(shapeConfig, {
      scaleX: newScale,
      scaleY: newScale,
      x: newPos.x,
      y: newPos.y,
    })
  return {
    scaleX: newScale,
    scaleY: newScale,
    x: newPos.x,
    y: newPos.y,
  }
}
async function initCropScene() {
  tool.value = 'crop'

  // Store original scale and dimensions before any changes
  originalScaleX.value = scaleX.value
  originalScaleY.value = scaleY.value
  originalDimensions.value = {
    width: imageConfig.value.width,
    height: imageConfig.value.height,
    x: imageConfig.value.x,
    y: imageConfig.value.y,
    offsetX: imageConfig.value.offsetX,
    offsetY: imageConfig.value.offsetY,
  }

  await nextTick()

  // Calculate target scale based on border width
  // Crop rect border width is 2px (stroke centered, extends 1px outward on each side)
  // So we shrink by 1px on each side (2px total)
  const borderWidth = 2
  const shrinkAmount = borderWidth * 2

  const drawnW = imageConfig.value.width * Math.abs(scaleX.value)
  const drawnH = imageConfig.value.height * Math.abs(scaleY.value)

  // Calculate scale factor to shrink by exactly the border width
  const targetScaleX = Math.max(0.1, (drawnW - shrinkAmount) / drawnW)
  const targetScaleY = Math.max(0.1, (drawnH - shrinkAmount) / drawnH)

  // Use the smaller scale to maintain aspect ratio
  const targetScale = Math.min(targetScaleX, targetScaleY)

  zoom(stageRef.value!.getNode(), stageConfig.value, targetScale)

  // Initialize crop rect to cover the entire image boundary
  const left = imageConfig.value.x - imageConfig.value.offsetX * scaleX.value
  const top = imageConfig.value.y - imageConfig.value.offsetY * scaleY.value

  cropRect.value = {
    x: left,
    y: top,
    width: drawnW,
    height: drawnH,
  }

  const node = cropRectRef.value!.getNode()
  cropTransformerRef.value!.getNode().nodes([node])

  // Initialize background rectangle to cover viewport after next tick
  nextTick(() => {
    updateBackgroundRectangle()
  })
}

function updateBackgroundRectangle() {
  if (!layerImageBackRef.value || !layerImageRef.value) return

  const backRectNode = layerImageBackRef.value.getNode()
  const layerNode = layerImageRef.value.getNode()
  const layerScaleX = layerNode.scaleX()
  const layerScaleY = layerNode.scaleY()

  // Ensure we don't divide by zero or negative values
  const safeScaleX = Math.abs(layerScaleX) || 1
  const safeScaleY = Math.abs(layerScaleY) || 1

  // Scale inversely to maintain viewport coverage
  backRectNode.width(stageConfig.value.width * safeScaleX)
  backRectNode.height(stageConfig.value.height * safeScaleY)
  backRectNode.absolutePosition({ x: 0, y: 0 })
}

function imageDragBoundFunc(pos: { x: number, y: number }) {
  if (!isCropping.value || !imageRef.value || !layerImageRef.value) return pos

  const imageNode = imageRef.value.getNode()
  const layerNode = layerImageRef.value.getNode()

  // Get effective scale: layer scale * image scale (since image is inside layer)
  const effectiveScaleX = layerNode.scaleX() * imageNode.scaleX()
  const effectiveScaleY = layerNode.scaleY() * imageNode.scaleY()

  const drawnW = imageConfig.value.width * Math.abs(effectiveScaleX)
  const drawnH = imageConfig.value.height * Math.abs(effectiveScaleY)
  const offsetXScaled = imageNode.offsetX() * effectiveScaleX
  const offsetYScaled = imageNode.offsetY() * effectiveScaleY
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

function handleLayerDragBound(pos: { x: number, y: number }) {
  if (!isCropping.value || !imageRef.value || !layerImageRef.value) return pos

  // When Layer is dragged, everything inside moves with it
  const imageNode = imageRef.value.getNode()
  const layerNode = layerImageRef.value.getNode()
  const stage = layerNode.getStage()
  if (!stage) return pos

  // Get current layer position
  const currentLayerX = layerNode.x()
  const currentLayerY = layerNode.y()

  // Calculate the delta from current position to proposed position
  const deltaX = pos.x - currentLayerX
  const deltaY = pos.y - currentLayerY

  // Get current image bounds in stage coordinates
  const currentImageBox = imageNode.getClientRect({ relativeTo: stage })
  if (!currentImageBox) return pos

  // Calculate what the image bounds would be at the new layer position
  const imageLeft = currentImageBox.x + deltaX
  const imageTop = currentImageBox.y + deltaY
  const imageRight = imageLeft + currentImageBox.width
  const imageBottom = imageTop + currentImageBox.height

  // Constraints: image must cover crop rect
  // imageLeft <= cropRect.x
  // imageRight >= cropRect.x + cropRect.width
  // imageTop <= cropRect.y
  // imageBottom >= cropRect.y + cropRect.height

  let constrainedX = pos.x
  let constrainedY = pos.y

  // Adjust X if needed
  if (imageLeft > cropRect.value.x) {
    // Image is too far right, need to move layer left
    const adjustX = cropRect.value.x - imageLeft
    constrainedX = pos.x + adjustX
  } else if (imageRight < cropRect.value.x + cropRect.value.width) {
    // Image is too far left, need to move layer right
    const adjustX = (cropRect.value.x + cropRect.value.width) - imageRight
    constrainedX = pos.x + adjustX
  }

  // Adjust Y if needed
  if (imageTop > cropRect.value.y) {
    // Image is too far down, need to move layer up
    const adjustY = cropRect.value.y - imageTop
    constrainedY = pos.y + adjustY
  } else if (imageBottom < cropRect.value.y + cropRect.value.height) {
    // Image is too far up, need to move layer down
    const adjustY = (cropRect.value.y + cropRect.value.height) - imageBottom
    constrainedY = pos.y + adjustY
  }

  return {
    x: constrainedX,
    y: constrainedY,
  }
}

function cropBoundBoxFunc(oldBox: Box, newBox: Box) {
  if (!imageRef.value || !layerImageRef.value) return newBox

  const imageNode = imageRef.value.getNode()
  const layerNode = layerImageRef.value.getNode()

  // Get effective scale: layer scale * image scale (since image is inside layer)
  const effectiveScaleX = layerNode.scaleX() * imageNode.scaleX()
  const effectiveScaleY = layerNode.scaleY() * imageNode.scaleY()

  const drawnW = imageConfig.value.width * Math.abs(effectiveScaleX)
  const drawnH = imageConfig.value.height * Math.abs(effectiveScaleY)
  const left = imageConfig.value.x - imageNode.offsetX() * effectiveScaleX
  const top = imageConfig.value.y - imageNode.offsetY() * effectiveScaleY
  const right = left + drawnW
  const bottom = top + drawnH

  // Constrain to image bounds
  if (newBox.x < left) {
    newBox.width += newBox.x - left
    newBox.x = left
  }
  if (newBox.y < top) {
    newBox.height += newBox.y - top
    newBox.y = top
  }
  if (newBox.x + newBox.width > right) {
    newBox.width = right - newBox.x
  }
  if (newBox.y + newBox.height > bottom) {
    newBox.height = bottom - newBox.y
  }

  // Minimum size
  if (newBox.width < 50 || newBox.height < 50) {
    return oldBox
  }

  return newBox
}

function handleImageDragStart(e: KonvaEventObject<MouseEvent>) {
  e.target.stopDrag()
  e.target.getLayer()?.startDrag()
}

function handleCropWheel(e: KonvaEventObject<WheelEvent>) {
  e.evt.preventDefault()
  if (!isCropping.value || !layerImageRef.value || !imageRef.value) return

  // Get current scale of the layer
  const layerNode = layerImageRef.value.getNode()
  const imageNode = imageRef.value.getNode()
  const currentScale = layerNode.scaleX()

  // Calculate what the new scale would be
  const scaleBy = 1.05
  const zoomOut = e.evt.deltaY > 0
  const newScale = zoomOut ? currentScale * scaleBy : currentScale / scaleBy
  console.log('newScale', newScale)
  // Only zoom if the new scale would be >= MIN_SCALE
  if (newScale < MIN_SCALE) {
    return
  }

  // Get current image bounds before zoom
  const oldEffectiveScaleX = layerNode.scaleX() * imageNode.scaleX()
  const oldEffectiveScaleY = layerNode.scaleY() * imageNode.scaleY()
  const oldImageLeft = imageConfig.value.x - imageNode.offsetX() * oldEffectiveScaleX
  const oldImageTop = imageConfig.value.y - imageNode.offsetY() * oldEffectiveScaleY
  const oldImageWidth = imageConfig.value.width * Math.abs(oldEffectiveScaleX)
  const oldImageHeight = imageConfig.value.height * Math.abs(oldEffectiveScaleY)

  // Calculate relative position of crop rect within image (0-1 range)
  const relativeX = (cropRect.value.x - oldImageLeft) / oldImageWidth
  const relativeY = (cropRect.value.y - oldImageTop) / oldImageHeight
  const relativeWidth = cropRect.value.width / oldImageWidth
  const relativeHeight = cropRect.value.height / oldImageHeight

  // Apply zoom
  zoom(layerNode, undefined, scaleBy, zoomOut)

  // After zoom, get new image bounds (use nextTick to ensure zoom is applied)
  nextTick(() => {
    const newEffectiveScaleX = layerNode.scaleX() * imageNode.scaleX()
    const newEffectiveScaleY = layerNode.scaleY() * imageNode.scaleY()
    const newImageLeft = imageConfig.value.x - imageNode.offsetX() * newEffectiveScaleX
    const newImageTop = imageConfig.value.y - imageNode.offsetY() * newEffectiveScaleY
    const newImageWidth = imageConfig.value.width * Math.abs(newEffectiveScaleX)
    const newImageHeight = imageConfig.value.height * Math.abs(newEffectiveScaleY)

    // Calculate new crop rect position maintaining relative position
    let newCropX = newImageLeft + relativeX * newImageWidth
    let newCropY = newImageTop + relativeY * newImageHeight
    let newCropWidth = relativeWidth * newImageWidth
    let newCropHeight = relativeHeight * newImageHeight

    // Ensure crop rect stays within image bounds
    const minCropWidth = 50
    const minCropHeight = 50

    // Clamp position
    newCropX = Math.max(newImageLeft, Math.min(newCropX, newImageLeft + newImageWidth - minCropWidth))
    newCropY = Math.max(newImageTop, Math.min(newCropY, newImageTop + newImageHeight - minCropHeight))

    // Clamp size
    newCropWidth = Math.max(minCropWidth, Math.min(newCropWidth, newImageLeft + newImageWidth - newCropX))
    newCropHeight = Math.max(minCropHeight, Math.min(newCropHeight, newImageTop + newImageHeight - newCropY))

    // Update crop rect
    cropRect.value = {
      x: newCropX,
      y: newCropY,
      width: newCropWidth,
      height: newCropHeight,
    }

    // Update the Konva node
    if (cropRectRef.value) {
      const node = cropRectRef.value.getNode()
      node.x(cropRect.value.x)
      node.y(cropRect.value.y)
      node.width(cropRect.value.width)
      node.height(cropRect.value.height)
    }

    // Update background rectangle to cover stage viewport
    updateBackgroundRectangle()
  })
}

function handleCropTransformEnd() {
  if (!cropRectRef.value) return
  console.log('handleCropTransformEnd')
  const node = cropRectRef.value.getNode()
  // Ensure cropRect is synced with node position and size
  cropRect.value = {
    x: node.x(),
    y: node.y(),
    width: node.width() * node.scaleX(),
    height: node.height() * node.scaleY(),
  }
  node.scaleX(1)
  node.scaleY(1)
  // updateCropValues()
}

function handleCropDragEnd() {
  if (!cropRectRef.value) return
  console.log('handleCropDragEnd')
  const node = cropRectRef.value.getNode()
  // Ensure cropRect is synced with node position
  cropRect.value = {
    x: node.x(),
    y: node.y(),
    width: node.width(),
    height: node.height(),
  }
  // updateCropValues()
}

function updateCropValues() {
  if (!imageRef.value || !layerImageRef.value) return

  const imageNode = imageRef.value.getNode()
  const layerNode = layerImageRef.value.getNode()
  const image = imageNode.image()

  // Get effective scale: layer scale * image scale (since image is inside layer)
  const effectiveScaleX = layerNode.scaleX() * imageNode.scaleX()
  const effectiveScaleY = layerNode.scaleY() * imageNode.scaleY()

  // Get image bounds in stage coordinates
  const imageLeft = imageConfig.value.x - imageNode.offsetX() * effectiveScaleX
  const imageTop = imageConfig.value.y - imageNode.offsetY() * effectiveScaleY
  const imageWidth = imageConfig.value.width * Math.abs(effectiveScaleX)
  const imageHeight = imageConfig.value.height * Math.abs(effectiveScaleY)

  // Calculate crop rectangle position relative to image bounds
  // Clamp crop rect to stay within image bounds
  const cropLeft = Math.max(imageLeft, Math.min(cropRect.value.x, imageLeft + imageWidth - cropRect.value.width))
  const cropTop = Math.max(imageTop, Math.min(cropRect.value.y, imageTop + imageHeight - cropRect.value.height))
  const cropWidth = Math.min(cropRect.value.width, imageLeft + imageWidth - cropLeft)
  const cropHeight = Math.min(cropRect.value.height, imageTop + imageHeight - cropTop)

  // Convert crop coordinates from stage space to image pixel space
  // First, get the relative position within the image (0-1 range)
  const relativeX = (cropLeft - imageLeft) / imageWidth
  const relativeY = (cropTop - imageTop) / imageHeight
  const relativeWidth = cropWidth / imageWidth
  const relativeHeight = cropHeight / imageHeight

  // Get the original image dimensions (accounting for any existing crop)
  const currentImageWidth = imageNode.width()
  const currentCropWidth = imageNode.cropWidth() || currentImageWidth
  const scaleRatio = currentImageWidth / currentCropWidth
  const originalImageWidth = image.width * scaleRatio
  const originalImageHeight = image.height * scaleRatio

  // Convert relative coordinates to pixel coordinates
  const pixelCropX = relativeX * originalImageWidth
  const pixelCropY = relativeY * originalImageHeight
  const pixelCropWidth = relativeWidth * originalImageWidth
  const pixelCropHeight = relativeHeight * originalImageHeight

  // Apply crop preview to image in real-time
  imageNode.cropX(pixelCropX)
  imageNode.cropY(pixelCropY)
  imageNode.cropWidth(pixelCropWidth)
  imageNode.cropHeight(pixelCropHeight)
}
// _handleCropEnd() {
//   const selectedImage = this._sceneManager.getScene(BaseScene).getSelection();
//   const image = selectedImage.image(); // dom img
//   const ratio = this._originImage.width() / image.width;
//   const cropX = this._clipRect.x() / ratio;
//   const cropY = this._clipRect.y() / ratio;
//   const width = this._clipRect.width();
//   const height = this._clipRect.height();
//   const cropWidth = (width * image.width) / this._originImage.width();
//   const cropHeight = (height * image.height) / this._originImage.height();
//   selectedImage.setAttrs({
//    width,
//    height,
//    cropX,
//    cropY,
//    cropWidth,
//    cropHeight,
//   });
//   selectedImage.absolutePosition(this._clipRect.absolutePosition());
//  }

function applyCrop() {
  if (!imageRef.value) return

  const imageNode = imageRef.value.getNode()

  // The crop is already applied in real-time via updateCropValues
  // Get the crop dimensions from the image node
  const newWidth = imageNode.cropWidth()
  const newHeight = imageNode.cropHeight()
  const aspectRatio = newWidth / newHeight
  const containerAspectRatio = containerWidth / containerHeight

  let scaledWidth, scaledHeight
  if (aspectRatio > containerAspectRatio) {
    scaledWidth = containerWidth
    scaledHeight = containerWidth / aspectRatio
  } else {
    scaledHeight = containerHeight
    scaledWidth = containerHeight * aspectRatio
  }

  // Update dimensions to fit the cropped area
  imageConfig.value = {
    width: scaledWidth,
    height: scaledHeight,
    x: containerWidth / 2,
    y: containerHeight / 2,
    offsetX: scaledWidth / 2,
    offsetY: scaledHeight / 2,
  }

  // Update image node dimensions and position
  imageNode.width(newWidth)
  imageNode.height(newHeight)
  imageNode.x(imageConfig.value.x)
  imageNode.y(imageConfig.value.y)
  imageNode.offsetX(imageConfig.value.offsetX)
  imageNode.offsetY(imageConfig.value.offsetY)

  // Reset scale
  scaleX.value = 1
  scaleY.value = 1

  // Reset stage scale
  stageConfig.value.scaleX = 1
  stageConfig.value.scaleY = 1

  // Exit crop mode
  tool.value = null
}

function cancelCrop() {
  // Exit crop mode immediately so animation callbacks stop modifying values
  tool.value = 'select'

  // Restore original scale immediately after stopping animations
  scaleX.value = originalScaleX.value
  scaleY.value = originalScaleY.value

  // Reset stage scale
  Object.assign(stageConfig.value, {
    scaleX: 1,
    scaleY: 1,
    x: 0,
    y: 0,
  })
  if (!imageRef.value) {
    // Clean up even if image refs are not available
    originalDimensions.value = null
    return
  }

  const imageNode = imageRef.value.getNode()

  // Restore original image crop settings (clear any crop that was applied)
  imageNode.cropX(0)
  imageNode.cropY(0)
  imageNode.cropWidth(0)
  imageNode.cropHeight(0)

  // Restore original dimensions and position exactly as they were before entering crop mode
  if (originalDimensions.value) {
    imageConfig.value = { ...originalDimensions.value }
    imageNode.x(originalDimensions.value.x)
    imageNode.y(originalDimensions.value.y)
    imageNode.offsetX(originalDimensions.value.offsetX)
    imageNode.offsetY(originalDimensions.value.offsetY)
    imageNode.width(originalDimensions.value.width)
    imageNode.height(originalDimensions.value.height)
  }

  // Clean up
  originalDimensions.value = null
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

function handleLayerImageDragEnd(e: KonvaEventObject<MouseEvent>) {
  layerImageBackRef.value?.getNode().setAbsolutePosition({ x: 0, y: 0 })
}

defineExpose({ loadImage })
</script>

<template>
  <div>
    <!-- image container -->
    <div class="stage relative mx-auto grid h-[472px] w-[649px] place-items-center">
      <template v-if="image">
        <v-stage
          ref="stageRef" :config="stageConfig" :style="{ cursor: cursorStyle }"
          @mousedown="handleMouseDown"
          @mousemove="handleMouseMove"
          @mouseup="handleMouseUp"
          @click="handleStageClick"
          @wheel="handleCropWheel"
        >
          <v-layer
            ref="layerImageRef" :draggable="tool === 'crop'"
            :config="{ dragBoundFunc: handleLayerDragBound }"
            @dragend="handleLayerImageDragEnd"
          >
            <v-rect v-if="tool === 'crop'" ref="layerImageBackRef" :config="{ x: 0, y: 0, width: stageConfig.width, height: stageConfig.height, fill: 'rgba(255,0,0,0.5)' }" />
            <v-group ref="groupImageRef">
              <v-image
                ref="imageRef" name="background-image"
                :config="{
                  image,
                  ...imageConfig,
                  rotation,
                  scaleX,
                  scaleY,
                  draggable: tool === 'crop',
                  dragBoundFunc: imageDragBoundFunc,
                }"
                @dragstart="handleImageDragStart"
              />
              <v-rect
                v-for="(rect, i) in rectangles" :key="i" ref="rectRefs"
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
                v-for="(circle, i) in circles" :key="i"
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
                v-for="(text, i) in texts" :key="i"
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
            </v-group>
          </v-layer>
          <v-layer v-if="tool === 'crop'">
            <v-group>
              <!-- Dark overlay with transparent crop area -->
              <v-rect :config="{ listening: false, x: 0, y: 0, width: stageConfig.width, height: cropRect.y, fill: 'rgba(0,0,0,0.5)' }" />
              <v-rect :config="{ listening: false, x: 0, y: cropRect.y, width: cropRect.x, height: cropRect.height, fill: 'rgba(0,0,0,0.5)' }" />
              <v-rect :config="{ listening: false, x: cropRect.x + cropRect.width, y: cropRect.y, width: stageConfig.width - (cropRect.x + cropRect.width), height: cropRect.height, fill: 'rgba(0,0,0,0.5)' }" />
              <v-rect :config="{ listening: false, x: 0, y: cropRect.y + cropRect.height, width: stageConfig.width, height: stageConfig.height - (cropRect.y + cropRect.height), fill: 'rgba(0,0,0,0.5)' }" />

              <!-- Crop rectangle border -->
              <v-rect
                ref="cropRectRef"
                :config="{
                  ...cropRect,
                  listening: false,
                  stroke: '#fff',
                  strokeWidth: 2,
                  fill: 'transparent',
                  draggable: false,
                }"
                @dragend="handleCropDragEnd"
                @transformend="handleCropTransformEnd"
              />

              <!-- Corner handles -->
              <v-transformer
                ref="cropTransformerRef"
                :config="{
                  flipEnabled: false,
                  keepRatio: false,
                  rotateEnabled: false,
                  centeredScaling: true,
                  boundBoxFunc: cropBoundBoxFunc,
                }"
              />
            </v-group>
          </v-layer>
        </v-stage>
        <!-- item toolbar -->
        <div
          v-if="toolbarPosition.visible"
          class="absolute flex -translate-x-1/2 gap-2 bg-abg p-3"
          :style="{ left: `${toolbarPosition.x}px`, top: `${toolbarPosition.y}px` }"
        >
          <Dropdown>
            <button
              class="btn btn-icon btn-text"
              @click="handleOpenToolbarFillColor"
            >
              <div
                v-if="currentFillColor"
                class="size-6 rounded-full border border-elevated"
                :style="{ background: currentFillColor }"
              />
              <Icon v-else name="ph:checkerboard-duotone" />
            </button>
            <template #popover="{ toggleShow }">
              <div class="flex gap-2 p-3">
                <button
                  v-for="item in fillColors" :key="item.label"
                  class="grid size-6 place-items-center rounded-full border border-elevated"
                  :style="{ background: item.color, ...item.style }"
                  @click="() => { handleFillColorChange(item.color); toggleShow() }"
                >
                  <Icon v-if="currentFillColor === item.color" class="text-sm text-primary" name="ph:check-fat-fill" />
                </button>
              </div>
            </template>
          </Dropdown>
        </div>
        <!-- edit image toolbar -->
        <div
          v-if="tool !== 'crop'"
          class="absolute top-0 -right-4 flex translate-x-full flex-col rounded-sm border border-elevated"
        >
          <button class="btn btn-icon btn-text" @click="handleRotate">
            <Icon name="lucide:rotate-ccw" />
          </button>
          <button
            class="btn btn-icon btn-text"
            :class="{ 'btn-active': scaleX === -1 }"
            @click="handleReflectHorizontal"
          >
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
        <!-- crop toolbar -->
        <div v-if="tool === 'crop'" class="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          <button class="btn btn-text" @click="cancelCrop">
            Cancel
          </button>
          <button class="btn btn-text btn-primary" @click="applyCrop">
            Apply
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
        v-for="item in toolbarButtons" :key="item.label"
        class="btn btn-icon btn-text"
        :class="{ 'btn-active': item.value === tool }"
        :title="item.label"
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
