<script setup lang="ts">
import type { KonvaEventObject } from 'konva/lib/Node'
import type { Box } from 'konva/lib/shapes/Transformer'
import type { IRect } from 'konva/lib/types'
import Konva from 'konva'
import { cloneDeep } from 'lodash-es'

const props = defineProps<{
  containerWidth: number
  containerHeight: number
}>()

const CROP_BORDER_WIDTH = 2 // Stroke width of crop rect border
const MIN_CROP_SIZE = 50 // Minimum size for crop rectangle
const EPSILON = 0.1 // Tolerance for floating point comparisons

const {
  cropRect,
  imageRef,
  layerImageRef,
  centerCropRectInViewport,
} = inject('editImageContext')! as any

const cropRectRef = useTemplateRef('cropRectRef')
const cropTransformerRef = useTemplateRef('cropTransformerRef')
/**
 * Check if a value is at a bound (within epsilon tolerance)
 */
const isAtBound = (value: number, bound: number) => Math.abs(value - bound) < EPSILON

/**
 * Calculate projected dimensions maintaining aspect ratio
 */
function calculateProjectedDimensions(newBox: Box, oldBox: Box, aspectRatio: number) {
  const widthChange = Math.abs(newBox.width - oldBox.width)
  const heightChange = Math.abs(newBox.height - oldBox.height)

  let projectedWidth = newBox.width
  let projectedHeight = newBox.height

  // Determine which dimension changed more (user's primary intent)
  if (widthChange > heightChange) {
    projectedHeight = projectedWidth / aspectRatio
  } else {
    projectedWidth = projectedHeight * aspectRatio
  }

  return { projectedWidth, projectedHeight }
}

/**
 * Detect which anchor is being dragged based on edge movements
 */
function detectDraggedAnchor(oldBox: Box, newBox: Box) {
  const leftMoving = newBox.x < oldBox.x - EPSILON
  const topMoving = newBox.y < oldBox.y - EPSILON
  const rightMoving
    = newBox.x + newBox.width > oldBox.x + oldBox.width + EPSILON
  const bottomMoving
    = newBox.y + newBox.height > oldBox.y + oldBox.height + EPSILON

  return {
    isTopLeft: leftMoving && topMoving,
    isTopRight: rightMoving && topMoving,
    isBottomLeft: leftMoving && bottomMoving,
    isBottomRight: rightMoving && bottomMoving,
  }
}

/**
 * Apply bounds constraints to a box
 */
function applyBoundsConstraints(box: Box, bounds: { left: number, top: number, right: number, bottom: number }) {
  let { x, y, width, height } = box

  // Constrain left edge
  if (x < bounds.left) {
    const overflow = bounds.left - x
    x = bounds.left
    width = Math.max(MIN_CROP_SIZE, width - overflow)
  }

  // Constrain top edge
  if (y < bounds.top) {
    const overflow = bounds.top - y
    y = bounds.top
    height = Math.max(MIN_CROP_SIZE, height - overflow)
  }

  // Constrain right edge
  if (x + width > bounds.right) {
    width = Math.max(MIN_CROP_SIZE, bounds.right - x)
  }

  // Constrain bottom edge
  if (y + height > bounds.bottom) {
    height = Math.max(MIN_CROP_SIZE, bounds.bottom - y)
  }

  return { x, y, width, height }
}

/**
 * Maintain aspect ratio while respecting bounds
 */
