<script setup lang="tsx">
import type { Group } from 'konva/lib/Group'
import type { Layer } from 'konva/lib/Layer'
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
import { cloneDeep } from 'lodash-es'
import Dropdown from '@/components/Dropdown.vue'
import Slider from '~/components/base/Slider.vue'
import Line from '~/components/konva/Line.vue'
import Text from '~/components/konva/Text.vue'
import AnchorLinearShape from './AnchorLinearShape.vue'
import Circle from './Circle.vue'
import { ASPECT_RATIOS, DEFAULT_STROKE_COLOR, DEFAULT_STROKE_WIDTH, HIT_STROKE_WIDTH_LINE, ROTATE_ANCHOR_OFFSET } from './constants'
import LayerCrop from './LayerCrop.vue'
import Rect from './Rect.vue'

const props = defineProps<{
  imageUrl?: string
}>()
// Container dimensions
const containerWidth = 649
const containerHeight = 472
const MIN_SCALE = ref(1)

const editImageStore = useEditImageStore()
const { tool, cursorStyle, shapeRefs, selectedIds } = storeToRefs(editImageStore)
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

const imageRef = useTemplateRef('imageRef')
const imageConfig = ref({
  width: 0,
  height: 0,
  x: 0,
  y: 0,
  offsetX: 0,
  offsetY: 0,
})
watch(image, async (newImage) => {
  if (newImage) {
    imageConfig.value = calculateDimensions()
    await nextTick()
    imageRef.value!.getNode().cache()
  }
})

const isSelecting = ref(false)
const stageRef = useTemplateRef('stageRef')
const transformerRef = useTemplateRef('transformerRef')
const layerImageRef = useTemplateRef('layerImageRef')
const layerImageOverlayRef = useTemplateRef('layerImageOverlayRef')
const groupContainerRef = useTemplateRef('groupContainerRef')
const groupOtherRef = useTemplateRef('groupOtherRef')
const cropAspectRatio = ref<ValueOf<typeof ASPECT_RATIOS>>(ASPECT_RATIOS.ORIGINAL)
const toolbarPosition = ref({
  x: 0,
  y: 0,
  visible: false,
})
const circles = ref<CircleConfig[]>([])
const rectangles = ref<RectConfig[]>([])
const lines = ref<LineConfig[]>([])
const arrows = ref<ArrowConfig[]>([])
const texts = ref<TextConfig[]>([])
const brightness = ref(0)

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

const groupMainConfigInitial = {
  x: 0,
  y: 0,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
}
const groupMainConfig = ref(cloneDeep(groupMainConfigInitial))
const savedGroupMainConfig = ref(cloneDeep(groupMainConfigInitial))

const stageConfig = ref({
  width: containerWidth,
  height: containerHeight,
  scaleX: 1,
  scaleY: 1,
})
const groupMainRef = useTemplateRef('groupMainRef')
const isCropping = computed(() => tool.value === 'crop')
const initCropRect = { x: 0, y: 0, width: 0, height: 0 }
const cropRect = ref(cloneDeep(initCropRect))
const cropAspectRatioOptions = [
  { label: 'Original', value: ASPECT_RATIOS.ORIGINAL },
  { label: '4:3', value: ASPECT_RATIOS.FOUR_TO_THREE },
]
const layerCropRef = useTemplateRef('layerCropRef')

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
  tool.value = 'crop'
  Object.assign(groupMainConfig.value, {
    scaleX: Math.sign(groupMainConfig.value.scaleX),
    scaleY: Math.sign(groupMainConfig.value.scaleY),
  })

  // Store current transform values before resetting them
  savedGroupMainConfig.value = { ...groupMainConfig.value }

  const layerNode = layerImageRef.value.getNode()
  layerNode.position({ x: 0, y: 0 })
  const groupContainerNode = groupContainerRef.value!.getNode()
  groupContainerNode.position({ x: 0, y: 0 })
  groupContainerNode.scale({ x: 1, y: 1 })

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

    // Apply zoom centered on viewport center
    zoom(groupContainerNode, undefined, finalScale, true)
    Object.assign(layerImagePosition, {
      x: groupContainerNode.x(),
      y: groupContainerNode.y(),
    })

    // Recalculate crop rect after zoom (since image bounds changed)
    cropRect.value = calculateCropRectFromAspectRatio()
  }

  await nextTick()
  // Select crop rect
  const node = layerCropRef.value!.cropRectRef.getNode()
  layerCropRef.value!.cropTransformerRef.getNode().nodes([node])

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

function handleCropAspectRatioChange(e: Event) {
  const value = Number((e.target as HTMLSelectElement).value) as ValueOf<typeof ASPECT_RATIOS>
  if (cropAspectRatio.value === value) return

  cropAspectRatio.value = value

  // Get image bounds to ensure crop rect stays within image
  if (!imageRef.value || !layerImageRef.value) {
    const newCropRect = calculateCropRectFromAspectRatio()
    cropRect.value = newCropRect
    const cropNode = layerCropRef.value!.cropRectRef.getNode()
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
    const cropNode = layerCropRef.value!.cropRectRef.getNode()
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
    const cropNode = layerCropRef.value!.cropRectRef.getNode()
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
    const cropNode = layerCropRef.value!.cropRectRef.getNode()
    cropNode.position({ x: newCropRect.x, y: newCropRect.y })
    cropNode.width(newCropRect.width)
    cropNode.height(newCropRect.height)
    centerCropRectInViewport()
    return
  }

  const imageWidth = imageBox.width
  const imageHeight = imageBox.height
  const imageAspectRatio = imageWidth / imageHeight

  // Calculate the largest rect with the target ratio that fits within image bounds
  let newWidth, newHeight
  if (targetAspectRatio > imageAspectRatio) {
    newWidth = imageWidth
    newHeight = imageWidth / targetAspectRatio
  } else {
    newHeight = imageHeight
    newWidth = imageHeight * targetAspectRatio
  }

  const MIN_SIZE = 50
  if (newWidth < MIN_SIZE) {
    newWidth = MIN_SIZE
    newHeight = newWidth / targetAspectRatio
  }
  if (newHeight < MIN_SIZE) {
    newHeight = MIN_SIZE
    newWidth = newHeight * targetAspectRatio
  }

  // Center within image bounds
  const newX = imageBox.x + (imageWidth - newWidth) / 2
  const newY = imageBox.y + (imageHeight - newHeight) / 2

  // Update crop rect
  cropRect.value = {
    x: newX,
    y: newY,
    width: newWidth,
    height: newHeight,
  }

  const cropNode = layerCropRef.value!.cropRectRef.getNode()
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
  const groupContainerNode = groupContainerRef.value.getNode()
  const currentScale = groupContainerNode.scaleX()

  // Calculate what the new scale would be
  const scaleBy = 1.05
  const zoomOut = e.evt.deltaY > 0
  const newScale = zoomOut ? currentScale * scaleBy : currentScale / scaleBy
  // Only zoom if the new scale would be >= MIN_SCALE
  if (newScale < MIN_SCALE.value) {
    zoom(
      groupContainerNode,
      undefined,
      MIN_SCALE.value / groupContainerNode.scaleX(),
      true,
    )
  } else {
    zoom(groupContainerNode, undefined, scaleBy, zoomOut)
  }
  cropRect.value = constrainCropRectToImageBounds(cropRect.value)
  // cover case zoom out at corner of the image
  centerCropRectInViewport(cropRect.value)
}

