<script setup lang="ts">
// import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { Shape, ShapeConfig } from 'konva/lib/Shape'
import type { ArrowConfig } from 'konva/lib/shapes/Arrow'
import type { CircleConfig } from 'konva/lib/shapes/Circle'
import type { RectConfig } from 'konva/lib/shapes/Rect'
import type { Box, Transformer } from 'konva/lib/shapes/Transformer'
import { Util } from 'konva/lib/Util'
import Dropdown from '@/components/Dropdown.vue'
import Line from '~/components/konva/Line.vue'
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
const { cursorStyle, texts, textRefs, selectedIds, lines, lineRefs } = storeToRefs(editImageStore)
const imageDimensions = ref({
  width: 0,
  height: 0,
})
const image = ref<HTMLImageElement>()
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
const ASPECT_RATIOS = {
  ORIGINAL: 1,
  FOUR_TO_THREE: 4 / 3,
} as const
const cropAspectRatio = ref<ValueOf<typeof ASPECT_RATIOS>>(ASPECT_RATIOS.ORIGINAL)
const toolbarPosition = ref({
  x: 0,
  y: 0,
  visible: false,
})
const rectRefs = ref<Transformer[]>([])
const circleRefs = ref<Transformer[]>([])
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
  { label: 'Line', value: 'line', onClick: createLine, icon: 'ph:line-vertical-bold' },
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
const initCropRect = { x: 0, y: 0, width: 0, height: 0 }
const cropRect = ref(initCropRect)
const cropAspectRatioOptions = [
  { label: 'Original', value: ASPECT_RATIOS.ORIGINAL },
  { label: '4:3', value: ASPECT_RATIOS.FOUR_TO_THREE },
]
const cropRectRef = useTemplateRef('cropRectRef')
const cropTransformerRef = useTemplateRef('cropTransformerRef')
const originalScaleX = ref(1)
const originalScaleY = ref(1)
const originalDimensions = ref<{ width: number, height: number, x: number, y: number, offsetX: number, offsetY: number } | null>(null)

function zoom(shape: Shape, shapeConfig: ShapeConfig | undefined, scaleBy: number, zoomOut: boolean = true) {
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

  // zoom(stageRef.value!.getNode(), stageConfig.value, targetScale)

  cropRect.value = calculateCropRectFromAspectRatio()

  const node = cropRectRef.value!.getNode()
  cropTransformerRef.value!.getNode().nodes([node])

  // Initialize background rectangle to cover viewport after next tick
  layerImageBackRef.value.getNode()?.absolutePosition({ x: 0, y: 0 })
  // centerCropRectInViewport()
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
  const stage = layerNode.getStage()
  if (!stage) return newBox

  // Get the actual bounding box of the transformed image relative to the stage
  const imageBox = imageNode.getClientRect({ relativeTo: stage })
  if (!imageBox) return newBox

  // Image bounds (accounting for current layer position)
  const imageLeft = imageBox.x
  const imageTop = imageBox.y
  const imageRight = imageBox.x + imageBox.width
  const imageBottom = imageBox.y + imageBox.height

  // Minimum size constraint
  const MIN_SIZE = 50
  if (newBox.width < MIN_SIZE || newBox.height < MIN_SIZE) {
    return oldBox
  }

  // Constrain the box to stay within image bounds
  // If box goes outside bounds, adjust position and/or size

  // Constrain left edge
  if (newBox.x < imageLeft) {
    const overflow = imageLeft - newBox.x
    newBox.x = imageLeft
    newBox.width = Math.max(MIN_SIZE, newBox.width - overflow)
  }

  // Constrain top edge
  if (newBox.y < imageTop) {
    const overflow = imageTop - newBox.y
    newBox.y = imageTop
    newBox.height = Math.max(MIN_SIZE, newBox.height - overflow)
  }

  // Constrain right edge
  if (newBox.x + newBox.width > imageRight) {
    newBox.width = Math.max(MIN_SIZE, imageRight - newBox.x)
  }

  // Constrain bottom edge
  if (newBox.y + newBox.height > imageBottom) {
    newBox.height = Math.max(MIN_SIZE, imageBottom - newBox.y)
  }

  // Re-validate after constraints to ensure consistency
  // Re-check left edge (might have changed after right edge constraint)
  if (newBox.x < imageLeft) {
    const overflow = imageLeft - newBox.x
    newBox.x = imageLeft
    newBox.width = Math.max(MIN_SIZE, newBox.width - overflow)
  }

  // Re-check top edge (might have changed after bottom edge constraint)
  if (newBox.y < imageTop) {
    const overflow = imageTop - newBox.y
    newBox.y = imageTop
    newBox.height = Math.max(MIN_SIZE, newBox.height - overflow)
  }

  // Re-check right edge (might have changed after left edge constraint)
  if (newBox.x + newBox.width > imageRight) {
    newBox.width = Math.max(MIN_SIZE, imageRight - newBox.x)
  }

  // Re-check bottom edge (might have changed after top edge constraint)
  if (newBox.y + newBox.height > imageBottom) {
    newBox.height = Math.max(MIN_SIZE, imageBottom - newBox.y)
  }

  // Final validation: ensure box meets minimum size
  // If size is too small, return oldBox
  if (newBox.width < MIN_SIZE || newBox.height < MIN_SIZE) {
    return oldBox
  }

  // Ensure box is within bounds (final check)
  // If still outside, clamp it to bounds
  newBox.x = Math.max(imageLeft, Math.min(imageRight - MIN_SIZE, newBox.x))
  newBox.y = Math.max(imageTop, Math.min(imageBottom - MIN_SIZE, newBox.y))
  newBox.width = Math.min(newBox.width, imageRight - newBox.x)
  newBox.height = Math.min(newBox.height, imageBottom - newBox.y)

  return newBox
}