function maintainAspectRatioWithBounds(box: IRect, oldBox: Box, aspectRatio: number, bounds: { left: number, top: number, right: number, bottom: number }) {
  let { x, y, width, height } = box

  const widthChange = Math.abs(width - oldBox.width)
  const heightChange = Math.abs(height - oldBox.height)

  // Determine which dimension to adjust based on which changed more
  if (widthChange > heightChange) {
    // Width changed more, adjust height
    height = width / aspectRatio
    // Re-check bounds with adjusted height
    if (y + height > bounds.bottom) {
      height = bounds.bottom - y
      width = height * aspectRatio
    }
    if (x + width > bounds.right) {
      width = bounds.right - x
      height = width / aspectRatio
    }
  } else {
    // Height changed more, adjust width
    width = height * aspectRatio
    // Re-check bounds with adjusted width
    if (x + width > bounds.right) {
      width = bounds.right - x
      height = width / aspectRatio
    }
    if (y + height > bounds.bottom) {
      height = bounds.bottom - y
      width = height * aspectRatio
    }
  }

  // Final position constraints
  x = Math.max(bounds.left, x)
  y = Math.max(bounds.top, y)

  return { x, y, width, height }
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
  const bounds = {
    left: imageBox.x,
    top: imageBox.y,
    right: imageBox.x + imageBox.width,
    bottom: imageBox.y + imageBox.height,
  }

  const aspectRatio = oldBox.width / oldBox.height
  const isGrowing
    = newBox.width > oldBox.width + EPSILON
      || newBox.height > oldBox.height + EPSILON

  // Check if edges are currently at bounds
  const edgesAtBound = {
    left: isAtBound(oldBox.x, bounds.left),
    top: isAtBound(oldBox.y, bounds.top),
    right: isAtBound(oldBox.x + oldBox.width, bounds.right),
    bottom: isAtBound(oldBox.y + oldBox.height, bounds.bottom),
  }

  // Prevent transformation if growing would require an edge at bound to move
  if (isGrowing) {
    const { projectedWidth, projectedHeight } = calculateProjectedDimensions(
      newBox,
      oldBox,
      aspectRatio,
    )
    const anchor = detectDraggedAnchor(oldBox, newBox)

    // Check each edge: prevent if edge is at bound AND dragging that edge's anchor would require it to move
    if (
      edgesAtBound.top
      && (anchor.isTopLeft || anchor.isTopRight)
      && projectedHeight > oldBox.height + EPSILON
    ) {
      return oldBox // Top at bound, dragging top anchor would require top to move up
    }

    if (
      edgesAtBound.bottom
      && (anchor.isBottomLeft || anchor.isBottomRight)
      && projectedHeight > oldBox.height + EPSILON
    ) {
      return oldBox // Bottom at bound, dragging bottom anchor would require bottom to move down
    }

    if (
      edgesAtBound.left
      && (anchor.isTopLeft || anchor.isBottomLeft)
      && projectedWidth > oldBox.width + EPSILON
    ) {
      return oldBox // Left at bound, dragging left anchor would require left to move left
    }

    if (
      edgesAtBound.right
      && (anchor.isTopRight || anchor.isBottomRight)
      && projectedWidth > oldBox.width + EPSILON
    ) {
      return oldBox // Right at bound, dragging right anchor would require right to move right
    }
  }

  // Apply bounds constraints
  let constrained = applyBoundsConstraints(newBox, bounds)

  // Maintain aspect ratio while respecting bounds
  constrained = maintainAspectRatioWithBounds(
    constrained,
    oldBox,
    aspectRatio,
    bounds,
  )

  // Final validation
  if (
    constrained.width < MIN_CROP_SIZE
    || constrained.height < MIN_CROP_SIZE
  ) {
    return oldBox
  }

  // Update newBox with constrained values
  newBox.x = constrained.x
  newBox.y = constrained.y
  newBox.width = constrained.width
  newBox.height = constrained.height

  return newBox
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

  // Center crop rect in viewport
  centerCropRectInViewport()
}

// #region clone crop rect
const cloneCropRect = shallowRef<IRect>({ ...cropRect.value })
watch(cropRect, (newVal) => {
  cloneCropRect.value = cloneDeep(newVal)
}, { deep: true })
function handleCropTransform(e: KonvaEventObject<MouseEvent>) {
  const node = e.target
  const scaleX = node.scaleX()
  const scaleY = node.scaleY()
  node.scaleX(1)
  node.scaleY(1)
  // Calculate current dimensions accounting for scale
  // Note: We don't reset scale here as that happens in transformend
  const currentWidth = node.width() * scaleX
  const currentHeight = node.height() * scaleY
  const currentX = node.x()
  const currentY = node.y()

  // Update cropRect in real-time so overlays update smoothly
  cloneCropRect.value = {
    x: currentX,
    y: currentY,
    width: currentWidth,
    height: currentHeight,
  }
}
// #endregion clone crop rect

// Custom shape function to draw overlay with a hole (crop area)
function overlaySceneFunc(context: CanvasRenderingContext2D) {
  context.beginPath()
  // Draw outer rectangle (full container)
  context.rect(0, 0, props.containerWidth, props.containerHeight)
  // Draw inner rectangle (crop area) as a hole using even-odd fill rule
  context.rect(
    cloneCropRect.value.x,
    cloneCropRect.value.y,
    cloneCropRect.value.width,
    cloneCropRect.value.height,
  )
  context.fillStyle = 'rgba(0, 0, 0, 0.5)'
  // Use even-odd fill rule to create the hole
  context.fill('evenodd')
}

// #region custom anchor
const ANCHOR_CONFIG = {
  edgeSize: 12,
  lineWidth: 4,
  anchorSize: 20,
  offsetPadding: 6,
}

const groupRefs: Record<string, Konva.Group> = {}

/**
 * Gets the configuration for a specific corner
 */