function resetOverlayPosition() {
  layerImageOverlayRef.value?.getNode().setAbsolutePosition({ x: 0, y: 0 })
}

/**
 * Center the crop rect in the viewport and move the image layer with it
 * This ensures the crop rect stays aligned with the image when centered
 * @param {object} rectToCenter - Optional rect to center. If not provided, uses current cropRect state
 */
function centerCropRectInViewport(rectToCenter?: IRect, skipMoveLayer?: boolean) {
  const rect = rectToCenter || cropRect.value
  if (!rect || rect.width === 0 || rect.height === 0) {
    return
  }

  // Calculate the center of the viewport (stage)
  const viewportCenterX = containerWidth / 2
  const viewportCenterY = containerHeight / 2

  // Calculate where the crop rect center currently is
  const cropCenterX = rect.x + rect.width / 2
  const cropCenterY = rect.y + rect.height / 2

  // Calculate how much we need to move the crop rect to center it
  const deltaX = viewportCenterX - cropCenterX
  const deltaY = viewportCenterY - cropCenterY

  // Update crop rect position
  Object.assign(cropRect.value, {
    x: rect.x + deltaX,
    y: rect.y + deltaY,
  })

  // Check if the cropRect is out of image bounds
  let isOutOfBounds = false

  if (skipMoveLayer) {
    const imageBox = groupMainRef.value.getNode().getClientRect({
      relativeTo: layerImageRef.value.getNode().getStage(),
    })

    if (imageBox) {
      const imageLeft = imageBox.x
      const imageRight = imageBox.x + imageBox.width
      const imageTop = imageBox.y
      const imageBottom = imageBox.y + imageBox.height

      // Check if cropRect is out of image bounds
      if (cropRect.value.x < imageLeft) {
        isOutOfBounds = true
      } else if (
        Math.round(cropRect.value.x + cropRect.value.width)
        > Math.round(imageRight)
      ) {
        isOutOfBounds = true
      }

      if (cropRect.value.y < imageTop) {
        isOutOfBounds = true
      } else if (
        Math.round(cropRect.value.y + cropRect.value.height)
        > Math.round(imageBottom)
      ) {
        isOutOfBounds = true
      }
    }
  }

  if (!skipMoveLayer || isOutOfBounds) {
    // Update layer position (this moves the image along with it)
    const layerNode = layerImageRef.value.getNode()
    layerNode.position({ x: layerNode.x() + deltaX, y: layerNode.y() + deltaY })
  }
  resetOverlayPosition()
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

  const layerNode = layerImageRef.value.getNode()
  const groupContainer = groupContainerRef.value.getNode()
  const groupMain = groupMainRef.value.getNode()

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
  const croppedDataUrl = groupMain.toDataURL({
    x: roundedCropX,
    y: roundedCropY,
    width: roundedCropWidth,
    height: roundedCropHeight,
    pixelRatio: window.devicePixelRatio || 1,
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
        groupOtherRef.value!.getNode().position({ x: 0, y: 0 })
        groupContainer.scale({ x: 1, y: 1 })
        groupContainer.position({ x: 0, y: 0 })
        groupMainConfig.value = cloneDeep(groupMainConfigInitial)
        MIN_SCALE.value = 1
        resetOverlayPosition()

        // Update the image with the cropped version
        image.value!.src = newImageUrl

        // Remove all shapes after cropping
        // rectangles.value = []
        // circles.value = []
        // arrows.value = []
        // lines.value = []
        // texts.value = []
        selectedIds.value = []

        // Exit crop mode
        cropRect.value = cloneDeep(initCropRect)
        tool.value = 'select'
        stage.batchDraw()
      }
      newImg.src = newImageUrl

      saveHistory({
        // lines: [],
        // arrows: [],
        // circles: [],
        // rectangles: [],
        // texts: [],
        ...createHistorySnapshot(),
        imageConfig: cloneDeep(imageConfig),
        groupMainConfig: cloneDeep(groupMainConfigInitial),
        // Crop state
        cropRect: { x: 0, y: 0, width: 0, height: 0 },
        // Selection state
        selectedIds: [],
        anchor1Config: { x: 0, y: 0 },
        anchor2Config: { x: 0, y: 0 },
        image: newImageUrl,
      })
    }, 'image/png')
  }

  croppedImg.src = croppedDataUrl
}

function handleSaveImage() {
  selectedIds.value = []
  const groupContainer = groupContainerRef.value.getNode()
  const groupMain = groupMainRef.value.getNode()
  if (!groupContainer || !groupMain) return

  // zoom out to original size
  zoom(
    groupContainer,
    undefined,
    groupContainer.scaleX(),
    false,
  )
  centerGroupMainInViewport()
  resetOverlayPosition()

  // get the image rect
  const imageRect = groupMain.getClientRect({ relativeTo: groupContainer })
  const dataURL = groupContainer.toDataURL({
    x: imageRect.x,
    y: imageRect.y,
    width: imageRect.width,
    height: imageRect.height,
    pixelRatio: window.devicePixelRatio || 1,
    quality: 1,
  })
  const link = document.createElement('a')
  link.download = 'stage.png'
  link.href = dataURL
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  // onClose()
}

function cancelCrop() {
  // Exit crop mode immediately to stop any ongoing animations or callbacks
  tool.value = 'select'

  // Reset crop rectangle to initial state
  cropRect.value = cloneDeep(initCropRect)

  // Restore groupMain rotation and position
  Object.assign(groupMainConfig.value, savedGroupMainConfig.value)

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

  const layerNode = layerImageRef.value.getNode()
  const groupContainer = groupContainerRef.value!.getNode()

  // Reset layer
  layerNode.position({ x: 0, y: 0 })
  groupOtherRef.value!.getNode().position({ x: 0, y: 0 })

  // Reset group container
  groupContainer.position({ x: 0, y: 0 })
  groupContainer.scale({
    x: 1,
    y: 1,
  })
  Object.assign(layerImagePosition, { x: 0, y: 0 })
  MIN_SCALE.value = 1
  resetOverlayPosition()

  // Force redraw of the layer
  layerNode.batchDraw()
}