function handleCropAspectRatioChange(e: Event) {
  const value = Number((e.target as HTMLSelectElement).value) as ValueOf<typeof ASPECT_RATIOS>
  if (cropAspectRatio.value === value) return

  cropAspectRatio.value = value

  // Get current crop rect dimensions
  const currentWidth = cropRect.value.width
  const currentHeight = cropRect.value.height
  if (currentWidth === 0 || currentHeight === 0) {
    // If no current crop rect, use default calculation
    cropRect.value = calculateCropRectFromAspectRatio()
    const cropNode = cropRectRef.value!.getNode()
    cropNode.position({ x: cropRect.value.x, y: cropRect.value.y })
    cropNode.width(cropRect.value.width)
    cropNode.height(cropRect.value.height)
    centerCropRectInViewport()
    return
  }

  // Get image bounds to ensure crop rect stays within image
  if (!imageRef.value || !layerImageRef.value) {
    const newCropRect = calculateCropRectFromAspectRatio()
    cropRect.value = newCropRect
    const cropNode = cropRectRef.value!.getNode()
    cropNode.position({ x: newCropRect.x, y: newCropRect.y })
    cropNode.width(newCropRect.width)
    cropNode.height(newCropRect.height)
    centerCropRectInViewport()
    return
  }

  const imageNode = imageRef.value.getNode()
  const layerNode = layerImageRef.value.getNode()
  const stage = layerNode.getStage()
  if (!stage) {
    const newCropRect = calculateCropRectFromAspectRatio()
    cropRect.value = newCropRect
    const cropNode = cropRectRef.value!.getNode()
    cropNode.position({ x: newCropRect.x, y: newCropRect.y })
    cropNode.width(newCropRect.width)
    cropNode.height(newCropRect.height)
    centerCropRectInViewport()
    return
  }

  const imageBox = imageNode.getClientRect({ relativeTo: stage })
  if (!imageBox) {
    const newCropRect = calculateCropRectFromAspectRatio()
    cropRect.value = newCropRect
    const cropNode = cropRectRef.value!.getNode()
    cropNode.position({ x: newCropRect.x, y: newCropRect.y })
    cropNode.width(newCropRect.width)
    cropNode.height(newCropRect.height)
    centerCropRectInViewport()
    return
  }

  // Calculate target aspect ratio
  let targetAspectRatio
  if (value === ASPECT_RATIOS.ORIGINAL) {
    targetAspectRatio = imageBox.width / imageBox.height
  } else if (value === ASPECT_RATIOS.FOUR_TO_THREE) {
    targetAspectRatio = 4 / 3
  } else {
    // Default fallback
    const newCropRect = calculateCropRectFromAspectRatio()
    cropRect.value = newCropRect
    const cropNode = cropRectRef.value!.getNode()
    cropNode.position({ x: newCropRect.x, y: newCropRect.y })
    cropNode.width(newCropRect.width)
    cropNode.height(newCropRect.height)
    centerCropRectInViewport()
    return
  }

  const MIN_SIZE = 50
  const imageLeft = imageBox.x
  const imageTop = imageBox.y
  const imageRight = imageBox.x + imageBox.width
  const imageBottom = imageBox.y + imageBox.height

  // Keep current width, calculate new height based on aspect ratio
  let newWidth = currentWidth
  let newHeight = currentWidth / targetAspectRatio

  // Ensure minimum size
  if (newWidth < MIN_SIZE) {
    newWidth = MIN_SIZE
    newHeight = newWidth / targetAspectRatio
  }
  if (newHeight < MIN_SIZE) {
    newHeight = MIN_SIZE
    // If height is clamped to minimum, adjust width to maintain aspect ratio
    newWidth = newHeight * targetAspectRatio
  }

  // Keep current x position, adjust y position to keep vertical center aligned
  let newX = cropRect.value.x
  const previousVerticalCenter = cropRect.value.y + currentHeight / 2
  let newY = previousVerticalCenter - newHeight / 2

  // Ensure crop rect fits within image bounds
  // First, ensure width fits (clamp x position if needed)
  if (newX < imageLeft) {
    newX = imageLeft
  }
  if (newX + newWidth > imageRight) {
    newX = imageRight - newWidth
    // If we can't fit the width, we need to reduce both width and height
    if (newX < imageLeft) {
      // Width is too large, scale down to fit
      newWidth = imageRight - imageLeft
      newHeight = newWidth / targetAspectRatio
      newX = imageLeft
      // Recalculate y position with new height
      newY = previousVerticalCenter - newHeight / 2
    }
  }

  // Ensure height fits within image bounds
  if (newY < imageTop) {
    newY = imageTop
  }
  if (newY + newHeight > imageBottom) {
    newY = imageBottom - newHeight
    // If we can't fit the height, reduce both width and height proportionally
    if (newY < imageTop) {
      // Height is too large, scale down to fit
      newHeight = imageBottom - imageTop
      newWidth = newHeight * targetAspectRatio
      newY = imageTop
      // Recalculate x position with new width
      const previousHorizontalCenter = cropRect.value.x + currentWidth / 2
      newX = previousHorizontalCenter - newWidth / 2
      // Ensure x still fits
      if (newX < imageLeft) {
        newX = imageLeft
      }
      if (newX + newWidth > imageRight) {
        newX = imageRight - newWidth
      }
    }
  }

  // Final validation: ensure dimensions meet minimum size
  if (newWidth < MIN_SIZE || newHeight < MIN_SIZE) {
    // Dimensions are too small, fall back to default calculation
    const newCropRect = calculateCropRectFromAspectRatio()
    cropRect.value = newCropRect
    const cropNode = cropRectRef.value!.getNode()
    cropNode.position({ x: newCropRect.x, y: newCropRect.y })
    cropNode.width(newCropRect.width)
    cropNode.height(newCropRect.height)
    centerCropRectInViewport()
    return
  }

  // Update crop rect
  cropRect.value = {
    x: newX,
    y: newY,
    width: newWidth,
    height: newHeight,
  }

  const cropNode = cropRectRef.value!.getNode()
  cropNode.position({ x: newX, y: newY })
  cropNode.width(newWidth)
  cropNode.height(newHeight)
  centerCropRectInViewport()
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
  const stage = layerNode.getStage()

  // Calculate what the new scale would be
  const scaleBy = 1.05
  const zoomOut = e.evt.deltaY > 0
  const newScale = zoomOut ? currentScale * scaleBy : currentScale / scaleBy
  // Only zoom if the new scale would be >= MIN_SCALE
  if (newScale < MIN_SCALE) {
    return
  }

  // Store current crop rect position and size (stage coordinates - should stay the same)
  const currentCropX = cropRect.value.x
  const currentCropY = cropRect.value.y
  const currentCropWidth = cropRect.value.width
  const currentCropHeight = cropRect.value.height

  // Apply zoom to the layer
  zoom(layerNode, undefined, scaleBy, zoomOut)

  // After zoom, get new image bounds (use nextTick to ensure zoom is applied)
  nextTick(() => {
    // Get new image bounds after zoom
    const newImageBox = imageNode.getClientRect({ relativeTo: stage })
    if (!newImageBox) return

    // Maintain crop rect position and size relative to stage (keep x, y, width, height the same)
    // The crop rect represents a fixed area on the screen/viewport
    let newCropX = currentCropX
    let newCropY = currentCropY
    let newCropWidth = currentCropWidth
    let newCropHeight = currentCropHeight

    // Ensure crop rect stays within image bounds
    const minCropWidth = 50
    const minCropHeight = 50

    // Ensure minimum size
    if (newCropWidth < minCropWidth) {
      newCropWidth = minCropWidth
    }
    if (newCropHeight < minCropHeight) {
      newCropHeight = minCropHeight
    }

    // Clamp position to stay within image bounds
    if (newCropX < newImageBox.x) {
      newCropX = newImageBox.x
    }
    if (newCropY < newImageBox.y) {
      newCropY = newImageBox.y
    }
    if (newCropX + newCropWidth > newImageBox.x + newImageBox.width) {
      newCropX = newImageBox.x + newImageBox.width - newCropWidth
      // If we had to adjust X, ensure it's still within bounds
      if (newCropX < newImageBox.x) {
        newCropX = newImageBox.x
        newCropWidth = Math.min(newCropWidth, newImageBox.width)
      }
    }
    if (newCropY + newCropHeight > newImageBox.y + newImageBox.height) {
      newCropY = newImageBox.y + newImageBox.height - newCropHeight
      // If we had to adjust Y, ensure it's still within bounds
      if (newCropY < newImageBox.y) {
        newCropY = newImageBox.y
        newCropHeight = Math.min(newCropHeight, newImageBox.height)
      }
    }

    // Final bounds check for width and height
    if (newCropX + newCropWidth > newImageBox.x + newImageBox.width) {
      newCropWidth = newImageBox.x + newImageBox.width - newCropX
    }
    if (newCropY + newCropHeight > newImageBox.y + newImageBox.height) {
      newCropHeight = newImageBox.y + newImageBox.height - newCropY
    }

    // Ensure minimum size after bounds adjustment
    if (newCropWidth < minCropWidth || newCropHeight < minCropHeight) {
      // If size is too small, don't update (keep current crop rect)
      return
    }

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
      node.x(newCropX)
      node.y(newCropY)
      node.width(newCropWidth)
      node.height(newCropHeight)
    }

    // Update background rectangle to cover stage viewport
    layerImageBackRef.value.getNode()?.absolutePosition({ x: 0, y: 0 })
  })
}

