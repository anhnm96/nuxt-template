<script setup lang="ts">
import type { KonvaEventObject } from 'konva/lib/Node'
import type { Shape, ShapeConfig } from 'konva/lib/Shape'
import type { ArrowConfig } from 'konva/lib/shapes/Arrow'
import type { CircleConfig } from 'konva/lib/shapes/Circle'
import type { LineConfig } from 'konva/lib/shapes/Line'
import type { RectConfig } from 'konva/lib/shapes/Rect'
import type { TextConfig } from 'konva/lib/shapes/Text'
import type { Box, Transformer } from 'konva/lib/shapes/Transformer'
import type { IRect } from 'konva/lib/types'
import Konva from 'konva'
import { Util } from 'konva/lib/Util'
// import type Konva from 'konva'
import { cloneDeep } from 'lodash-es'
import Dropdown from '@/components/Dropdown.vue'
import Line from '~/components/konva/Line.vue'
import Text from '~/components/konva/Text.vue'

const props = defineProps<{
  imageUrl?: string
}>()
// Container dimensions
const containerWidth = 649
const containerHeight = 472
const MIN_SCALE = ref(1)

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
    saveHistory()
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
const ROTATE_ANCHOR_OFFSET = 26
const isSelecting = ref(false)
const stageRef = useTemplateRef('stageRef')
const transformerRef = useTemplateRef('transformerRef')
const layerImageRef = useTemplateRef('layerImageRef')
const layerImageOverlayRef = useTemplateRef('layerImageOverlayRef')
const groupContainerRef = useTemplateRef('groupContainerRef')
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
    // Reset MIN_SCALE when exiting crop mode
    if (tool.value === 'crop' && newTool !== 'crop') {
      MIN_SCALE.value = 1
    }
    tool.value = newTool
  }
}

const groupMainConfig = ref({
  x: 0,
  y: 0,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
})
// Store original transform values before entering crop mode
const savedTransform = ref({
  rotation: 0,
  x: 0,
  y: 0,
  scaleX: 1,
  scaleY: 1,
})

const stageConfig = ref({
  width: containerWidth,
  height: containerHeight,
  scaleX: 1,
  scaleY: 1,
})
const imageRef = useTemplateRef('imageRef')
const groupMainRef = useTemplateRef('groupMainRef')
const isCropping = computed(() => tool.value === 'crop')
const initCropRect = { x: 0, y: 0, width: 0, height: 0 }
const cropRect = ref(initCropRect)
const cropAspectRatioOptions = [
  { label: 'Original', value: ASPECT_RATIOS.ORIGINAL },
  { label: '4:3', value: ASPECT_RATIOS.FOUR_TO_THREE },
]
const cropRectRef = useTemplateRef('cropRectRef')
const cropTransformerRef = useTemplateRef('cropTransformerRef')