const hasChanged = computed(() => {
  const hasShapes
    = lines.value.length > 0
      || arrows.value.length > 0
      || circles.value.length > 0
      || rectangles.value.length > 0
      || texts.value.length > 0
  // const imageWasCropped = imageUrl !== image;
  const brightnessWasChanged = brightness.value !== 0
  return hasShapes || brightnessWasChanged
})

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
  const bounds = {
    left: imageBox.x,
    top: imageBox.y,
    right: imageBox.x + imageBox.width,
    bottom: imageBox.y + imageBox.height,
  }

  return constrainBoxToBounds(rect, bounds)
}

/**
 * Recalculate cropMinScale based on current image bounds
 * This ensures users can zoom out enough to see the whole image
 */
function recalculateCropMinScale() {
  // Only recalculate if we're in crop mode
  if (tool.value !== 'crop') return

  if (
    !groupMainRef.value
    || !layerImageRef.value
    || !groupContainerRef.value
  )
    return

  const groupMainNode = groupMainRef.value.getNode()
  const groupContainer = groupContainerRef.value.getNode()
  const stage = layerImageRef.value.getNode().getStage()
  if (!stage) return

  // Force a redraw to ensure rotation/scale transformations are applied
  stage.batchDraw()

  // Get the actual bounding box of the transformed group (which includes rotation)
  // This gives us bounds in stage coordinates, accounting for groupContainer's current scale
  const imageBox = groupMainNode.getClientRect({ relativeTo: stage })
  if (!imageBox) return

  // Get current groupContainer scale to calculate the image size at scale 1
  const currentContainerScale = groupContainer.scaleX()

  // Calculate image dimensions at scale 1 (base size)
  const imageWidthAtScale1 = imageBox.width / currentContainerScale
  const imageHeightAtScale1 = imageBox.height / currentContainerScale

  // Add padding around image (same as in initCropScene)
  const paddingX = 3
  const paddingY = 3

  // Calculate available space in viewport (with padding)
  const availableWidth = containerWidth - paddingX * 2
  const availableHeight = containerHeight - paddingY * 2

  // Calculate scale factors needed to fit image with padding (at scale 1)
  // If image is larger than available space, we need to zoom out
  const scaleXNeeded
    = imageWidthAtScale1 > availableWidth
      ? availableWidth / imageWidthAtScale1
      : 1
  const scaleYNeeded
    = imageHeightAtScale1 > availableHeight
      ? availableHeight / imageHeightAtScale1
      : 1

  // Use the smaller scale factor to ensure both dimensions fit
  const targetScale = Math.min(scaleXNeeded, scaleYNeeded)

  // Only update if we need to zoom out (targetScale < 1) and ensure it's not too small
  if (targetScale < 1) {
    const finalScale = Math.max(targetScale, 0.1) // Minimum scale of 0.1 (10%)
    MIN_SCALE.value = finalScale
  } else {
    // If image fits without zooming, set min scale to 1
    MIN_SCALE.value = 1
  }
}

/**
 * Adjust groupMain and layerImageRef positions after rotation to keep groupMain's center
 * fixed relative to groupContainer (for correct zoom) while maintaining visual position
 * also adjusts groupOther to keep it at the same absolute position
 */
function adjustPositionsAfterRotation(
  groupMainNode: Group,
  layerNode: Layer,
  groupContainerNode: Group,
  groupMainCenterBefore: { x: number, y: number },
  finalX: number,
  finalY: number,
) {
  // Get groupMain's center in groupContainer coordinates after rotation
  const groupMainBoxAfter = groupMainNode.getClientRect({
    relativeTo: groupContainerNode,
  })
  if (!groupMainBoxAfter) {
    return { adjustedX: finalX, adjustedY: finalY }
  }

  const groupMainCenterAfter = {
    x: groupMainBoxAfter.x + groupMainBoxAfter.width / 2,
    y: groupMainBoxAfter.y + groupMainBoxAfter.height / 2,
  }

  // Calculate delta in groupContainer coordinates
  const deltaContainerX = groupMainCenterBefore.x - groupMainCenterAfter.x
  const deltaContainerY = groupMainCenterBefore.y - groupMainCenterAfter.y

  // Adjust groupMain's position to keep its center fixed relative to groupContainer
  const adjustedX = finalX + deltaContainerX
  const adjustedY = finalY + deltaContainerY
  groupMainNode.position({ x: adjustedX, y: adjustedY })

  // Convert delta from groupContainer coordinates to stage coordinates
  // Since groupContainer is inside layerImageRef, we need to account for groupContainer's scale
  const groupContainerScale = groupContainerNode.scaleX()
  const deltaStageX = deltaContainerX * groupContainerScale
  const deltaStageY = deltaContainerY * groupContainerScale

  // Compensate by adjusting layerImageRef position to keep visual position fixed
  const currentLayerPos = layerNode.position()
  layerNode.position({
    x: currentLayerPos.x - deltaStageX,
    y: currentLayerPos.y - deltaStageY,
  })

  // Adjust groupOther to keep it at the same absolute position
  // Since groupOther is inside groupContainer, which moves with layerImageRef,
  // we need to move groupOther in the opposite direction in groupContainer coordinates
  // to compensate for the layer movement
  const groupOtherNode = groupOtherRef.value!.getNode()
  const currentGroupOtherPos = groupOtherNode.position()
  groupOtherNode.position({
    x: currentGroupOtherPos.x + deltaContainerX,
    y: currentGroupOtherPos.y + deltaContainerY,
  })

  return { adjustedX, adjustedY }
}