/**
 * Center the crop rect in the viewport and move the image layer with it
 * This ensures the crop rect stays aligned with the image when centered
 */
function centerCropRectInViewport() {
  if (cropRect.value.width === 0 || cropRect.value.height === 0) {
    return
  }

  if (!cropRectRef.value || !layerImageRef.value) {
    return
  }
  const cropRectNode = cropRectRef.value.getNode()

  const stage = layerImageRef.value.getStage()
  if (!stage) return

  // Calculate the center of the viewport (stage)
  const viewportCenterX = containerWidth / 2
  const viewportCenterY = containerHeight / 2

  // Get current crop rect position and size
  const currentCropX = cropRectNode.x()
  const currentCropY = cropRectNode.y()
  const cropWidth = cropRectNode.width()
  const cropHeight = cropRectNode.height()

  // Calculate where the crop rect center should be
  const cropCenterX = currentCropX + cropWidth / 2
  const cropCenterY = currentCropY + cropHeight / 2

  // Calculate how much we need to move the crop rect to center it
  const deltaX = viewportCenterX - cropCenterX
  const deltaY = viewportCenterY - cropCenterY

  // Calculate new crop rect position (centered)
  const newCropX = currentCropX + deltaX
  const newCropY = currentCropY + deltaY

  // Get current layer position
  const layerNode = layerImageRef.value.getNode()
  const currentLayerX = layerNode.x()
  const currentLayerY = layerNode.y()

  // Move the layer by the same amount so the image moves with the crop rect
  const newLayerX = currentLayerX + deltaX
  const newLayerY = currentLayerY + deltaY

  // Update crop rect position
  Object.assign(cropRect.value, {
    x: newCropX,
    y: newCropY,
  })

  // Update layer position (this moves the image along with it)
  layerNode.position({ x: newLayerX, y: newLayerY })

  // Update the crop rect node position
  cropRectNode.position({ x: newCropX, y: newCropY })
  layerImageBackRef.value?.getNode().setAbsolutePosition({ x: 0, y: 0 })
}