function zoom(shape: Shape, shapeConfig: ShapeConfig | undefined, scaleBy: number, zoomIn: boolean = true) {
  const oldScale = shape.scaleX()

  const center = {
    x: shape.width() / 2,
    y: shape.height() / 2,
  }

  const relatedTo = {
    x: (center.x - shape.x()) / oldScale,
    y: (center.y - shape.y()) / oldScale,
  }

  const newScale = zoomIn ? oldScale * scaleBy : oldScale / scaleBy
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

const layerImagePosition = reactive({ x: 0, y: 0 })
async function initCropScene() {
  if (!layerImageRef.value) return

  tool.value = 'crop'
  groupMainConfig.value.scaleX = Math.sign(groupMainConfig.value.scaleX)
  groupMainConfig.value.scaleY = Math.sign(groupMainConfig.value.scaleY)

  // Store current transform values before resetting them
  savedTransform.value = { ...groupMainConfig.value }

  const layerNode = layerImageRef.value.getNode()
  layerNode.position({ x: 0, y: 0 })
  const groupContainer = groupContainerRef.value!.getNode()
  groupContainer.position({ x: 0, y: 0 })
  groupContainer.scale({ x: 1, y: 1 })

  await nextTick()

  // Calculate crop rect first
  cropRect.value = calculateCropRectFromAspectRatio()

  // Add padding around crop rect (3px)
  const paddingX = 3
  const paddingY = 3

  // Calculate available space in viewport (with padding)
  const availableWidth = containerWidth - paddingX * 2
  const availableHeight = containerHeight - paddingY * 2

  // Calculate scale factors needed to fit crop rect with padding
  // If crop rect is larger than available space, we need to zoom out
  const scaleXNeeded = cropRect.value.width > availableWidth
    ? availableWidth / cropRect.value.width
    : 1
  const scaleYNeeded = cropRect.value.height > availableHeight
    ? availableHeight / cropRect.value.height
    : 1

  // Use the smaller scale factor to ensure both dimensions fit
  const targetScale = Math.min(scaleXNeeded, scaleYNeeded)

  // Only zoom out if needed (targetScale < 1) and ensure it's not too small
  if (targetScale < 1) {
    const finalScale = Math.max(targetScale, 0.1) // Minimum scale of 0.1 (10%)
    MIN_SCALE.value = finalScale

    // Apply zoom to layer

    // Apply zoom centered on viewport center
    zoom(groupContainer, undefined, finalScale, true)
    Object.assign(layerImagePosition, {
      x: groupContainer.x(),
      y: groupContainer.y(),
    })

    // Recalculate crop rect after zoom (since image bounds changed)
    cropRect.value = calculateCropRectFromAspectRatio()
  }

  const node = cropRectRef.value!.getNode()
  cropTransformerRef.value!.getNode().nodes([node])

  // Initialize background rectangle to cover viewport after next tick
  resetOverlayPosition()
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
  if (!isCropping.value) return

  // Get current scale of the layer
  const layerNode = groupContainerRef.value.getNode()
  const currentScale = layerNode.scaleX()

  // Calculate what the new scale would be
  const scaleBy = 1.05
  const zoomOut = e.evt.deltaY > 0
  const newScale = zoomOut ? currentScale * scaleBy : currentScale / scaleBy
  // Only zoom if the new scale would be >= MIN_SCALE
  if (newScale < MIN_SCALE.value) {
    zoom(
      layerNode,
      undefined,
      MIN_SCALE.value / layerNode.scaleX(),
      true,
    )
    // layerNode.position({
    //   x: layerImagePosition.x,
    //   y: layerImagePosition.y,
    // })
  } else {
    zoom(layerNode, undefined, scaleBy, zoomOut)
  }
  constrainCropRectAfterZoom()
  centerCropRectInViewport()
}

function constrainCropRectAfterZoom() {
  const layerNode = layerImageRef.value!.getNode()
  const imageNode = imageRef.value!.getNode()
  const stage = layerNode.getStage()

  // After zoom, get new image bounds (use nextTick to ensure zoom is applied)
  // Get new image bounds after zoom
  const newImageBox = imageNode.getClientRect({ relativeTo: stage })
  if (!newImageBox) return

  // Store current crop rect position and size (stage coordinates - should stay the same)
  const currentCropX = cropRect.value.x
  const currentCropY = cropRect.value.y
  const currentCropWidth = cropRect.value.width
  const currentCropHeight = cropRect.value.height

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
  resetOverlayPosition()
}

function resetOverlayPosition() {
  layerImageOverlayRef.value?.getNode().setAbsolutePosition({ x: 0, y: 0 })
}

/**
 * Center the crop rect in the viewport and move the image layer with it
 * This ensures the crop rect stays aligned with the image when centered
 * @param {object} rectToCenter - Optional rect to center. If not provided, uses current cropRect state
 */
function centerCropRectInViewport(rectToCenter?: IRect) {
  const rect = rectToCenter || cropRect.value
  if (!rect || rect.width === 0 || rect.height === 0) {
    return
  }

  if (!layerImageRef.value) {
    return
  }

  const stage = layerImageRef.value.getStage()
  if (!stage) return

  // Calculate the center of the viewport (stage)
  const viewportCenterX = containerWidth / 2
  const viewportCenterY = containerHeight / 2

  // Calculate where the crop rect center currently is
  const cropCenterX = rect.x + rect.width / 2
  const cropCenterY = rect.y + rect.height / 2

  // Calculate how much we need to move the crop rect to center it
  const deltaX = viewportCenterX - cropCenterX
  const deltaY = viewportCenterY - cropCenterY

  // Calculate new crop rect position (centered)
  const newCropX = rect.x + deltaX
  const newCropY = rect.y + deltaY

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
  resetOverlayPosition()
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
  // Helper function to calculate fallback crop rect when nodes aren't available
  const calculateFallbackCropRect = () => {
    // Use imageConfig dimensions (these are the displayed image dimensions)
    const imageWidth = imageConfig.value.width
    const imageHeight = imageConfig.value.height

    // Calculate target aspect ratio
    let targetAspectRatio
    if (cropAspectRatio.value === ASPECT_RATIOS.ORIGINAL) {
      targetAspectRatio = imageWidth / imageHeight
    } else if (cropAspectRatio.value === ASPECT_RATIOS.FOUR_TO_THREE) {
      targetAspectRatio = 4 / 3
    } else {
      targetAspectRatio = imageWidth / imageHeight
    }

    // Calculate crop rect dimensions that fit within image bounds while maintaining aspect ratio
    const imageAspectRatio = imageWidth / imageHeight
    let cropWidth, cropHeight

    if (targetAspectRatio > imageAspectRatio) {
      // Target is wider - fit to image width
      cropWidth = imageWidth
      cropHeight = imageWidth / targetAspectRatio
    } else {
      // Target is taller - fit to image height
      cropHeight = imageHeight
      cropWidth = imageHeight * targetAspectRatio
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
    // imageConfig.x and y are the center of the image
    const cropX = imageConfig.value.x - cropWidth / 2
    const cropY = imageConfig.value.y - cropHeight / 2

    return {
      x: cropX,
      y: cropY,
      width: cropWidth,
      height: cropHeight,
    }
  }

  // Try to get actual image bounds from rendered nodes
  if (!imageRef.value || !layerImageRef.value) {
    return calculateFallbackCropRect()
  }

  const imageNode = imageRef.value.getNode()
  const layerNode = layerImageRef.value.getNode()
  const stage = layerNode.getStage()

  if (!stage) {
    return calculateFallbackCropRect()
  }

  // Get the actual bounding box of the transformed image relative to the stage
  // This accounts for rotation, scale, and layer position
  const imageBox = imageNode.getClientRect({ relativeTo: stage })

  if (!imageBox) {
    return calculateFallbackCropRect()
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

  // Get the groupMain node (which contains the image and all transformations)
  if (!groupMainRef.value || !layerImageRef.value) return

  cropTransformerRef.value!.getNode().nodes([])
  const groupMain = groupMainRef.value.getNode()
  const layerNode = layerImageRef.value.getNode()
  const groupContainer = groupContainerRef.value!.getNode()

  // Get the actual groupMain bounds in stage coordinates
  const groupMainBox = groupMain.getClientRect({ relativeTo: stage })
  if (!groupMainBox) return

  // Crop rect is in stage coordinates
  const cropX = cropRect.value.x
  const cropY = cropRect.value.y
  const cropWidth = cropRect.value.width
  const cropHeight = cropRect.value.height

  // Calculate crop area relative to groupMain bounds
  const relativeCropX = cropX - groupMainBox.x
  const relativeCropY = cropY - groupMainBox.y

  // Ensure crop area is within groupMain bounds
  const clampedX = clamp(relativeCropX, 0, groupMainBox.width)
  const clampedY = clamp(relativeCropY, 0, groupMainBox.height)
  const clampedWidth = clamp(cropWidth, 1, groupMainBox.width - clampedX)
  const clampedHeight = clamp(cropHeight, 1, groupMainBox.height - clampedY)

  // Round coordinates to integers to avoid subpixel rendering artifacts
  const roundedCropX = Math.floor(cropX)
  const roundedCropY = Math.floor(cropY)
  const roundedCropWidth = Math.floor(clampedWidth)
  const roundedCropHeight = Math.floor(clampedHeight)

  // Force a redraw to ensure everything is rendered
  stage.batchDraw()

  // Use stage.toDataURL to capture exactly what's visible in the crop rect
  // This ensures the crop matches exactly what the user sees, regardless of zoom/scale
  const croppedDataUrl = stage.toDataURL({
    x: roundedCropX,
    y: roundedCropY,
    width: roundedCropWidth,
    height: roundedCropHeight,
    pixelRatio: 1,
  })

  // Load the cropped image directly
  const croppedImg = new Image()
  croppedImg.crossOrigin = 'anonymous'

  croppedImg.onload = () => {
    // Create a canvas with exact dimensions matching the cropped image
    const croppedCanvas = document.createElement('canvas')
    croppedCanvas.width = croppedImg.width
    croppedCanvas.height = croppedImg.height
    const croppedCtx = croppedCanvas.getContext('2d')
    if (!croppedCtx) return

    // Draw the cropped image directly without any scaling
    croppedCtx.drawImage(croppedImg, 0, 0)

    // Trim white/transparent edges that might be from stage background
    const imageData = croppedCtx.getImageData(0, 0, croppedCanvas.width, croppedCanvas.height)
    const data = imageData.data

    // Find the actual content bounds (non-transparent, non-white pixels)
    let minX = croppedCanvas.width
    let minY = croppedCanvas.height
    let maxX = 0
    let maxY = 0

    for (let y = 0; y < croppedCanvas.height; y++) {
      for (let x = 0; x < croppedCanvas.width; x++) {
        const idx = (y * croppedCanvas.width + x) * 4
        const r = data[idx]!
        const g = data[idx + 1]!
        const b = data[idx + 2]!
        const a = data[idx + 3]!

        // Check if pixel is not transparent and not pure white (allowing some tolerance)
        const isWhite = r >= 250 && g >= 250 && b >= 250
        if (a > 10 && !isWhite) {
          minX = Math.min(minX, x)
          minY = Math.min(minY, y)
          maxX = Math.max(maxX, x)
          maxY = Math.max(maxY, y)
        }
      }
    }

    // If we found content bounds and they're different from canvas bounds, trim
    if (minX < maxX && minY < maxY && (minX > 0 || minY > 0 || maxX < croppedCanvas.width - 1 || maxY < croppedCanvas.height - 1)) {
      const trimmedWidth = maxX - minX + 1
      const trimmedHeight = maxY - minY + 1

      // Create a new canvas with trimmed dimensions
      const trimmedCanvas = document.createElement('canvas')
      trimmedCanvas.width = trimmedWidth
      trimmedCanvas.height = trimmedHeight
      const trimmedCtx = trimmedCanvas.getContext('2d')
      if (!trimmedCtx) return

      // Draw only the trimmed portion
      trimmedCtx.drawImage(
        croppedCanvas,
        minX,
        minY,
        trimmedWidth,
        trimmedHeight,
        0,
        0,
        trimmedWidth,
        trimmedHeight,
      )

      // Replace the cropped canvas with the trimmed version
      croppedCanvas.width = trimmedWidth
      croppedCanvas.height = trimmedHeight
      croppedCtx.clearRect(0, 0, croppedCanvas.width, croppedCanvas.height)
      croppedCtx.drawImage(trimmedCanvas, 0, 0)
    }

    // Convert cropped canvas to blob
    croppedCanvas.toBlob((blob) => {
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

        // Reset layer position and groupMain config
        layerNode.position({ x: 0, y: 0 })
        groupContainer.position({ x: 0, y: 0 })
        groupContainer.scale({ x: 1, y: 1 })
        groupMainConfig.value = {
          x: 0,
          y: 0,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
        }
        resetOverlayPosition()

        // Update the image with the cropped version
        image.value!.src = newImageUrl

        // Remove all shapes after cropping
        rectangles.value = []
        circles.value = []
        arrows.value = []
        lines.value = []
        texts.value = []
        selectedIds.value = []

        // Exit crop mode
        cropRect.value = initCropRect
        tool.value = 'select'
        stage.batchDraw()
      }
      newImg.src = newImageUrl
      saveHistory({ ...createHistorySnapshot(), imageSrc: newImageUrl })
    }, 'image/png')
  }

  croppedImg.src = croppedDataUrl
}

function cancelCrop() {
  // Exit crop mode immediately to stop any ongoing animations or callbacks
  tool.value = 'select'

  // Reset crop rectangle to initial state
  cropRect.value = initCropRect

  // Restore groupMain rotation and position
  Object.assign(groupMainConfig.value, savedTransform.value)

  // Reset stage configuration
  stageConfig.value = {
    width: stageConfig.value.width,
    height: stageConfig.value.height,
    scaleX: 1,
    scaleY: 1,
  }

  // Early return if image refs are not available
  if (!imageRef.value || !layerImageRef.value) {
    return
  }

  const imageNode = imageRef.value.getNode()
  const layerNode = layerImageRef.value.getNode()
  const groupContainer = groupContainerRef.value!.getNode()

  // Reset layer
  layerNode.position({ x: 0, y: 0 })

  // Reset group container
  groupContainer.position({ x: 0, y: 0 })
  groupContainer.scale({
    x: 1,
    y: 1,
  })
  Object.assign(layerImagePosition, { x: 0, y: 0 })
  MIN_SCALE.value = 1
  resetOverlayPosition()

  // Clear any crop settings on the image node
  imageNode.cropX(0)
  imageNode.cropY(0)
  imageNode.cropWidth(0)
  imageNode.cropHeight(0)

  // Force redraw of the layer
  layerNode.batchDraw()
}

/**
 * Constrain crop rect to stay within image bounds
 * Accounts for rotation and scale transformations
 */
function constrainCropRectToImageBounds(rect: IRect): IRect {
  // Try to get actual image bounds from the rendered node if available
  if (!imageRef.value || !layerImageRef.value || !groupMainRef.value) return rect
  const groupMain = groupMainRef.value.getNode()
  const stage = layerImageRef.value.getNode().getStage()

  if (!stage) return rect

  // Force a redraw to ensure rotation/scale transformations are applied
  stage.batchDraw()

  // Get the actual bounding box of the transformed group (which includes rotation)
  // The rotation is already applied to groupMain, so we just need to get its bounds
  const imageBox = groupMain.getClientRect({ relativeTo: stage })
  if (!imageBox) return rect
  const imageLeft = imageBox.x
  const imageRight = imageBox.x + imageBox.width
  const imageTop = imageBox.y
  const imageBottom = imageBox.y + imageBox.height

  // Ensure crop rect width and height don't exceed image bounds
  const maxWidth = imageRight - imageLeft
  const maxHeight = imageBottom - imageTop
  const constrainedWidth = Math.min(rect.width, maxWidth)
  const constrainedHeight = Math.min(rect.height, maxHeight)

  // Constrain position to keep crop rect within image bounds
  const constrainedX = clamp(
    imageRight - constrainedWidth,
    imageLeft,
    rect.x,
  )
  const constrainedY = clamp(
    imageBottom - constrainedHeight,
    imageTop,
    rect.y,
  )

  return {
    x: constrainedX,
    y: constrainedY,
    width: constrainedWidth,
    height: constrainedHeight,
  }
}

// Rotate a shape around any point.
// shape is a Konva shape
// angleRadians is the angle to rotate by, in radians
// point is an object {x: posX, y: posY}
function rotateAroundPoint(shape: Shape, angleDegrees: number, point: { x: number, y: number }) {
  const angleRadians = angleDegrees * Math.PI / 180 // sin + cos require radians

  const x
    = point.x
      + (shape.x() - point.x) * Math.cos(angleRadians)
      - (shape.y() - point.y) * Math.sin(angleRadians)
  const y
    = point.y
      + (shape.x() - point.x) * Math.sin(angleRadians)
      + (shape.y() - point.y) * Math.cos(angleRadians)

  const newRotation = shape.rotation() + angleDegrees
  shape.rotation(newRotation) // rotate the shape in place
  shape.x(x) // move the rotated shape in relation to the rotation point.
  shape.y(y)

  // Update config to match the actual node state
  groupMainConfig.value.rotation = newRotation
  groupMainConfig.value.x = x
  groupMainConfig.value.y = y
}
// #region rotation and reflection
function handleRotate() {
  // When rotating by 90/270 degrees, the image dimensions swap
  // So we need to swap the crop rect dimensions as well
  const newRotation = (((groupMainConfig.value.rotation - 90) % 360) + 360) % 360
  const is90or270 = newRotation === 90 || newRotation === 270

  // Swap width and height if rotating by 90 or 270 degrees
  const rectToConstrain = is90or270
    ? {
        x: cropRect.value.x,
        y: cropRect.value.y,
        width: cropRect.value.height,
        height: cropRect.value.width,
      }
    : cropRect.value

  // Scale image to fit container if needed after rotation
  if (!imageRef.value || !layerImageRef.value || !groupMainRef.value) {
    return
  }

  const groupMain = groupMainRef.value.getNode()
  const layerNode = layerImageRef.value.getNode()
  const stage = layerNode.getStage()
  if (!stage) return

  const groupContainer = groupContainerRef.value!.getNode()

  // Reset layer and container positions/scales before applying rotation
  layerNode.position({ x: 0, y: 0 })
  groupContainer.position({ x: 0, y: 0 })
  groupContainer.scale({ x: 1, y: 1 })

  // Apply rotation first
  rotateAroundPoint(groupMain, -90, { x: containerWidth / 2, y: containerHeight / 2 })

  // Force redraw to ensure rotation is applied
  stage.batchDraw()

  // Get the actual bounding box of the rotated groupMain at scale 1
  const rotatedImageBox = groupMain.getClientRect({ relativeTo: stage })

  if (!rotatedImageBox) {
    return
  }

  // Add padding around image (3px) like in initCropScene
  const paddingX = 3
  const paddingY = 3

  // Calculate available space in viewport (with padding)
  const availableWidth = containerWidth - paddingX * 2
  const availableHeight = containerHeight - paddingY * 2

  // Calculate scale factors needed to fit rotated image within container with padding
  const scaleXNeeded = rotatedImageBox.width > availableWidth
    ? availableWidth / rotatedImageBox.width
    : 1
  const scaleYNeeded = rotatedImageBox.height > availableHeight
    ? availableHeight / rotatedImageBox.height
    : 1

  // Use the smaller scale factor to ensure both dimensions fit
  const targetScale = Math.min(scaleXNeeded, scaleYNeeded)
  const finalScale = Math.max(targetScale, 0.1) // Minimum scale of 0.1 (10%)

  // Apply the calculated scale using zoom function
  zoom(groupContainer, undefined, finalScale, true)

  Object.assign(layerImagePosition, {
    x: groupContainer.x(),
    y: groupContainer.y(),
  })

  // Update MIN_SCALE if we're in crop mode
  if (isCropping.value) {
    MIN_SCALE.value = finalScale
  }

  // Force another redraw after scaling to ensure bounds are accurate
  stage.batchDraw()

  const constrainedRect = constrainCropRectToImageBounds(
    rectToConstrain,
  )

  // Update crop rect with constrained dimensions
  Object.assign(cropRect.value, constrainedRect)
  resetOverlayPosition()
}

// Reflect a shape horizontally around a point (mirror left-right)
// Accounts for rotation by transforming coordinates properly
function reflectHorizontalAroundPoint(shape: Shape, point: { x: number, y: number }) {
  const rotation = shape.rotation()
  const angleRadians = rotation * Math.PI / 180

  // Get current position relative to reflection point
  const dx = shape.x() - point.x
  const dy = shape.y() - point.y

  // Transform to local coordinate system (accounting for rotation)
  // Rotate coordinates by -rotation to align with axes
  const localX = dx * Math.cos(-angleRadians) - dy * Math.sin(-angleRadians)
  const localY = dx * Math.sin(-angleRadians) + dy * Math.cos(-angleRadians)

  // Reflect horizontally in local coordinates (negate X)
  const reflectedLocalX = -localX
  const reflectedLocalY = localY

  // Transform back to global coordinates
  const newDx = reflectedLocalX * Math.cos(angleRadians) - reflectedLocalY * Math.sin(angleRadians)
  const newDy = reflectedLocalX * Math.sin(angleRadians) + reflectedLocalY * Math.cos(angleRadians)

  const newX = point.x + newDx
  const newY = point.y + newDy

  const newScaleX = shape.scaleX() * -1
  shape.scaleX(newScaleX)
  shape.x(newX)
  shape.y(newY)

  // Update config to match the actual node state
  groupMainConfig.value.scaleX = newScaleX
  groupMainConfig.value.x = newX
  groupMainConfig.value.y = newY
}

// Reflect a shape vertically around a point (mirror top-bottom)
// Accounts for rotation by transforming coordinates properly
function reflectVerticalAroundPoint(shape: Shape, point: { x: number, y: number }) {
  const rotation = shape.rotation()
  const angleRadians = rotation * Math.PI / 180

  // Get current position relative to reflection point
  const dx = shape.x() - point.x
  const dy = shape.y() - point.y

  // Transform to local coordinate system (accounting for rotation)
  // Rotate coordinates by -rotation to align with axes
  const localX = dx * Math.cos(-angleRadians) - dy * Math.sin(-angleRadians)
  const localY = dx * Math.sin(-angleRadians) + dy * Math.cos(-angleRadians)

  // Reflect vertically in local coordinates (negate Y)
  const reflectedLocalX = localX
  const reflectedLocalY = -localY

  // Transform back to global coordinates
  const newDx = reflectedLocalX * Math.cos(angleRadians) - reflectedLocalY * Math.sin(angleRadians)
  const newDy = reflectedLocalX * Math.sin(angleRadians) + reflectedLocalY * Math.cos(angleRadians)

  const newX = point.x + newDx
  const newY = point.y + newDy

  const newScaleY = shape.scaleY() * -1
  shape.scaleY(newScaleY)
  shape.x(newX)
  shape.y(newY)

  // Update config to match the actual node state
  groupMainConfig.value.scaleY = newScaleY
  groupMainConfig.value.x = newX
  groupMainConfig.value.y = newY
}

function handleReflectHorizontal() {
  if (!groupMainRef.value) return
  const groupMain = groupMainRef.value.getNode()
  const centerPoint = { x: containerWidth / 2, y: containerHeight / 2 }
  reflectHorizontalAroundPoint(groupMain, centerPoint)
}

function handleReflectVertical() {
  if (!groupMainRef.value) return
  const groupMain = groupMainRef.value.getNode()
  const centerPoint = { x: containerWidth / 2, y: containerHeight / 2 }
  reflectVerticalAroundPoint(groupMain, centerPoint)
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
    saveHistory()
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
    scaleX: 1,
    scaleY: 1,
  }
  circles.value.push(newCircle)

  nextTick(() => {
    // Auto-select the newly created circle
    selectedIds.value = [newCircle.id]
    saveHistory()
  })
}

function createLine() {
  const centerX = containerWidth / 2
  const centerY = containerHeight / 2
  const offset = lines.value.length * 20
  const lineLength = 100 // Default line length in pixels

  // Calculate center position with offset, ensuring line stays within boundaries
  const x = clamp(
    centerX + offset,
    lineLength / 2 + 50,
    containerWidth - lineLength / 2 - 50,
  )
  const y = clamp(
    centerY + offset,
    lineLength / 2 + 50,
    containerHeight - lineLength / 2 - 50,
  )

  // For a 45-degree line, calculate the delta using trigonometry
  // 45 degrees = π/4 radians
  // cos(45°) = sin(45°) = √2/2 ≈ 0.7071
  const halfLength = lineLength / 2
  const delta = (halfLength * Math.sqrt(2)) / 2 // halfLength * cos(45°)

  // Points are relative to (x, y)
  // Line goes from bottom-left to top-right at 45 degrees
  // In canvas coordinates, Y increases downward, so negative Y goes up
  const points = [
    -delta, // x1: start point (left)
    delta, // y1: start point (bottom)
    delta, // x2: end point (right)
    -delta, // y2: end point (top)
  ]

  const newLine = {
    id: `line-${lines.value.length + 1}`,
    name: 'line',
    points,
    stroke: DEFAULT_STROKE_COLOR,
    strokeWidth: DEFAULT_STROKE_WIDTH,
    x,
    y,
    hitStrokeWidth: HIT_STROKE_WIDTH_LINE,
  }
  lines.value.push(newLine)

  nextTick(() => {
    // Auto-select the newly created line
    selectedIds.value = [newLine.id]
    saveHistory()
  })
}

function createArrow() {
  const centerX = containerWidth / 2
  const centerY = containerHeight / 2
  const offset = arrows.value.length * 20

  const lineLength = 100
  // Calculate center position with offset, ensuring line stays within boundaries
  const x = clamp(
    centerX + offset,
    lineLength / 2 + 50,
    containerWidth - lineLength / 2 - 50,
  )
  const y = clamp(
    centerY + offset,
    lineLength / 2 + 50,
    containerHeight - lineLength / 2 - 50,
  )

  // For a 45-degree line, calculate the delta using trigonometry
  // 45 degrees = π/4 radians
  // cos(45°) = sin(45°) = √2/2 ≈ 0.7071
  const halfLength = lineLength / 2
  const delta = (halfLength * Math.sqrt(2)) / 2 // halfLength * cos(45°)

  // Points are relative to (x, y)
  // Line goes from bottom-left to top-right at 45 degrees
  // In canvas coordinates, Y increases downward, so negative Y goes up
  const points = [
    -delta, // x1: start point (left)
    delta, // y1: start point (bottom)
    delta, // x2: end point (right)
    -delta, // y2: end point (top)
  ]

  const newArrow = {
    id: `arrow-${arrows.value.length + 1}`,
    name: 'arrow',
    x,
    y,
    points,
    fill: DEFAULT_STROKE_COLOR,
    stroke: DEFAULT_STROKE_COLOR,
    strokeWidth: DEFAULT_STROKE_WIDTH,
  }
  arrows.value.push(newArrow)

  nextTick(() => {
    // Auto-select the newly created arrow
    selectedIds.value = [newArrow.id]
    saveHistory()
  })
}
function createText() {
  const centerX = containerWidth / 2
  const centerY = containerHeight / 2
  const offset = texts.value.length * 20

  const defaultText = 'text'
  const defaultFontSize = 24
  const defaultWidth = 60
  // Calculate position: center horizontally (subtract half width), apply offset for vertical stacking
  // For the first text (offset = 0), it will be centered
  const x = clamp(
    centerX - defaultWidth / 2 + offset,
    0,
    containerWidth - defaultWidth,
  )
  const y = clamp(
    centerY - defaultFontSize / 2 + offset,
    0,
    containerHeight - defaultFontSize,
  )

  const newText = {
    id: `text-${texts.value.length + 1}`,
    name: 'text',
    x,
    y,
    text: defaultText,
    width: defaultWidth,
    fontSize: defaultFontSize,
    fontFamily: 'Arial',
    fill: DEFAULT_STROKE_COLOR,
    rotation: 0,
  }
  texts.value.push(newText)
  nextTick(() => {
    // Auto-select the newly created text
    selectedIds.value = [newText.id]
    saveHistory()
  })
}
// #endregion rotation and reflection

function handleZoomIn() {
  const scaleBy = 1.1
  const layerNode = groupContainerRef.value!.getNode()
  zoom(layerNode, undefined, scaleBy, true)
  updateToolbarPosition()
}
function handleZoomOut() {
  if (tool.value === 'select') {
    const scaleBy = 1.1
    const layerNode = layerImageRef.value!.getNode()
    const groupContainer = groupContainerRef.value!.getNode()
    const newScale = groupContainer.scaleX() / scaleBy
    // Only zoom if the new scale would be >= MIN_SCALE
    if (newScale < MIN_SCALE.value) {
      layerNode.position({ x: 0, y: 0 })
      resetOverlayPosition()
    } else {
      zoom(groupContainer, undefined, scaleBy, false)
    }
    updateToolbarPosition()
  }
  if (tool.value === 'crop') {
    const scaleBy = 1.1
    const layerNode = layerImageRef.value!.getNode()
    const groupContainer = groupContainerRef.value!.getNode()
    const newScale = groupContainer.scaleX() / scaleBy
    // Only zoom if the new scale would be >= cropMinScale
    if (newScale < MIN_SCALE.value) {
      zoom(
        groupContainer,
        undefined,
        MIN_SCALE.value / groupContainer.scaleX(),
        true,
      )
      layerNode.position({ x: 0, y: 0 })
      groupContainer.position({
        x: layerImagePosition.x,
        y: layerImagePosition.y,
      })
    } else {
      zoom(groupContainer, undefined, scaleBy, false)
    }
    constrainCropRectAfterZoom()
    centerCropRectInViewport()
  }
}

const selectionRectangle = ref({
  visible: false,
  x1: 0,
  y1: 0,
  x2: 0,
  y2: 0,
})
const isMousingDown = ref(false)
function handleMouseDown(e: KonvaEventObject<MouseEvent>) {
  const stage = e.target.getStage()
  if (['select', 'multiselect'].includes(tool.value!)) {
    if (!e.target.name().endsWith('anchor'))
      isMousingDown.value = true
    else toolbarPosition.value.visible = false
    // Do nothing if we mousedown on any shape
    if (e.target !== stage
      && !e.target.hasName('background-image')
      && !e.target.hasName('layer-image-overlay')) {
      return
    }
    selectedIds.value = []
    if (tool.value === 'multiselect') {
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
}
function handleMouseMove(e: KonvaEventObject<MouseEvent>) {
  if (tool.value === 'multiselect') { // do nothing if we didn't start selection
    if (!isSelecting.value) return

    const pos = e.target.getStage()!.getPointerPosition()!
    selectionRectangle.value.x2 = pos.x
    selectionRectangle.value.y2 = pos.y
  }
}
function handleMouseUp() {
  isMousingDown.value = false
  if (tool.value === 'multiselect') {
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
}

// Toolbar current properties states
const showToolbarFillColor = ref(false)
const showToolbarStrokeSettings = ref(false)
const currentFillColor = ref<string | null>(DEFAULT_STROKE_COLOR)
const currentStrokeColor = ref<string | null>(DEFAULT_STROKE_COLOR)
const currentStrokeWidth = ref<number>(DEFAULT_STROKE_WIDTH)

// Update transformer nodes when selection changes
watch(selectedIds, (newValue) => {
  if (newValue.length > 0) {
    const nodes = newValue.map((id) => {
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
    if (
      newValue.length === 1
      && ['line', 'arrow'].includes(nodes[0]!.name())
    ) {
      transformerRef.value.getNode().nodes([])
    } else {
      // setIsSelectingLinearShape(false)
      transformerRef.value.getNode().nodes(nodes)
    }
    initializeSelection(newValue)
  } else {
    // Clear selection
    transformerRef.value.getNode().nodes([])
    toolbarPosition.value = { x: 0, y: 0, visible: false }
    // setIsSelectingLinearShape(false)
  }
})

function initializeSelection(ids: string[]) {
  updateCurrentPropertiesFromSelection(ids)
  updateToolbarPosition()
}
// Function to update toolbar position based on transformer bounding box
function updateToolbarPosition() {
  const TOOLBAR_HEIGHT = 64 // Estimated toolbar height
  const ROTATION_HANDLE_RADIUS = 15 // Estimated radius of rotation handle
  const TOOLBAR_SPACING = 10 // Spacing between toolbar and transformer

  // Helper function to normalize rotation to 0-360 range
  const normalizeRotation = (angle: number) => {
    let normalized = angle % 360
    if (normalized < 0) normalized += 360
    return normalized
  }

  // Helper function to check if rotation handle is visually at bottom
  const isRotationHandleAtBottom = (rotation: number) => {
    const normalized = normalizeRotation(rotation)
    // When rotated approximately 135-225 degrees, the handle (originally at top) appears at bottom
    // Using a wider range to be safe: 90-270 degrees
    return normalized >= 90 && normalized <= 270
  }

  // Helper function to calculate toolbar position based on bounding box and rotation
  const calculateToolbarPosition = (box: Omit<Box, 'rotation'>, rotation: number) => {
    const toolbarX = box.x + box.width / 2 // Center horizontally

    // Calculate rotation handle position (top center of bounding box, offset by rotateAnchorOffset)
    const rotationHandleY = box.y - ROTATE_ANCHOR_OFFSET
    const rotationHandleTop = rotationHandleY - ROTATION_HANDLE_RADIUS
    const rotationHandleBottom = rotationHandleY + ROTATION_HANDLE_RADIUS

    // Check if rotation handle is visually at bottom (when rotated 90-270 degrees)
    const handleAtBottom = isRotationHandleAtBottom(rotation)
    // Determine initial toolbar position (below by default)
    let toolbarY = box.y + box.height + TOOLBAR_SPACING

    // When handle is visually at bottom (rotated 180 degrees), the handle appears near bottom of shape
    // So if toolbar is at bottom, it might cover the handle. Position toolbar at top instead.
    // Also check if toolbar would overflow below container
    if (toolbarY + TOOLBAR_HEIGHT > containerHeight || handleAtBottom) {
      // Position toolbar above
      toolbarY = box.y - TOOLBAR_SPACING - TOOLBAR_HEIGHT
      const toolbarTop = toolbarY
      const toolbarBottom = toolbarY + TOOLBAR_HEIGHT

      // Check if toolbar at top would overlap with rotation handle (when handle is visually at top)
      const handleAtTop = !handleAtBottom
      const toolbarAtTopOverlapsHandle
        = handleAtTop
          && toolbarTop <= rotationHandleBottom
          && toolbarBottom >= rotationHandleTop
      // If toolbar overlaps with rotation handle area at top, move it further up
      if (toolbarAtTopOverlapsHandle || toolbarY > rotationHandleY) {
        toolbarY = toolbarY - ROTATE_ANCHOR_OFFSET
      }
    }

    return { toolbarX, toolbarY }
  }

  // Handle single selection
  if (selectedIds.value.length === 1) {
    const shape = lineRefs.value.find(ref => ref.getNode().attrs.id === selectedIds.value[0])?.getNode()
    if (!shape) return
    const box = shape.getClientRect()
    const rotation = normalizeRotation(shape.rotation())
    const { toolbarX, toolbarY } = calculateToolbarPosition(box, rotation)

    toolbarPosition.value = {
      x: toolbarX,
      y: toolbarY,
      visible: selectedIds.value.length > 0 && !isMousingDown.value,
    }
    return
  }

  // Handle multiple selections
  const transformer = transformerRef.value.getNode()
  const stage = stageRef.value.getNode()
  if (!transformer || !stage) return

  // Get the bounding box of the transformer in stage coordinates
  const box = transformer.getClientRect({ relativeTo: stage })
  if (!box) return

  const { toolbarX, toolbarY } = calculateToolbarPosition(box, 0)

  toolbarPosition.value = {
    x: toolbarX,
    y: toolbarY,
    visible: selectedIds.value.length > 0 && !isMousingDown.value,
  }
}

// Helper function to update current properties based on first selected shape
function updateCurrentPropertiesFromSelection(ids: string[]) {
  // Check what types of shapes are in the selection
  const hasRectangles = ids.some(id => rectangles.value.some(r => r.id === id))
  const hasCircles = ids.some(id => circles.value.some(c => c.id === id))
  const hasLines = ids.some(id => lines.value.some(l => l.id === id))
  const hasArrows = ids.some(id => arrows.value.some(a => a.id === id))
  const hasTexts = ids.some(id => texts.value.some(t => t.id === id))

  // Determine toolbar visibility based on selection
  if (hasRectangles || hasCircles) {
    // If ids has any circles or rectangles, show both toolbars
    showToolbarFillColor.value = true
    showToolbarStrokeSettings.value = true
  } else if (
    (hasLines || hasArrows)
    && !hasTexts
    && !hasRectangles
    && !hasCircles
  ) {
    // If ids includes only lines or arrows (no texts, circles, or rectangles)
    showToolbarFillColor.value = false
    showToolbarStrokeSettings.value = true
  } else if (
    hasTexts
    && !hasRectangles
    && !hasCircles
    && !hasLines
    && !hasArrows
  ) {
    // If ids includes texts only
    showToolbarFillColor.value = true
    showToolbarStrokeSettings.value = false
  } else {
    // Mixed selection or other cases - show both by default
    showToolbarFillColor.value = true
    showToolbarStrokeSettings.value = true
  }
  // Update current properties based on first selected shape
  const firstId = ids[0]
  const rect = rectangles.value.find(r => r.id === firstId)
  const circle = circles.value.find(c => c.id === firstId)
  const line = lines.value.find(l => l.id === firstId)
  const arrow = arrows.value.find(a => a.id === firstId)
  const text = texts.value.find(t => t.id === firstId)

  if (rect) {
    currentStrokeColor.value = rect.stroke as string || DEFAULT_STROKE_COLOR
    currentStrokeWidth.value = rect.strokeWidth || DEFAULT_STROKE_WIDTH
    currentFillColor.value = rect.fill as string || null
  } else if (circle) {
    currentStrokeColor.value = circle.stroke as string || DEFAULT_STROKE_COLOR
    currentStrokeWidth.value = circle.strokeWidth || DEFAULT_STROKE_WIDTH
    currentFillColor.value = circle.fill as string || null
  } else if (line) {
    currentStrokeColor.value = line.stroke as string || DEFAULT_STROKE_COLOR
    currentStrokeWidth.value = line.strokeWidth || DEFAULT_STROKE_WIDTH
    currentFillColor.value = null // Lines don't have fill
  } else if (arrow) {
    currentStrokeColor.value = arrow.stroke as string || DEFAULT_STROKE_COLOR
    currentStrokeWidth.value = arrow.strokeWidth || DEFAULT_STROKE_WIDTH
    currentFillColor.value = null // Arrows don't have fill
  } else if (text) {
    currentFillColor.value = text.fill as string || DEFAULT_STROKE_COLOR // Text uses fill for color
    currentStrokeColor.value = null // Text doesn't have stroke
    currentStrokeWidth.value = 0
  }
}

function handleStageClick(e: KonvaEventObject<MouseEvent>) {
  // if we are selecting with rect, do nothing
  if (selectionRectangle.value.visible
  ) return

  // if click on empty area - remove all selections
  if (e.target === e.target.getStage() || e.target.hasName('background-image') || e.target.hasName('layer-image-overlay')) {
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
}

const openToolbarFillColor = ref(false)
const openToolbarStrokeSettings = ref(false)
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

const dragIds = shallowRef(new Set())
const snapshotResult = shallowRef<Record<string, any>>({})
const dragHistoryTimeoutRef = shallowRef<NodeJS.Timeout | null>(null)
const history = ref<any[]>([])
const historyStep = shallowRef(0)
const canUndo = computed(() => history.value.length > 0 && historyStep.value > 0)
const canRedo = computed(() => history.value.length > 0 && historyStep.value < history.value.length - 1)
// const canUndo = shallowRef(false)
// const canRedo = shallowRef(false)

function createHistorySnapshot() {
  return {
    rectangles: cloneDeep(rectangles.value),
    circles: cloneDeep(circles.value),
    lines: cloneDeep(lines.value),
    arrows: cloneDeep(arrows.value),
    texts: cloneDeep(texts.value),
    imageSrc: image.value?.src,
    groupMainConfig: cloneDeep(groupMainConfig.value),
    cropRect: cloneDeep(cropRect.value),
    selectedIds: cloneDeep(selectedIds.value),
  }
}
function saveHistory(customSnapshot?: Record<string, any>) {
  // Remove any history after current step (when user does new action after undo)
  if (historyStep.value < history.value.length - 1) {
    history.value = history.value.slice(0, historyStep.value + 1)
  }
  // Use custom snapshot if provided, otherwise create a new one
  const snapshot = customSnapshot || createHistorySnapshot()
  // Add new snapshot
  history.value.push(snapshot)
  console.log('history.value', toRaw(history.value))
  historyStep.value = history.value.length - 1

  // Limit history size to prevent memory issues (keep last 50 states)
  const MAX_HISTORY_SIZE = 50
  if (history.value.length > MAX_HISTORY_SIZE) {
    history.value.shift()
    historyStep.value = MAX_HISTORY_SIZE - 1
  }
};

function initHistory() {
  const initialSnapshot = createHistorySnapshot()
  history.value = [initialSnapshot]
  historyStep.value = 0
}

function restoreFromSnapshot(snapshot: Record<string, any>) {
  rectangles.value = snapshot.rectangles || []
  circles.value = snapshot.circles || []
  lines.value = snapshot.lines || []
  arrows.value = snapshot.arrows || []
  texts.value = snapshot.texts || []
  image.value!.src = snapshot.imageSrc
  groupMainConfig.value = snapshot.groupMainConfig || { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 }
  cropRect.value = snapshot.cropRect || { x: 0, y: 0, width: 0, height: 0 }

  // Filter selectedIds to only include IDs that still exist in restored shapes
  const restoredSelectedIds = (snapshot.selectedIds || []).filter(
    (id: string) => {
      return (
        (snapshot.lines || []).some((l: LineConfig) => l.id === id)
        || (snapshot.arrows || []).some((a: ArrowConfig) => a.id === id)
        || (snapshot.circles || []).some((c: CircleConfig) => c.id === id)
        || (snapshot.rectangles || []).some((r: RectConfig) => r.id === id)
        || (snapshot.texts || []).some((t: TextConfig) => t.id === id)
      )
    },
  )
  selectedIds.value = restoredSelectedIds
}

function handleUndo() {
  if (!canUndo.value) return
  historyStep.value -= 1
  const previous = history.value[historyStep.value]
  if (!previous) return
  console.log('handleUndo', historyStep.value, history.value.length)
  restoreFromSnapshot(previous)
}

function handleRedo() {
  if (!canRedo.value) return
  historyStep.value += 1
  const next = history.value[historyStep.value]
  if (!next) return
  restoreFromSnapshot(next)
}
function handleDragStart(e: KonvaEventObject<MouseEvent>) {
  toolbarPosition.value.visible = false
  openToolbarFillColor.value = false
  openToolbarStrokeSettings.value = false
  dragIds.value.clear()
  // Check if clicked on any selectable shape (line, circle, rect, arrow, or text)
  const isSelectableShape
    = e.target.hasName('rect')
      || e.target.hasName('line')
      || e.target.hasName('arrow')
      || e.target.hasName('circle')
      || e.target.hasName('text')

  if (!isSelectableShape) {
    return
  }
  const clickedId = e.target.id()
  const isSelected = selectedIds.value.includes(clickedId)
  let newSelectedIds = []
  if (!isSelected) {
    newSelectedIds = [clickedId]
  } else {
    newSelectedIds = [...selectedIds.value]
  }
  selectedIds.value = newSelectedIds
  // Track which IDs are being dragged (use selectedIds if available, otherwise will be added in handleDragEnd)
  if (newSelectedIds.length > 0) {
    newSelectedIds.forEach(selectedId => dragIds.value.add(selectedId))
  }
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

function handleTransformStart() {
  dragIds.value.clear()
  // Track which IDs are being dragged (use selectedIds if available, otherwise will be added in handleDragEnd)
  selectedIds.value.forEach(selectedId => dragIds.value.add(selectedId))
}

function handleTransformEnd(e: KonvaEventObject<Event>, index: number) {
  const id = e.target.id()
  const node = rectRefs.value[index]!.getNode()
  const shapeName = e.target.name()

  if (shapeName === 'rect') {
    const scaleX = node.scaleX()
    const scaleY = node.scaleY()

    // Reset scale
    node.scaleX(1)
    node.scaleY(1)

    // Update the state with new values
    Object.assign(rectangles.value[index]!, {
      x: node.x(),
      y: node.y(),
      width: Math.max(44, node.width() * scaleX),
      height: Math.max(44, node.height() * scaleY),
      rotation: node.rotation(),
    })
    snapshotResult.value.rectangles = cloneDeep(rectangles.value)
  } else if (shapeName === 'circle') {
    const scaleX = node.scaleX()
    const scaleY = node.scaleY()
    // Update the circle with new scale (allows non-uniform scaling)
    Object.assign(circles.value[index]!, {
      x: node.x(),
      y: node.y(),
      scaleX,
      scaleY,
      rotation: node.rotation(),
    })

    snapshotResult.value.circles = cloneDeep(circles.value)
  } else if (shapeName === 'arrow') {
    Object.assign(arrows.value[index]!, {
      x: node.x(),
      y: node.y(),
      scaleX: node.scaleX(),
      scaleY: node.scaleY(),
      rotation: node.rotation(),
    })
    snapshotResult.value.arrows = cloneDeep(arrows.value)
  } else if (shapeName === 'line') {
    Object.assign(lines.value[index]!, {
      x: node.x(),
      y: node.y(),
      scaleX: node.scaleX(),
      scaleY: node.scaleY(),
      rotation: node.rotation(),
    })
    snapshotResult.value.lines = cloneDeep(lines.value)
  } else if (shapeName === 'text') {
    const activeAnchor = transformerRef.value.getNode().getActiveAnchor()
    if (activeAnchor !== 'middle-left' && activeAnchor !== 'middle-right') {
      const MIN_FONT_SIZE = 8
      const fontSize = Math.max(
        MIN_FONT_SIZE,
        (node as any).fontSize() * node.scaleX(),
      )
      node.scale({ x: 1, y: 1 })

      // Update text with new position, fontSize, width, and rotation
      Object.assign(texts.value[index]!, {
        x: node.x(),
        y: node.y(),
        width: node.width() * node.scaleX(),
        fontSize,
        rotation: node.rotation(),
      })

      snapshotResult.value.texts = cloneDeep(texts.value)
    }
  }

  // Remove this ID from the tracking set
  dragIds.value.delete(id)

  // Clear any existing timeout
  if (dragHistoryTimeoutRef.value) {
    clearTimeout(dragHistoryTimeoutRef.value)
  }

  // Batch history save: wait a bit to see if more drags are coming
  // This ensures we only save history once even when multiple shapes are dragged together
  dragHistoryTimeoutRef.value = setTimeout(() => {
    // Check if all drags are complete
    if (dragIds.value.size === 0) {
      // All drags complete - save history with batched snapshot
      const baseSnapshot = createHistorySnapshot()
      saveHistory({ ...baseSnapshot, ...snapshotResult.value })
      // Reset tracking
      snapshotResult.value = {}
    }
    dragHistoryTimeoutRef.value = null
  }, 50) // 50ms debounce - enough time for multiple drags to complete

  // Update toolbar position after transform
  nextTick(() => {
    updateToolbarPosition()
  })
}

function handleCircleDragEnd(e: KonvaEventObject<MouseEvent>, index: number) {
  const id = e.target.id()
  // Add this ID to the drag tracking set if not already there
  // This handles the case where a single shape is dragged without being selected
  dragIds.value.add(id)
  Object.assign(circles.value[index]!, {
    x: e.target.x(),
    y: e.target.y(),
  })

  snapshotResult.value.circles = cloneDeep(circles.value)

  // Remove this ID from the tracking set
  dragIds.value.delete(id)

  // Clear any existing timeout
  if (dragHistoryTimeoutRef.value) {
    clearTimeout(dragHistoryTimeoutRef.value)
  }

  // Batch history save: wait a bit to see if more drags are coming
  // This ensures we only save history once even when multiple shapes are dragged together
  dragHistoryTimeoutRef.value = setTimeout(() => {
    // Check if all drags are complete
    if (dragIds.value.size === 0) {
      // All drags complete - save history with batched snapshot
      const baseSnapshot = createHistorySnapshot()
      saveHistory({ ...baseSnapshot, ...snapshotResult.value })
      // Reset tracking
      snapshotResult.value = {}
    }
    dragHistoryTimeoutRef.value = null
  }, 50) // 50ms debounce - enough time for multiple drags to complete

  // Update toolbar position after drag
  setTimeout(() => {
    updateToolbarPosition()
  }, 0)
}

// Handle fill color change for selected objects
function handleFillColorChange(colorValue: string) {
  selectedIds.value.forEach((id) => {
    // Update rectangles
    const rect = rectangles.value.find(r => r.id === id)
    if (rect) {
      if (rect.strokeWidth === 1) {
        rect.stroke = colorValue
        // If any selected object has strokeWidth of 1, update stroke color too
        currentStrokeColor.value = colorValue
      }
      rect.fill = colorValue
    }

    // Update circles
    const circle = circles.value.find(c => c.id === id)
    if (circle) {
      if (circle.strokeWidth === 1) {
        circle.stroke = colorValue
        // If any selected object has strokeWidth of 1, update stroke color too
        currentStrokeColor.value = colorValue
      }
      circle.fill = colorValue
    }

    // Update text fill color
    const text = texts.value.find(t => t.id === id)
    if (text) {
      text.fill = colorValue
    }
  })

  // Update current fill color
  currentFillColor.value = colorValue
  saveHistory()
}

function handleStrokeColorChange(colorValue: string) {
  selectedIds.value.forEach((id) => {
    const rect = rectangles.value.find(r => r.id === id)
    if (rect) {
      rect.stroke = colorValue
    }
    const circle = circles.value.find(c => c.id === id)
    if (circle) {
      circle.stroke = colorValue
    }
    const line = lines.value.find(l => l.id === id)
    if (line) {
      line.stroke = colorValue
    }
    const arrow = arrows.value.find(a => a.id === id)
    if (arrow) {
      arrow.stroke = colorValue
    }
    const text = texts.value.find(t => t.id === id)
    if (text) {
      text.stroke = colorValue
    }
  })
  currentStrokeColor.value = colorValue
  saveHistory()
}

function getBoundBoxFunc(oldBox: Box, newBox: Box) {
  // Check what types of shapes are selected
  const hasRectangles = selectedIds.value.some(id =>
    rectangles.value.some(r => r.id === id),
  )
  const hasCircles = selectedIds.value.some(id =>
    circles.value.some(c => c.id === id),
  )
  const hasTexts = selectedIds.value.some(id => texts.value.some(t => t.id === id))

  // For rect or circle: minimum width and height are 44
  if (hasRectangles || hasCircles) {
    if (newBox.width < 44 || newBox.height < 44) {
      return oldBox
    }
  }

  // For text only (no rect/circle): minimum height is 8
  if (hasTexts && !hasRectangles && !hasCircles) {
    if (newBox.height < 8) {
      return oldBox
    }
  }

  return newBox
}

watch(tool, () => {
  selectedIds.value = []
  toolbarPosition.value = { x: 0, y: 0, visible: false }
})

const toolbarButtons = [
  { label: 'Undo', value: 'undo', onClick: handleUndo, disabled: () => !canUndo.value, icon: 'ph:arrow-arc-left-bold' },
  { label: 'Redo', value: 'redo', onClick: handleRedo, disabled: () => !canRedo.value, icon: 'ph:arrow-arc-right-bold' },
  { label: 'Move', value: 'select', onClick: () => setTool('select'), icon: 'ph:cursor-bold' },
  { label: 'Select', value: 'multiselect', onClick: () => setTool('multiselect'), icon: 'ph:selection-bold' },
  { label: 'Circle', value: 'circle', onClick: createCircle, icon: 'ph:circle-bold' },
  { label: 'Rectangle', value: 'rectangle', onClick: createRectangle, icon: 'ph:rectangle-bold' },
  { label: 'Arrow', value: 'arrow', icon: 'ph:arrow-up-right-bold' },
  { label: 'Line', value: 'line', onClick: createLine, icon: 'ph:line-vertical-bold' },
  { label: 'Text', value: 'text', onClick: createText, icon: 'ph:text-aa-bold' },
  { label: 'Brightness', value: 'brightness', icon: 'ph:sun-dim-bold' },
  { label: 'Crop', value: 'crop', onClick: initCropScene, icon: 'ph:crop-bold' },
]

const img = new Image()
img.src = svgToURL('<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 640 640"><path fill="black" d="M544.1 256h7.9c13.3 0 24-10.7 24-24V88c0-9.7-5.8-18.5-14.8-22.2S541.9 64.2 535 71l-51.7 51.8C439 86.1 382 64 320 64C191 64 84.3 159.4 66.6 283.5c-2.5 17.5 9.6 33.7 27.1 36.2s33.7-9.7 36.2-27.1C143.2 199.5 223.3 128 320 128c44.4 0 85.2 15 117.7 40.3L391 215c-6.9 6.9-8.9 17.2-5.2 26.2S398.3 256 408 256zm29.4 100.5c2.5-17.5-9.7-33.7-27.1-36.2s-33.7 9.7-36.2 27.1c-13.3 93-93.4 164.5-190.1 164.5c-44.4 0-85.2-15-117.7-40.3L249 425c6.9-6.9 8.9-17.2 5.2-26.2S241.7 384 232 384H88c-13.3 0-24 10.7-24 24v144c0 9.7 5.8 18.5 14.8 22.2s19.3 1.6 26.2-5.2l51.8-51.8C201 553.9 258 576 320 576c129 0 235.7-95.4 253.4-219.5z"/></svg>')
const rotateIconSize = 12

const rotateIcon = new Konva.Image({
  name: 'rotate-icon',
  image: img,
  x: 0,
  y: 0,
  width: rotateIconSize,
  height: rotateIconSize,
  listening: false,
})

// Base cursor SVG (rotation icon) - used as default for rotateAnchorCursor config
const baseCursorSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill="currentColor" d="M2.146 8.853a.5.5 0 0 1 0-.707l3-3a.5.5 0 1 1 .708.707L3.707 8h8.586l-2.147-2.147a.5.5 0 0 1 .708-.707l3 3a.5.5 0 0 1 0 .707l-3 3a.5.5 0 0 1-.708-.707L12.293 9H3.707l2.147 2.146a.5.5 0 1 1-.708.707z"/></svg>'
const cursorRotate = svgToURL(baseCursorSvg)

// Helper function to get rotated cursor based on node rotation
function getRotatedCursor(rotation: number): string {
  const rotatedCursorSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
    <g transform="rotate(${rotation} 8 8)">
      <path fill="currentColor" d="M2.146 8.853a.5.5 0 0 1 0-.707l3-3a.5.5 0 1 1 .708.707L3.707 8h8.586l-2.147-2.147a.5.5 0 0 1 .708-.707l3 3a.5.5 0 0 1 0 .707l-3 3a.5.5 0 0 1-.708-.707L12.293 9H3.707l2.147 2.146a.5.5 0 1 1-.708.707z"/>
    </g>
  </svg>`
  return svgToURL(rotatedCursorSvg)
}

function anchorStyleFunc(anchor: any) {
  if (anchor.name().includes('rotater')) {
    const anchorSize = 16
    const position = anchor.position()
    // 10 is the anchor default size
    const offset = (anchorSize - 10) / 2
    anchor.fill('#fff')
    anchor.strokeWidth(1)
    anchor.stroke('#29A9E5')
    anchor.width(anchorSize)
    anchor.height(anchorSize)
    anchor.x(position.x - offset)
    anchor.y(position.y - offset)
    anchor.cornerRadius(anchor.width() / 2)

    if (rotateIcon.getParent() === null) {
      const transformerNode = anchor.getParent() as Transformer
      transformerNode.add(rotateIcon)
      anchor.on('mouseenter', () => {
        // Get current rotation and set rotated cursor
        const rotation = transformerNode.rotation()
        const rotatedCursor = getRotatedCursor(rotation)
        cursorStyle.value = `url(${rotatedCursor}) 8 8, auto`
      })
      anchor.on('mouseleave', () => {
        cursorStyle.value = 'default'
      })
    }
    rotateIcon.x(anchor.x() - offset)
    rotateIcon.y(anchor.y() - offset)
  }
}

function initTransfomer() {
  console.log('initTransfomer')
}

function customRotateCursor() {
  const transformerNode = transformerRef.value!.getNode() as Transformer
  const rotatedCursor = getRotatedCursor(transformerNode.rotation())
  cursorStyle.value = `url(${rotatedCursor}) 8 8, auto`
}

function svgToURL(s: string) {
  const uri = window.btoa(unescape(encodeURIComponent(s)))
  return `data:image/svg+xml;base64,${uri}`
}

const isLayerImageDraggable = computed(() => tool.value === 'crop' || tool.value === 'select')
const isShapeDraggable = computed(() => ['select', 'multiselect'].includes(tool.value as string))
provide('tranfromerRef', transformerRef)
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
            ref="layerImageRef"
            :config="{ draggable: isLayerImageDraggable, dragBoundFunc: handleLayerDragBound }"
            @dragend="resetOverlayPosition"
          >
            <v-rect
              v-if="isLayerImageDraggable"
              ref="layerImageOverlayRef"
              name="layer-image-overlay"
              :config="{ x: 0, y: 0, width: stageConfig.width, height: stageConfig.height, fill: 'red' }"
            />
            <v-group
              ref="groupContainerRef"
              name="group-container"
              :config="{ x: 0, y: 0, width: stageConfig.width, height: stageConfig.height }"
            >
              <v-group
                ref="groupMainRef"
                name="group-main"
                :config="groupMainConfig"
              >
                <v-image
                  ref="imageRef"
                  :key="image.src"
                  name="background-image"
                  :config="{
                    image,
                    ...imageConfig,
                  }"
                  @dragstart="handleImageDragStart"
                />
                <v-rect
                  v-for="(rect, i) in rectangles" :key="i" ref="rectRefs"
                  :config="{
                    ...rect,
                    draggable: isShapeDraggable,
                    strokeScaleEnabled: false,
                  }"
                  @mouseover="cursorStyle = 'pointer'"
                  @mouseout="cursorStyle = 'default'"
                  @dragstart="handleDragStart"
                  @dragend="handleDragEnd($event, i)"
                  @transformstart="handleTransformStart"
                  @transformend="handleTransformEnd($event, i)"
                />
                <v-circle
                  v-for="(circle, i) in circles" :key="i"
                  ref="circleRefs"
                  :config="{
                    ...circle,
                    draggable: isShapeDraggable,
                    hitStrokeWidth: HIT_STROKE_WIDTH_LINE,
                    strokeScaleEnabled: false,
                  }"
                  @transformstart="handleTransformStart"
                  @mouseover="cursorStyle = 'pointer'"
                  @mouseout="cursorStyle = 'default'"
                  @dragstart="handleDragStart"
                  @dragend="handleCircleDragEnd($event, i)"
                />
                <Line
                  v-for="(line, i) in lines" :key="i"
                  :index="i"
                  :line="line"
                  :tool
                  :is-mousing-down="isMousingDown"
                  @dragstart="handleDragStart"
                  @update-line="lines[i]!.points = $event"
                  @initialize-selection="initializeSelection"
                  @transformstart="handleTransformStart"
                  @update-toolbar-position="updateToolbarPosition"
                />
                <Text
                  v-for="(text, i) in texts" :key="i"
                  :index="i"
                  :text="text"
                  :tool="tool"
                  @dragstart="handleDragStart"
                  @update-toolbar-position="updateToolbarPosition"
                />
              </v-group>
            </v-group>
            <v-transformer
              ref="transformerRef"
              name="transformer"
              :config="{
                flipEnabled: false,
                ignoreStroke: true,
                rotateAnchorOffset: ROTATE_ANCHOR_OFFSET,
                visible: !isMousingDown,
                padding: currentStrokeWidth / 2,
                anchorStyleFunc,
                rotateAnchorCursor: cursorRotate,
                boundBoxFunc: getBoundBoxFunc,
              }"
              @transform="customRotateCursor"
              @vue:mounted="initTransfomer"
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
                  strokeScaleEnabled: false,
                }"
              />

              <!-- Corner handles -->
              <v-transformer
                ref="cropTransformerRef"
                :config="{
                  flipEnabled: false,
                  keepRatio: true,
                  rotateEnabled: false,
                  ignoreStroke: true,
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
              @click=" openToolbarFillColor = true"
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
          <Dropdown>
            <button
              class="btn btn-icon btn-text"
              @click="openToolbarStrokeSettings = true"
            >
              <div
                v-if="currentStrokeColor"
                class="w-6 rounded-full border border-elevated"
                :style="{ background: currentStrokeColor, height: `${currentStrokeWidth}px`, minHeight: '3px' }"
              />
              <Icon v-else name="tabler:line" />
            </button>
            <template #popover="{ toggleShow }">
              <div class="flex gap-2 p-3">
                <button
                  v-for="item in fillColors" :key="item.label"
                  class="grid size-6 place-items-center rounded-full border border-elevated"
                  :style="{ background: item.color, ...item.style }"
                  @click="() => { handleStrokeColorChange(item.color); toggleShow() }"
                >
                  <Icon v-if="currentStrokeColor === item.color" class="text-sm text-primary" name="ph:check-fat-fill" />
                </button>
              </div>
            </template>
          </Dropdown>
        </div>
        <!-- edit image toolbar -->
        <div
          class="absolute top-0 -right-4 flex translate-x-full flex-col rounded-sm border border-elevated"
        >
          <button class="btn btn-icon btn-text" @click="handleRotate">
            <Icon name="lucide:rotate-ccw" />
          </button>
          <button
            class="btn btn-icon btn-text"
            :class="{ 'btn-active': groupMainConfig.scaleX === -1 }"
            @click="handleReflectHorizontal"
          >
            <Icon name="lucide:flip-horizontal" />
          </button>
          <button class="btn btn-icon btn-text" :class="{ 'btn-active': groupMainConfig.scaleY === -1 }" @click="handleReflectVertical">
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
        :disabled="toValue(item.disabled)"
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