let isAnimating = false
// Rotate a shape around any point.
// shape is a Konva shape
// angleDegrees is the angle to rotate by, in degrees
// point is an object {x: posX, y: posY}
function rotateAroundPoint(shape: Shape, angleDegrees: number, point: { x: number, y: number }, skipAnimation = false) {
  // Store initial state
  const startX = shape.x()
  const startY = shape.y()
  const startRotation = shape.rotation()
  const targetRotation = startRotation + angleDegrees
  const angleRadians = angleDegrees * Math.PI / 180

  // Get groupMain's center in groupContainer coordinates before rotation
  // This ensures zoom will work correctly after rotation, regardless of layerImageRef position
  const groupMainNode = groupMainRef.value.getNode()
  const layerNode = layerImageRef.value.getNode()
  const groupContainerNode = groupContainerRef.value.getNode()
  const stage = layerNode.getStage()
  let groupMainCenterBefore = null
  if (groupMainNode && groupContainerNode && stage) {
    // Force redraw to ensure current state is accurate
    stage.batchDraw()
    // Get groupMain's center in groupContainer coordinates (not affected by layerImageRef position)
    const groupMainBoxBefore = groupMainNode.getClientRect({
      relativeTo: groupContainerNode,
    })
    if (groupMainBoxBefore) {
      groupMainCenterBefore = {
        x: groupMainBoxBefore.x + groupMainBoxBefore.width / 2,
        y: groupMainBoxBefore.y + groupMainBoxBefore.height / 2,
      }
    }
  }

  // Calculate final position
  const finalX
    = point.x
      + (startX - point.x) * Math.cos(angleRadians)
      - (startY - point.y) * Math.sin(angleRadians)
  const finalY
    = point.y
      + (startX - point.x) * Math.sin(angleRadians)
      + (startY - point.y) * Math.cos(angleRadians)

  if (skipAnimation) {
    shape.rotation(targetRotation)
    shape.x(finalX)
    shape.y(finalY)

    // Adjust positions to keep groupMain's center fixed relative to groupContainer
    const { adjustedX, adjustedY } = adjustPositionsAfterRotation(
      groupMainNode,
      layerNode,
      groupContainerNode,
      groupMainCenterBefore!,
      finalX,
      finalY,
    )

    // Update config to match the actual node state
    groupMainConfig.value.rotation = targetRotation
    groupMainConfig.value.x = adjustedX
    groupMainConfig.value.y = adjustedY
    cropRect.value = constrainCropRectToImageBounds(cropRect.value)
    centerCropRectInViewport(undefined, true)
    // Recalculate cropMinScale after rotation
    recalculateCropMinScale()
    return
  }

  // Animation parameters
  const duration = 250 // milliseconds
  let elapsed = 0

  const anim = new Konva.Animation((frame) => {
    elapsed += frame.timeDiff
    const progress = Math.min(elapsed / duration, 1) // 0 to 1

    // Use easing function for smooth animation (ease-in-out)
    const easedProgress = progress < 0.5
      ? 2 * progress * progress
      : 1 - (-2 * progress + 2) ** 2 / 2

    // Calculate current rotation based on progress
    const currentRotation = startRotation + angleDegrees * easedProgress

    // Calculate position based on current rotation angle
    const currentAngleRadians = (currentRotation - startRotation) * Math.PI / 180
    const currentX
      = point.x
        + (startX - point.x) * Math.cos(currentAngleRadians)
        - (startY - point.y) * Math.sin(currentAngleRadians)
    const currentY
      = point.y
        + (startX - point.x) * Math.sin(currentAngleRadians)
        + (startY - point.y) * Math.cos(currentAngleRadians)

    // Update shape
    shape.rotation(currentRotation)
    shape.x(currentX)
    shape.y(currentY)

    // Stop animation when complete
    if (progress >= 1) {
      // Ensure final values are exactly correct
      shape.rotation(targetRotation)
      shape.x(finalX)
      shape.y(finalY)

      // Adjust positions to keep groupMain's center fixed relative to groupContainer
      const { adjustedX, adjustedY } = adjustPositionsAfterRotation(
        groupMainNode,
        layerNode,
        groupContainerNode,
        groupMainCenterBefore!,
        finalX,
        finalY,
      )

      // Update config to match the actual node state
      groupMainConfig.value.rotation = targetRotation
      groupMainConfig.value.x = adjustedX
      groupMainConfig.value.y = adjustedY

      cropRect.value = constrainCropRectToImageBounds(cropRect.value)
      centerCropRectInViewport(undefined, true)
      // Recalculate cropMinScale after rotation
      recalculateCropMinScale()

      anim.stop()
      isAnimating = false
    }
  }, shape.getLayer())

  // Start animation
  anim.start()
  isAnimating = true
}

// #region rotation and reflection
function handleRotate() {
  // Scale image to fit container if needed after rotation
  if (!imageRef.value || !layerImageRef.value || !groupMainRef.value) {
    return
  }

  const groupMainNode = groupMainRef.value.getNode()
  const layerNode = layerImageRef.value.getNode()
  const stage = layerNode.getStage()
  if (!stage || isAnimating) return

  const groupContainer = groupContainerRef.value!.getNode()
  // Calculate viewport center in stage coordinates
  const viewportCenterX = containerWidth / 2
  const viewportCenterY = containerHeight / 2

  // Convert viewport center from stage coordinates to groupContainer's coordinate system
  // Since groupMainNode's x/y are relative to groupContainer, we need the rotation point
  // to also be in groupContainer's coordinate system
  const groupContainerTransform = groupContainer
    ? groupContainer.getAbsoluteTransform().copy().invert()
    : null

  let rotationPoint
  if (groupContainerTransform) {
    const viewportCenterInContainer = groupContainerTransform.point({
      x: viewportCenterX,
      y: viewportCenterY,
    })
    rotationPoint = {
      x: viewportCenterInContainer.x,
      y: viewportCenterInContainer.y,
    }
  } else {
    // Fallback to stage coordinates if groupContainer is not available
    rotationPoint = {
      x: viewportCenterX,
      y: viewportCenterY,
    }
  }
  // Apply rotation around the viewport center
  rotateAroundPoint(groupMainNode, -90, rotationPoint)
}

function handleFlip(direction: 'horizontal' | 'vertical') {
  // When rotating by 90/270 degrees, the image dimensions swap
  // So we need to swap the crop rect dimensions as well
  const newRotation = ((groupMainConfig.value.rotation % 360) + 360) % 360
  const is90or270 = newRotation === 90 || newRotation === 270
  if (isAnimating) return

  // Determine actual flip axis based on rotation
  // At 90/270 degrees, horizontal flip becomes vertical and vice versa
  const actualDirection = is90or270
    ? (direction === 'horizontal' ? 'vertical' : 'horizontal')
    : direction

  flipImage(actualDirection)
}