/**
 * Handle crop rect transform end
 * Updates crop rect size and position after user finishes resizing
 */
function handleCropTransformEnd(e: KonvaEventObject<MouseEvent>) {
  const node = e.target
  const scaleX = node.scaleX()
  const scaleY = node.scaleY()

  // Reset scale and calculate new dimensions
  node.scaleX(1)
  node.scaleY(1)

  const MIN_SIZE = 50
  const newWidth = Math.max(MIN_SIZE, node.width() * scaleX)
  const newHeight = Math.max(MIN_SIZE, node.height() * scaleY)

  // Get actual current image bounds from the rendered node
  // This accounts for layer position changes when image is dragged
  if (!imageRef.value || !layerImageRef.value) {
    return
  }

  const imageNode = imageRef.value.getNode()
  const layerNode = layerImageRef.value.getNode()
  const stage = layerNode.getStage()

  if (!stage) return

  // Get the actual bounding box of the transformed image relative to the stage
  const imageBox = imageNode.getClientRect({ relativeTo: stage })

  if (!imageBox) return

  // Extract image bounds
  const imageLeft = imageBox.x
  const imageTop = imageBox.y
  const imageRight = imageBox.x + imageBox.width
  const imageBottom = imageBox.y + imageBox.height

  // Get current crop rect position
  let newX = node.x()
  let newY = node.y()

  // Constrain position to keep crop rect within image bounds
  if (newX < imageLeft) {
    newX = imageLeft
  }
  if (newY < imageTop) {
    newY = imageTop
  }
  if (newX + newWidth > imageRight) {
    newX = Math.max(imageLeft, imageRight - newWidth)
  }
  if (newY + newHeight > imageBottom) {
    newY = Math.max(imageTop, imageBottom - newHeight)
  }

  // Ensure width and height fit within bounds
  const finalWidth = Math.min(newWidth, imageRight - newX)
  const finalHeight = Math.min(newHeight, imageBottom - newY)

  // Update crop rect state
  Object.assign(cropRect.value, {
    x: newX,
    y: newY,
    width: finalWidth,
    height: finalHeight,
  })

  // Update node position and size
  node.position({ x: newX, y: newY })
  node.width(finalWidth)
  node.height(finalHeight)

  // Center crop rect in viewport
  centerCropRectInViewport()
}