function getCornerConfig(groupName: string, anchorX: number, anchorY: number) {
  const { edgeSize, lineWidth, anchorSize, offsetPadding } = ANCHOR_CONFIG

  switch (groupName) {
    case 'top-left':
      return {
        horizontal: { x: anchorX, y: anchorY },
        vertical: { x: anchorX, y: anchorY },
        offset: null, // No offset for top-left because its has default offset as {x: 6, y: 6}
      }
    case 'top-right':
      return {
        horizontal: { x: anchorX - edgeSize, y: anchorY },
        vertical: { x: anchorX - lineWidth, y: anchorY },
        offset: { x: anchorSize - offsetPadding, y: offsetPadding },
      }
    case 'bottom-left':
      return {
        horizontal: { x: anchorX, y: anchorY - lineWidth },
        vertical: { x: anchorX, y: anchorY - edgeSize },
        offset: { x: offsetPadding, y: anchorSize - offsetPadding },
      }
    case 'bottom-right':
      return {
        horizontal: { x: anchorX - edgeSize, y: anchorY - lineWidth },
        vertical: { x: anchorX - lineWidth, y: anchorY - edgeSize },
        offset: {
          x: anchorSize - offsetPadding,
          y: anchorSize - offsetPadding,
        },
      }
    default:
      return null
  }
}

/**
 * Updates anchor appearance and positions the corner lines
 */
function anchorStyleFunc(anchor: Konva.Rect) {
  const anchorName = anchor.name()
  // Get the corresponding group
  const groupName = [
    'top-left',
    'top-right',
    'bottom-left',
    'bottom-right',
  ].find(name => anchorName.includes(name))
  if (!groupName) return

  const group = groupRefs[groupName]
  if (!group) return

  const { anchorSize } = ANCHOR_CONFIG

  // Set anchor properties
  anchor.width(anchorSize)
  anchor.height(anchorSize)
  anchor.opacity(0)

  const horizontalLine = group.findOne('.horizontal-line')
  const verticalLine = group.findOne('.vertical-line')

  if (!horizontalLine || !verticalLine) return

  const anchorX = anchor.x()
  const anchorY = anchor.y()

  // Get configuration only for this specific corner
  const config = getCornerConfig(groupName, anchorX, anchorY)
  if (!config) return

  horizontalLine.position(config.horizontal)
  verticalLine.position(config.vertical)
  if (config.offset) anchor.offset(config.offset)
}

function createAnchorGroup(name: string) {
  const group = new Konva.Group({
    x: 0,
    y: 0,
    listening: false,
    name: `group-${name}`,
  })

  const horizontalRect = new Konva.Rect({
    name: 'horizontal-line',
    x: 0,
    y: 0,
    width: ANCHOR_CONFIG.edgeSize,
    height: ANCHOR_CONFIG.lineWidth,
    fill: 'white',
  })

  const verticalRect = new Konva.Rect({
    name: 'vertical-line',
    x: 0,
    y: 0,
    width: ANCHOR_CONFIG.lineWidth,
    height: ANCHOR_CONFIG.edgeSize,
    fill: 'white',
  })

  group.add(horizontalRect)
  group.add(verticalRect)

  if (cropTransformerRef.value) {
    cropTransformerRef.value.getNode().add(group)
    groupRefs[name] = group
  }

  return group
}
// Initialize anchor groups on mount
onMounted(() => {
  const cornerNames = [
    'top-left',
    'top-right',
    'bottom-left',
    'bottom-right',
  ]
  cornerNames.forEach((name) => {
    createAnchorGroup(name)
  })
})
// #endregion custom anchor
defineExpose({
  cropRectRef,
  cropTransformerRef,
})
</script>

<template>
  <v-layer>
    <!-- Crop overlay - single shape with hole to avoid edge artifacts -->
    <v-shape
      :config="{
        sceneFunc: overlaySceneFunc,
        listening: false,
        perfectDrawEnabled: false,
      }"
    />
    <!-- Crop rectangle border -->
    <v-rect
      ref="cropRectRef"
      :config="{
        ...cloneCropRect,
        stroke: '#fff',
        strokeWidth: CROP_BORDER_WIDTH,
        fill: 'transparent',
        draggable: false,
        listening: false,
        strokeScaleEnabled: false,
        perfectDrawEnabled: false,
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
        padding: CROP_BORDER_WIDTH / 2,
        enabledAnchors: [
          'top-left',
          'top-right',
          'bottom-left',
          'bottom-right',
        ],
        anchorStyleFunc,
        boundBoxFunc: cropBoundBoxFunc,
      }"
      @transform="handleCropTransform"
      @transformend="handleCropTransformEnd"
    />
  </v-layer>
</template>