function flipImage(axis: 'horizontal' | 'vertical') {
  const groupMainNode = groupMainRef.value.getNode()
  const groupContainer = groupContainerRef.value.getNode()

  // Get groupMain's bounding box in groupContainer's coordinate system
  // We'll flip around groupMain's center, not the viewport center
  // This prevents unwanted movement when the image is positioned off-center
  const groupMainBox = groupMainNode.getClientRect({
    relativeTo: groupContainer,
  })

  if (!groupMainBox) return
  isAnimating = true

  // Calculate groupMain's center in groupContainer's coordinate system
  // Use the bounding box center which accounts for rotation
  const flipPoint = {
    x: groupMainBox.x + groupMainBox.width / 2,
    y: groupMainBox.y + groupMainBox.height / 2,
  }

  // Get current groupMain position and rotation
  const currentX = groupMainNode.x()
  const currentY = groupMainNode.y()
  const currentRotation = groupMainNode.rotation()

  // Convert the position relative to flip point to local coordinates (accounting for rotation)
  const dx = currentX - flipPoint.x
  const dy = currentY - flipPoint.y

  // Rotate the vector to local coordinates (undo rotation to get to shape's local space)
  const angleRad = (-currentRotation * Math.PI) / 180
  const cosAngle = Math.cos(angleRad)
  const sinAngle = Math.sin(angleRad)

  const localDx = dx * cosAngle - dy * sinAngle
  const localDy = dx * sinAngle + dy * cosAngle

  // Flip in local coordinates based on axis
  const flippedLocalDx = axis === 'horizontal' ? -localDx : localDx
  const flippedLocalDy = axis === 'vertical' ? -localDy : localDy

  // Rotate back to world coordinates (groupContainer's coordinate system)
  // Use inverse rotation: cos(-angleRad) = cos(angleRad), sin(-angleRad) = -sin(angleRad)
  const flippedDx = flippedLocalDx * cosAngle - flippedLocalDy * -sinAngle
  const flippedDy = flippedLocalDx * -sinAngle + flippedLocalDy * cosAngle

  // Calculate new position
  const newX = flipPoint.x + flippedDx
  const newY = flipPoint.y + flippedDy

  // Determine which scale axis to flip
  const updateProps: { scaleX?: number, scaleY?: number, x: number, y: number } = {
    x: newX,
    y: newY,
  }

  if (axis === 'horizontal') {
    updateProps.scaleX = groupMainConfig.value.scaleX * -1
  } else {
    updateProps.scaleY = groupMainConfig.value.scaleY * -1
  }

  // Animate the flip
  groupMainNode.to({
    ...updateProps,
    duration: 0.25,
    easing: Konva.Easings.EaseInOut,
    onFinish: () => {
      // Update config to match the actual node state
      Object.assign(groupMainConfig.value, updateProps)
      isAnimating = false
    },
  })
}