function calculateCropRectFromAspectRatio() {
  if (!imageRef.value || !layerImageRef.value) {
    // Fallback to calculated bounds if nodes aren't available yet
    const cropWidth = imageConfig.value.width * Math.abs(scaleX.value)
    const cropHeight = imageConfig.value.height * Math.abs(scaleY.value)
    const cropX = imageConfig.value.x - imageConfig.value.offsetX * Math.abs(scaleX.value)
    const cropY = imageConfig.value.y - imageConfig.value.offsetY * Math.abs(scaleY.value)

    return {
      x: cropX,
      y: cropY,
      width: cropWidth,
      height: cropHeight,
    }
  }

  const imageNode = imageRef.value.getNode()
  const layerNode = layerImageRef.value.getNode()
  const stage = layerNode.getStage()

  if (!stage) {
    // Fallback to calculated bounds
    const cropWidth = imageConfig.value.width * Math.abs(scaleX.value)
    const cropHeight = imageConfig.value.height * Math.abs(scaleY.value)
    const cropX = imageConfig.value.x - imageConfig.value.offsetX * Math.abs(scaleX.value)
    const cropY = imageConfig.value.y - imageConfig.value.offsetY * Math.abs(scaleY.value)

    return {
      x: cropX,
      y: cropY,
      width: cropWidth,
      height: cropHeight,
    }
  }

  // Get the actual bounding box of the transformed image relative to the stage
  // This accounts for rotation, scale, and layer position
  const imageBox = imageNode.getClientRect({ relativeTo: stage })

  if (!imageBox) {
    // Fallback to calculated bounds
    const cropWidth = imageConfig.value.width * Math.abs(scaleX.value)
    const cropHeight = imageConfig.value.height * Math.abs(scaleY.value)
    const cropX = imageConfig.value.x - imageConfig.value.offsetX * Math.abs(scaleX.value)
    const cropY = imageConfig.value.y - imageConfig.value.offsetY * Math.abs(scaleY.value)

    return {
      x: cropX,
      y: cropY,
      width: cropWidth,
      height: cropHeight,
    }
  }

  // Calculate aspect ratio based on cropAspectRatio setting
  let targetAspectRatio
  if (cropAspectRatio.value === ASPECT_RATIOS.ORIGINAL) {
    // Use image's original aspect ratio
    targetAspectRatio = imageBox.width / imageBox.height
  } else if (cropAspectRatio.value === ASPECT_RATIOS.FOUR_TO_THREE) {
    // Use 4:3 aspect ratio
    targetAspectRatio = 4 / 3
  } else {
    // Default to image's aspect ratio if unknown
    targetAspectRatio = imageBox.width / imageBox.height
  }

  // Calculate crop rect dimensions that fit within image bounds while maintaining aspect ratio
  const imageAspectRatio = imageBox.width / imageBox.height
  let cropWidth, cropHeight

  if (targetAspectRatio > imageAspectRatio) {
    // Target is wider - fit to image width
    cropWidth = imageBox.width
    cropHeight = imageBox.width / targetAspectRatio
  } else {
    // Target is taller - fit to image height
    cropHeight = imageBox.height
    cropWidth = imageBox.height * targetAspectRatio
  }

  // Ensure minimum size
  const MIN_SIZE = 50
  if (cropWidth < MIN_SIZE) {
    cropWidth = MIN_SIZE
    cropHeight = MIN_SIZE / targetAspectRatio
  }
  if (cropHeight < MIN_SIZE) {
    cropHeight = MIN_SIZE
    cropWidth = MIN_SIZE * targetAspectRatio
  }

  // Center the crop rect within image bounds
  const cropX = imageBox.x + (imageBox.width - cropWidth) / 2
  const cropY = imageBox.y + (imageBox.height - cropHeight) / 2

  return {
    x: cropX,
    y: cropY,
    width: cropWidth,
    height: cropHeight,
  }
}