function createRectangle() {
  const initialX = containerWidth / 2 - 50
  const initialY = containerHeight / 2 - 50
  const hasShapeAtCenter = rectangles.value.some((r: RectConfig) => Math.abs(r.x! - initialX) < 5 && Math.abs(r.y! - initialY) < 5)

  let x, y
  if (hasShapeAtCenter) {
    const last = rectangles.value.at(-1)!
    const maxX = containerWidth - 100
    const maxY = containerHeight - 100
    const atBoundary = last.x! >= maxX - 1 || last.y! >= maxY - 1
    x = atBoundary ? last.x! : Math.min(last.x! + 20, maxX)
    y = atBoundary ? last.y! : Math.min(last.y! + 20, maxY)
  } else {
    x = initialX
    y = initialY
  }

  const newRect = {
    id: `rect-${rectangles.value.length + 1}-${Date.now().toString(36)}`,
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
  const hasShapeAtCenter = circles.value.some((c: CircleConfig) => Math.abs(c.x! - centerX) < 5 && Math.abs(c.y! - centerY) < 5)

  let x, y
  if (hasShapeAtCenter) {
    const last = circles.value.at(-1)!
    const maxX = containerWidth - 50
    const maxY = containerHeight - 50
    const atBoundary = last.x! >= maxX - 1 || last.y! >= maxY - 1
    x = atBoundary ? last.x! : Math.min(last.x! + 20, maxX)
    y = atBoundary ? last.y! : Math.min(last.y! + 20, maxY)
  } else {
    x = centerX
    y = centerY
  }

  const newCircle = {
    id: `circle-${circles.value.length + 1}-${Date.now().toString(36)}`,
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
  const lineLength = 100
  // For a 45-degree line, calculate the delta using trigonometry
  // 45 degrees = π/4 radians
  // cos(45°) = sin(45°) = √2/2 ≈ 0.7071
  const halfLength = lineLength / 2
  const delta = (halfLength * Math.sqrt(2)) / 2 // halfLength * cos(45°)

  const centerX = containerWidth / 2
  const centerY = containerHeight / 2
  const hasShapeAtCenter = lines.value.some((l: LineConfig) => Math.abs(l.x! - centerX) < 5 && Math.abs(l.y! - centerY) < 5)

  let x, y
  if (hasShapeAtCenter) {
    const last = lines.value.at(-1)!
    const maxX = containerWidth - delta
    const maxY = containerHeight - delta
    const atBoundary = last.x! >= maxX - 1 || last.y! >= maxY - 1
    x = atBoundary ? last.x! : Math.min(last.x! + 20, maxX)
    y = atBoundary ? last.y! : Math.min(last.y! + 20, maxY)
  } else {
    x = centerX
    y = centerY
  }

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
    id: `line-${lines.value.length + 1}-${Date.now().toString(36)}`,
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
  const lineLength = 100
  // For a 45-degree line, calculate the delta using trigonometry
  // 45 degrees = π/4 radians
  // cos(45°) = sin(45°) = √2/2 ≈ 0.7071
  const halfLength = lineLength / 2
  const delta = (halfLength * Math.sqrt(2)) / 2 // halfLength * cos(45°)

  const centerX = containerWidth / 2
  const centerY = containerHeight / 2
  const hasShapeAtCenter = arrows.value.some((a: ArrowConfig) => Math.abs(a.x! - centerX) < 5 && Math.abs(a.y! - centerY) < 5)

  let x, y
  if (hasShapeAtCenter) {
    const last = arrows.value.at(-1)!
    const maxX = containerWidth - delta
    const maxY = containerHeight - delta
    const atBoundary = last.x! >= maxX - 1 || last.y! >= maxY - 1
    x = atBoundary ? last.x! : Math.min(last.x! + 20, maxX)
    y = atBoundary ? last.y! : Math.min(last.y! + 20, maxY)
  } else {
    x = centerX
    y = centerY
  }

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
    id: `arrow-${arrows.value.length + 1}-${Date.now().toString(36)}`,
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
  const defaultWidth = 68
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
    id: `text-${texts.value.length + 1}-${Date.now().toString(36)}`,
    name: 'text',
    x,
    y,
    textConfig: {
      text: defaultText,
      width: defaultWidth,
      fontSize: defaultFontSize,
      fill: DEFAULT_STROKE_COLOR,
      fontFamily: 'Noto Sans JP',
      padding: 4,
    },
    tagConfig: {
      // text background color
      fill: 'transparent',
      // text border color
      stroke: 'transparent',
      // text border width
      strokeWidth: 2,
      // text background color visibility
      showBackground: false,
      // text border color visibility
      showBorder: false,
    },
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
  const groupContainerNode = groupContainerRef.value!.getNode()
  zoom(groupContainerNode, undefined, scaleBy, true)
  updateToolbarPosition()
}
function handleZoomOut() {
  if (tool.value === 'select') {
    const scaleBy = 1.1
    const groupContainer = groupContainerRef.value!.getNode()
    const newScale = groupContainer.scaleX() / scaleBy
    // Only zoom if the new scale would be >= MIN_SCALE
    if (newScale < MIN_SCALE.value) {
      zoom(
        groupContainer,
        undefined,
        MIN_SCALE.value / groupContainer.scaleX(),
        false,
      )
      centerGroupMainInViewport()
      resetOverlayPosition()
    } else {
      zoom(groupContainer, undefined, scaleBy, false)
    }
    updateToolbarPosition()
  }
  if (tool.value === 'crop') {
    const scaleBy = 1.1
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
      centerGroupMainInViewport()
      cropRect.value = constrainCropRectToImageBounds(cropRect.value)
      centerCropRectInViewport(undefined, true)
    } else {
      zoom(groupContainer, undefined, scaleBy, false)
      cropRect.value = constrainCropRectToImageBounds(cropRect.value)
      centerCropRectInViewport()
    }
  }
}

async function centerGroupMainInViewport() {
  const groupMainNode = groupMainRef.value.getNode()
  const stage = groupMainNode.getStage()
  const groupContainerNode = groupContainerRef.value.getNode()

  // Reset layer position to (0,0) to ensure coordinate calculations are correct
  // The layer can be dragged (in crop/select mode), and if it has a non-zero position,
  // it affects getAbsoluteTransform() calculations, causing zoom to use wrong center point
  layerImageRef.value.getNode().position({
    x: 0,
    y: 0,
  })

  // Get the bounding box of groupMain in groupContainer's coordinate system (accounts for rotation)
  // This is the key: getClientRect relative to parent gives us the center position in parent coords
  const groupMainBox = groupMainNode.getClientRect({
    relativeTo: groupContainerNode,
  })

  // Calculate current center in groupContainer's coordinate system
  const currentCenterContainerX = groupMainBox.x + groupMainBox.width / 2
  const currentCenterContainerY = groupMainBox.y + groupMainBox.height / 2

  // Convert stage center to groupContainer's coordinate system
  const stageCenterX = stage.width() / 2
  const stageCenterY = stage.height() / 2
  const groupContainerTransform = groupContainerNode.getAbsoluteTransform().copy().invert()
  const targetCenterContainer = groupContainerTransform.point({
    x: stageCenterX,
    y: stageCenterY,
  })

  // Calculate delta in groupContainer's coordinate system
  const deltaX = targetCenterContainer.x - currentCenterContainerX
  const deltaY = targetCenterContainer.y - currentCenterContainerY

  // Move the node's origin by this delta
  const currentPos = groupMainNode.position()
  const newX = currentPos.x + deltaX
  const newY = currentPos.y + deltaY

  Object.assign(groupMainConfig.value, {
    x: newX,
    y: newY,
  })
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
      const rectNode = shapeRefs.value.get(rect.id!)!.getNode()
      if (!rectNode) return false
      return Util.haveIntersection(selBox, rectNode.getClientRect())
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
      const lineNode = shapeRefs.value.get(line.id!)!.getNode()
      if (!lineNode) return false
      return Util.haveIntersection(selBox, lineNode.getClientRect())
    })

    const selectedTexts = texts.value.filter((text) => {
    // Check if text intersects with selection box
      const textNode = shapeRefs.value.get(text.id!)!.getNode()
      if (!textNode) return false
      return Util.haveIntersection(selBox, textNode.getClientRect())
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
const showToolbarTextSettings = ref(false)
const currentFillColor = ref<string | null>(DEFAULT_STROKE_COLOR)
const currentStrokeColor = ref<string | null>(DEFAULT_STROKE_COLOR)
const currentStrokeWidth = ref<number>(DEFAULT_STROKE_WIDTH)
const currentTextConfig = ref({
  showBackground: false,
  showBorder: false,
})
const isSelectingLinearShape = ref(false)
const anchor1Config = ref({ x: 0, y: 0 })
const anchor2Config = ref({ x: 0, y: 0 })

function updateLinearShape(points: number[]) {
  const id = selectedIds.value[0]!
  if (id.includes('line')) {
    const line = lines.value.find(line => line.id === id)!
    line.points = points
  } else if (id.includes('arrow')) {
    const arrow = arrows.value.find(arrow => arrow.id === id)!
    arrow.points = points
  }
}

// Update transformer nodes when selection changes
watch(selectedIds, (newValue) => {
  if (newValue.length > 0) {
    const nodes = newValue.map(id => shapeRefs.value.get(id).getNode())
    if (
      newValue.length === 1
      && ['line', 'arrow'].includes(nodes[0]!.name())
    ) {
      isSelectingLinearShape.value = true
      anchor1Config.value = { x: nodes[0]!.x() + nodes[0]!.points()[0], y: nodes[0]!.y() + nodes[0]!.points()[1] }
      anchor2Config.value = { x: nodes[0]!.x() + nodes[0]!.points()[2], y: nodes[0]!.y() + nodes[0]!.points()[3] }
      transformerRef.value.getNode().nodes([])
    } else {
      isSelectingLinearShape.value = false
      transformerRef.value.getNode().nodes(nodes)
    }
    initializeSelection(newValue)
  } else {
    // Clear selection
    transformerRef.value.getNode().nodes([])
    toolbarPosition.value = { x: 0, y: 0, visible: false }
    isSelectingLinearShape.value = false
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
    const shape = shapeRefs.value.get(selectedIds.value[0]!)!.getNode()
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
    showToolbarTextSettings.value = false
  } else if (
    (hasLines || hasArrows)
    && !hasTexts
    && !hasRectangles
    && !hasCircles
  ) {
    // If ids includes only lines or arrows (no texts, circles, or rectangles)
    showToolbarFillColor.value = false
    showToolbarStrokeSettings.value = true
    showToolbarTextSettings.value = false
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
    showToolbarTextSettings.value = true
  } else {
    // Mixed selection or other cases - show both by default
    showToolbarFillColor.value = true
    showToolbarStrokeSettings.value = true
    showToolbarTextSettings.value = false
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
    currentFillColor.value = text.textConfig.fill as string || DEFAULT_STROKE_COLOR // Text uses fill for color
    currentTextConfig.value = {
      showBackground: text.tagConfig.showBackground,
      showBorder: text.tagConfig.showBorder,
    }
    currentStrokeColor.value = null // Text doesn't have stroke
    currentStrokeWidth.value = 0
  }
}

function handleStageClick(e: KonvaEventObject<MouseEvent>) {
  // if we are selecting with rect, do nothing
  if (selectionRectangle.value.visible) return

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
    // anchor1Config: cloneDeep(anchor1Config),
    // anchor2Config: cloneDeep(anchor2Config),
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

let initialSnapshot: Record<string, any> | null = null
function initHistory() {
  initialSnapshot = createHistorySnapshot()
  history.value = [cloneDeep(initialSnapshot)]
  historyStep.value = 0
}

// function handleCloseModal() {
//     if (
//       isEqual(initialSnapshot, history.value[historyStep.value])
//     ) {
//       onClose()
//     } else {
//       setOpenConfirmDialog(true)
//     }
//   }

function restoreFromSnapshot(snapshot: Record<string, any>) {
  rectangles.value = snapshot.rectangles || []
  circles.value = snapshot.circles || []
  lines.value = snapshot.lines || []
  arrows.value = snapshot.arrows || []
  texts.value = snapshot.texts || []
  image.value!.src = snapshot.imageSrc
  groupMainConfig.value = snapshot.groupMainConfig || cloneDeep(groupMainConfigInitial)
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
  newSelectedIds.forEach(selectedId => dragIds.value.add(selectedId))
}

function commitDragEnd(id: string) {
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
      saveHistory()
      // Reset tracking
      // snapshotResult.value = {}
      // Update toolbar position after drag
      updateToolbarPosition()
    }
    dragHistoryTimeoutRef.value = null
  }, 50) // 50ms debounce - enough time for multiple drags to complete
}

function handleTransformStart() {
  dragIds.value.clear()
  // Track which IDs are being dragged (use selectedIds if available, otherwise will be added in handleDragEnd)
  selectedIds.value.forEach(selectedId => dragIds.value.add(selectedId))
}

function commitTransformEnd(id: string) {
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
      saveHistory()
      // Reset tracking
      // snapshotResult.value = {}
      // Update toolbar position after transform
      updateToolbarPosition()
    }
    dragHistoryTimeoutRef.value = null
  }, 50) // 50ms debounce - enough time for multiple drags to complete
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

function toggleTextBackgroundColor() {
  const firstSelected = texts.value.find(t => selectedIds.value.includes(t.id!))
  if (!firstSelected) return
  const turnOn = !firstSelected.tagConfig?.showBackground
  currentTextConfig.value.showBackground = turnOn
  selectedIds.value.forEach((id) => {
    const text = texts.value.find(t => t.id === id)
    if (text) {
      if (!turnOn) {
        text.tagConfig.showBackground = false
        text.tagConfig.fill = 'transparent'
      } else {
        text.tagConfig.showBackground = true
        text.tagConfig.fill = 'white'
      }
    }
  })
  saveHistory()
};

function toggleTextBorderColor() {
  const firstSelected = texts.value.find(t => selectedIds.value.includes(t.id!))
  if (!firstSelected) return

  const turnOn = !firstSelected.tagConfig?.showBorder
  currentTextConfig.value.showBorder = turnOn
  selectedIds.value.forEach((id) => {
    const text = texts.value.find(t => t.id === id)
    if (text) {
      if (!turnOn) {
        text.tagConfig.showBorder = false
        text.tagConfig.stroke = 'transparent'
      } else {
        text.tagConfig.showBorder = true
        text.tagConfig.stroke = text.textConfig.fill
      }
    }
  })
  saveHistory()
};