function applyCrop() {
  const stage = stageRef.value.getNode()

  // Get the image node and layer node
  const imageNode = imageRef.value.getNode()
  const layerNode = layerImageRef.value.getNode()

  // Get the image node's scale (for flips)
  const imageScaleX = imageNode.scaleX()
  const imageScaleY = imageNode.scaleY()

  // Get the actual image bounds in stage coordinates
  const imageBox = imageNode.getClientRect({ relativeTo: stage })
  if (!imageBox) return

  // Calculate crop area relative to the displayed image
  // The crop rect is already in stage coordinates
  const cropX = cropRect.value.x
  const cropY = cropRect.value.y
  const cropWidth = cropRect.value.width
  const cropHeight = cropRect.value.height

  // Calculate the crop area relative to the image's displayed bounds
  const relativeCropX = cropX - imageBox.x
  const relativeCropY = cropY - imageBox.y
  const relativeCropWidth = cropWidth
  const relativeCropHeight = cropHeight

  // Ensure crop area is within image bounds
  const clampedX = clamp(imageBox.width, 0, relativeCropX)
  const clampedY = clamp(imageBox.height, 0, relativeCropY)
  const clampedWidth = clamp(imageBox.width - clampedX, 1, relativeCropWidth)
  const clampedHeight = clamp(imageBox.height - clampedY, 1, relativeCropHeight)

  // Create a canvas to crop the image
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) return

  // Get the actual image element
  const img = new Image()
  img.crossOrigin = 'anonymous'

  img.onload = () => {
    // Calculate the actual crop coordinates on the original image
    // Scale from displayed size to original image size
    const scaleX = img.width / imageBox.width
    const scaleY = img.height / imageBox.height

    // Calculate crop coordinates in original image space
    let actualCropX = clampedX * scaleX
    let actualCropY = clampedY * scaleY
    const actualCropWidth = clampedWidth * scaleX
    const actualCropHeight = clampedHeight * scaleY

    // Account for image flips when mapping coordinates
    // When image is flipped horizontally (scaleX < 0):
    // - The left side of the displayed image corresponds to the right side of the original
    // - So we need to mirror the X coordinate
    if (imageScaleX < 0) {
      actualCropX = img.width - actualCropX - actualCropWidth
    }

    // When image is flipped vertically (scaleY < 0):
    // - The top of the displayed image corresponds to the bottom of the original
    // - So we need to mirror the Y coordinate
    if (imageScaleY < 0) {
      actualCropY = img.height - actualCropY - actualCropHeight
    }

    // Ensure coordinates are valid
    actualCropX = clamp(img.width - actualCropWidth, 0, actualCropX)
    actualCropY = clamp(img.height - actualCropHeight, 0, actualCropY)

    // Set canvas size to cropped dimensions
    canvas.width = actualCropWidth
    canvas.height = actualCropHeight

    // Draw the cropped portion from the original image
    // The coordinates are already mapped correctly to account for flips
    ctx.drawImage(
      img,
      actualCropX,
      actualCropY,
      actualCropWidth,
      actualCropHeight,
      0,
      0,
      actualCropWidth,
      actualCropHeight,
    )

    // Create a new HTML Image element to get dimensions
    canvas.toBlob((blob) => {
      if (!blob) return
      const newImageUrl = URL.createObjectURL(blob)

      // Create a new HTML Image element to get dimensions
      const newImg = new Image()
      newImg.crossOrigin = 'anonymous'
      newImg.onload = () => {
      // Update image dimensions
        imageDimensions.value = {
          width: newImg.width,
          height: newImg.height,
        }

        // Recalculate dimensions to fit viewport
        const newImageAspectRatio = newImg.width / newImg.height
        const containerAspectRatio = containerWidth / containerHeight

        let scaledWidth, scaledHeight
        if (newImageAspectRatio > containerAspectRatio) {
        // Image is wider than container
          scaledWidth = containerWidth
          scaledHeight = containerWidth / newImageAspectRatio
        } else {
        // Image is taller than container
          scaledHeight = containerHeight
          scaledWidth = containerHeight * newImageAspectRatio
        }

        // Calculate center position
        const centerX = containerWidth / 2
        const centerY = containerHeight / 2

        // Update dimensions state - this will update URLImage component props
        imageConfig.value = {
          width: scaledWidth,
          height: scaledHeight,
          x: centerX,
          y: centerY,
          offsetX: scaledWidth / 2,
          offsetY: scaledHeight / 2,
        }

        // Reset stage to center and fit viewport
        stageConfig.value = {
          width: containerWidth,
          height: containerHeight,
          scaleX: 1,
          scaleY: 1,
        }

        // Reset layer position
        layerNode.position({ x: 0, y: 0 })
        layerNode.scale({ x: 1, y: 1 })

        // Update the image with the cropped version
        image.value!.src = newImageUrl

        // Exit crop mode
        cropRect.value = initCropRect
        tool.value = 'select'
      }
      newImg.src = newImageUrl
    }, 'image/png')
  }
  img.src = image.value?.src || ''
}