function setFontSize(size: number) {
  selectedIds.value.forEach((id) => {
    const text = texts.value.find(t => t.id === id)
    if (text) {
      text.textConfig.fontSize = size
    }
  })
  saveHistory()
  nextTick(() => {
    transformerRef.value!.getNode().forceUpdate()
    updateToolbarPosition()
  })
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

const [DefineBrightnessPopup, BrightnessPopup] = createReusableTemplate()
const [DefineToolbarButton, ToolbarButton] = createReusableTemplate()

const toolbarButtons = [
  { as: ToolbarButton, label: 'Undo', value: 'save', onClick: handleSaveImage, icon: 'ph:arrow-arc-left-bold' },
  { as: ToolbarButton, label: 'Undo', value: 'undo', onClick: handleUndo, disabled: () => !canUndo.value, icon: 'ph:arrow-arc-left-bold' },
  { as: ToolbarButton, label: 'Redo', value: 'redo', onClick: handleRedo, disabled: () => !canRedo.value, icon: 'ph:arrow-arc-right-bold' },
  { as: ToolbarButton, label: 'Move', value: 'select', onClick: () => setTool('select'), icon: 'ph:cursor-bold' },
  { as: ToolbarButton, label: 'Select', value: 'multiselect', onClick: () => setTool('multiselect'), icon: 'ph:selection-bold' },
  { as: ToolbarButton, label: 'Circle', value: 'circle', onClick: createCircle, icon: 'ph:circle-bold' },
  { as: ToolbarButton, label: 'Rectangle', value: 'rectangle', onClick: createRectangle, icon: 'ph:rectangle-bold' },
  { as: ToolbarButton, label: 'Arrow', value: 'arrow', icon: 'ph:arrow-up-right-bold' },
  { as: ToolbarButton, label: 'Line', value: 'line', onClick: createLine, icon: 'ph:line-vertical-bold' },
  { as: ToolbarButton, label: 'Text', value: 'text', onClick: createText, icon: 'ph:text-aa-bold' },
  { as: BrightnessPopup, label: 'Brightness', value: 'brightness', icon: 'ph:sun-dim-bold' },
  { as: ToolbarButton, label: 'Crop', value: 'crop', onClick: initCropScene, icon: 'ph:crop-bold' },
]

// #region custom cursor
const rotateIconImage = new Image()
rotateIconImage.src = svgToURL('<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 640 640"><path fill="black" d="M544.1 256h7.9c13.3 0 24-10.7 24-24V88c0-9.7-5.8-18.5-14.8-22.2S541.9 64.2 535 71l-51.7 51.8C439 86.1 382 64 320 64C191 64 84.3 159.4 66.6 283.5c-2.5 17.5 9.6 33.7 27.1 36.2s33.7-9.7 36.2-27.1C143.2 199.5 223.3 128 320 128c44.4 0 85.2 15 117.7 40.3L391 215c-6.9 6.9-8.9 17.2-5.2 26.2S398.3 256 408 256zm29.4 100.5c2.5-17.5-9.7-33.7-27.1-36.2s-33.7 9.7-36.2 27.1c-13.3 93-93.4 164.5-190.1 164.5c-44.4 0-85.2-15-117.7-40.3L249 425c6.9-6.9 8.9-17.2 5.2-26.2S241.7 384 232 384H88c-13.3 0-24 10.7-24 24v144c0 9.7 5.8 18.5 14.8 22.2s19.3 1.6 26.2-5.2l51.8-51.8C201 553.9 258 576 320 576c129 0 235.7-95.4 253.4-219.5z"/></svg>')
const rotateIconSize = 12

const rotateIcon = new Konva.Image({
  name: 'rotate-icon',
  image: rotateIconImage,
  x: 0,
  y: 0,
  width: rotateIconSize,
  height: rotateIconSize,
  listening: false,
})

const cursorRotate = getRotatedCursor()

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
function logPosition() {
  const stage = stageRef.value.getNode()
  const groupMainNode = groupMainRef.value.getNode()
  const groupMainBox = groupMainNode.getClientRect({
    relativeTo: stage,
  })
  console.log(
    'groupContainer',
    groupContainerRef.value.getNode().position(),
    'groupMain',
    groupMainNode.position(),
    'groupMainBox',
    groupMainBox,
    'absolutePosition',
    groupMainNode.absolutePosition(),
    'layerImage',
    layerImageRef.value.getNode().position(),
  )
}

function customRotateCursor() {
  const transformerNode = transformerRef.value!.getNode() as Transformer
  if (transformerNode.getActiveAnchor() === 'rotater') {
    const rotatedCursor = getRotatedCursor(transformerNode.rotation())
    cursorStyle.value = `url(${rotatedCursor}) 8 8, auto`
  }
}

const isLayerImageDraggable = computed(() => tool.value === 'crop' || tool.value === 'select')

provide('editImageContext', {
  transformerRef,
  imageRef,
  layerImageRef,
  cropRect,
  centerCropRectInViewport,
})
defineExpose({ loadImage })
</script>

<template>
  <div>
    <DefineToolbarButton v-slot="{ item }">
      <button
        class="btn btn-icon btn-text"
        :class="{ 'btn-active': item.value === tool }"
        :title="item.label"
        :disabled="toValue(item.disabled)"
        @click="item.onClick"
      >
        <Icon :name="item.icon" />
      </button>
    </DefineToolbarButton>
    <DefineBrightnessPopup>
      <Dropdown>
        <button class="btn btn-icon btn-text">
          <Icon name="ph:sun-dim-bold" />
        </button>
        <template #popover>
          <div class="flex w-67 items-center gap-4 rounded-sm border border-abd px-2 py-1">
            <Slider
              v-model="brightness"
              :min="-100"
              class="flex w-full items-center justify-center"
              expand-on-hover
            >
              <template #left="{ hovered, panning }">
                <div
                  :style="{
                    color:
                      hovered || panning
                        ? 'rgb(255,255,255)'
                        : 'rgb(120,113,108)',
                  }"
                  class="flex w-6 shrink-0 justify-start transition-colors"
                >
                  <Icon name="lucide:volume-x" />
                </div>
              </template>
              <template #right="{ hovered, panning }">
                <div
                  :style="{
                    color:
                      hovered || panning
                        ? 'rgb(255,255,255)'
                        : 'rgb(120,113,108)',
                  }"
                  class="flex w-6 shrink-0 justify-end transition-colors"
                >
                  <Icon name="lucide:volume-2" />
                </div>
              </template>
            </Slider>
            <MaskedInput
              v-model:typed="brightness" class="w-14"
              inputmode="numeric"
              :model-value="brightness.toString()"
              :mask-options="{
                mask: Number,
                min: -100,
                max: 100,
                autofix: true,
              }"
            />
          </div>
        </template>
      </Dropdown>
    </DefineBrightnessPopup>
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
                    filters: [Konva.Filters.Brighten],
                    brightness: brightness / 100,
                  }"
                  @dragstart="handleImageDragStart"
                />
              </v-group>
              <v-group ref="groupOtherRef" name="group-other">
                <Rect
                  v-for="rect in rectangles" :key="rect.id"
                  :config="rect"
                  @dragstart="handleDragStart"
                  @drag-end="commitDragEnd"
                  @transformstart="handleTransformStart"
                  @transform-end="commitTransformEnd"
                  @update-config="Object.assign(rect, $event)"
                />
                <Circle
                  v-for="circle in circles" :key="circle.id"
                  :config="circle"
                  @dragstart="handleDragStart"
                  @drag-end="commitDragEnd"
                  @transformstart="handleTransformStart"
                  @transform-end="commitTransformEnd"
                  @update-config="Object.assign(circle, $event)"
                />
                <Line
                  v-for="line in lines" :key="line.id"
                  :config="line"
                  @dragstart="handleDragStart"
                  @drag-end="commitDragEnd"
                  @transformstart="handleTransformStart"
                  @transform-end="commitTransformEnd"
                  @update-config="Object.assign(line, $event)"
                  @update-anchor1-config="Object.assign(anchor1Config, $event)"
                  @update-anchor2-config="Object.assign(anchor2Config, $event)"
                />
                <AnchorLinearShape
                  v-if="isSelectingLinearShape"
                  v-model:anchor1-config="anchor1Config"
                  v-model:anchor2-config="anchor2Config"
                  :is-mousing-down="isMousingDown"
                  @save-history="saveHistory"
                  @update-toolbar-position="updateToolbarPosition"
                  @update-linear-shape="updateLinearShape"
                />
                <Text
                  v-for="text in texts" :key="text.id"
                  :config="text"
                  :stage-height="stageConfig.height"
                  @hide-toolbar-position="toolbarPosition = { x: 0, y: 0, visible: false }"
                  @dragstart="handleDragStart"
                  @drag-end="commitDragEnd"
                  @transform-start="handleTransformStart"
                  @transform-end="commitTransformEnd"
                  @update-config="(payload) => {
                    const { textConfig, tagConfig, ...rest } = payload
                    Object.assign(text, rest)
                    if (textConfig) Object.assign(text.textConfig, textConfig)
                    if (tagConfig) Object.assign(text.tagConfig, tagConfig)
                  }"
                  @save-history="saveHistory"
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
          <LayerCrop
            v-if="tool === 'crop'" ref="layerCropRef"
            :container-width="stageConfig.width"
            :container-height="stageConfig.height"
          />
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
          <button
            v-if="showToolbarTextSettings"
            class="btn btn-icon btn-text"
            @click="toggleTextBackgroundColor"
          >
            <Icon :style="{ color: currentTextConfig.showBackground ? currentFillColor : 'currentColor' }" name="ic:outline-format-color-fill" />
          </button>
          <button
            v-if="showToolbarTextSettings"
            class="btn btn-icon btn-text"
            @click="toggleTextBorderColor"
          >
            <Icon :style="{ color: currentTextConfig.showBorder ? currentFillColor : 'currentColor' }" name="lineicons:pen-to-square" />
          </button>
        </div>
        <!-- edit image toolbar -->
        <div
          class="absolute top-0 -right-4 flex translate-x-full flex-col rounded-sm border border-elevated"
        >
          <button class="btn btn-icon btn-text" @click="logPosition">
            <Icon name="lucide:rotate-ccw" />
          </button>
          <button class="btn btn-icon btn-text" @click="handleRotate">
            <Icon name="lucide:rotate-ccw" />
          </button>
          <button
            class="btn btn-icon btn-text"
            :class="{ 'btn-active': groupMainConfig.scaleX === -1 }"
            @click="handleFlip('horizontal')"
          >
            <Icon name="lucide:flip-horizontal" />
          </button>
          <button class="btn btn-icon btn-text" :class="{ 'btn-active': groupMainConfig.scaleY === -1 }" @click="handleFlip('vertical')">
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
      <component
        :is="item.as" v-for="item in toolbarButtons"
        :key="item.label"
        :item="item"
      />
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