function cancelCrop() {
  // Exit crop mode immediately to stop any ongoing animations or callbacks
  tool.value = 'select'

  // Reset crop rectangle to initial state
  cropRect.value = initCropRect

  // Preserve current scale values instead of restoring saved ones
  // This ensures that if the image was flipped and then cropped (which resets scale),
  // entering crop mode again and canceling won't accidentally reset the flip state
  // Get current scale from the image node if available, otherwise keep current state
  if (imageRef.value) {
    const imageNode = imageRef.value.getNode()
    const currentScaleX = imageNode.scaleX()
    const currentScaleY = imageNode.scaleY()
    scaleX.value = currentScaleX
    scaleY.value = currentScaleY
  }

  // Reset stage configuration
  stageConfig.value = {
    width: stageConfig.value.width,
    height: stageConfig.value.height,
    scaleX: 1,
    scaleY: 1,
  }

  // Reset stage position if needed
  const stage = stageRef.value?.getNode()
  if (stage) {
    stage.position({ x: 0, y: 0 })
  }

  // Early return if image refs are not available
  if (!imageRef.value || !layerImageRef.value) {
    originalDimensions.value = null
    return
  }

  const imageNode = imageRef.value.getNode()
  const layerNode = layerImageRef.value.getNode()

  // Reset layer position to origin
  layerNode.position({ x: 0, y: 0 })

  // Clear any crop settings on the image node
  imageNode.cropX(0)
  imageNode.cropY(0)
  imageNode.cropWidth(0)
  imageNode.cropHeight(0)

  // Restore original image dimensions and position
  if (originalDimensions.value) {
    const original = originalDimensions.value

    // Update reactive config
    imageConfig.value = {
      width: original.width,
      height: original.height,
      x: original.x,
      y: original.y,
      offsetX: original.offsetX,
      offsetY: original.offsetY,
    }

    // Update Konva node properties
    imageNode.x(original.x)
    imageNode.y(original.y)
    imageNode.offsetX(original.offsetX)
    imageNode.offsetY(original.offsetY)
    imageNode.width(original.width)
    imageNode.height(original.height)
  }

  // Force redraw of the layer
  layerNode.batchDraw()

  // Clean up stored original dimensions
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

function createLine() {
  const centerX = containerWidth / 2
  const centerY = containerHeight / 2
  const offset = lines.value.length * 20
  const lineLength = 200 // Default line length in pixels

  // Calculate start and end points with offset, ensuring 200px length and visibility
  const startX = Math.max(50, Math.min(centerX - lineLength / 2 + offset, containerWidth - lineLength - 50))
  const startY = Math.max(50, Math.min(centerY + offset, containerHeight - 50))
  const endX = startX + lineLength
  const endY = startY

  const newLine = {
    id: `line-${lines.value.length + 1}`,
    name: 'line',
    points: [startX, startY, endX, endY],
    stroke: DEFAULT_STROKE_COLOR,
    strokeColor: DEFAULT_STROKE_COLOR,
    strokeWidth: DEFAULT_STROKE_WIDTH,
    rotation: 0,
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    hitStrokeWidth: HIT_STROKE_WIDTH_LINE,
  }
  lines.value.push(newLine)

  nextTick(() => {
    // Auto-select the newly created line
    selectedIds.value = [newLine.id]
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
    const rectNode = rectRefs.value.find(ref => ref.getNode().attrs.id === rect.id)?.getNode()
    if (!rectNode) return false
    const rectBox = rectNode.getClientRect()
    return Util.haveIntersection(selBox, rectBox)
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

  const selectedLines = lines.value.filter((line) => {
    const lineNode = lineRefs.value.find(ref => ref.getNode().attrs.id === line.id)?.getNode()
    if (!lineNode) return false
    const lineBox = lineNode.getClientRect()
    return Util.haveIntersection(selBox, lineBox)
  })

  const selectedTexts = texts.value.filter((text) => {
    // Check if text intersects with selection box
    const textNode = textRefs.value.find(ref => ref.getNode().attrs.id === text.id)?.getNode()
    if (!textNode) return false
    const textBox = textNode.getClientRect()
    return Util.haveIntersection(selBox, textBox)
  })

  selectedIds.value = [
    ...selectedRects.map(rect => rect.id!),
    ...selectedCircles.map(circle => circle.id!),
    ...selectedLines.map(line => line.id!),
    ...selectedTexts.map(text => text.id!),
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

      // Check if it's a line
      const lineNode = lineRefs.value.find(ref => ref.getNode().attrs.id === id)?.getNode()
      if (lineNode) return lineNode

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
                  hitStrokeWidth: HIT_STROKE_WIDTH_LINE,
                }"
                @mouseover="cursorStyle = 'pointer'"
                @mouseout="cursorStyle = 'default'"
                @dragstart="handleDragStart"
                @dragend="handleCircleDragEnd($event, i)"
                @transformend="handleCircleTransformEnd($event, i)"
              />
              <Line
                v-for="(line, i) in lines" :key="i"
                :index="i"
                :line="line"
                :tool
                @dragstart="handleDragStart"
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
              />

              <!-- Corner handles -->
              <v-transformer
                ref="cropTransformerRef"
                :config="{
                  flipEnabled: false,
                  keepRatio: true,
                  rotateEnabled: false,
                  boundBoxFunc: cropBoundBoxFunc,
                }"
                @transformend="handleCropTransformEnd"
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
      <select :model-value="cropAspectRatio" @change="handleCropAspectRatioChange">
        <option
          v-for="item in cropAspectRatioOptions" :key="item.value"
          :value="item.value"
          class="btn btn-text w-full justify-start"
        >
          {{ item.label }}
        </option>
      </select>
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
