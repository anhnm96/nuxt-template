interface ElementProps {
  top: number
  bottom: number
  left: number
  right: number
  middle: number
  center: number
}

type Position = 'top' | 'bottom' | 'left' | 'right'

interface PositionCalculation {
  top: number
  left: number
  newPosition: Position
  maxHeight?: number
  maxWidth?: number
}

export function getAnchorProps(el: HTMLElement): ElementProps {
  const { top, left, right, bottom } = el.getBoundingClientRect()

  return {
    top,
    bottom,
    left,
    right,
    middle: left + (right - left) / 2,
    center: top + (bottom - top) / 2,
  }
}

function getTargetProps(width: number, height: number): ElementProps {
  return {
    top: 0,
    center: height / 2,
    bottom: height,
    left: 0,
    middle: width / 2,
    right: width,
  }
}

// Tooltip is centered horizontally when position is 'top' or 'bottom',
// and centered vertically when position is 'left' or 'right'
function getTopLeftProps(
  anchorProps: ElementProps,
  targetProps: ElementProps,
  position: Position,
  distance: number,
): { top: number, left: number } {
  switch (position) {
    case 'top':
      return {
        top: anchorProps.top - targetProps.bottom - distance,
        left: anchorProps.middle - targetProps.middle,
      }
    case 'bottom':
      return {
        top: anchorProps.bottom + distance,
        left: anchorProps.middle - targetProps.middle,
      }
    case 'left':
      return {
        top: anchorProps.center - targetProps.center,
        left: anchorProps.left - targetProps.right - distance,
      }
    case 'right':
      return {
        top: anchorProps.center - targetProps.center,
        left: anchorProps.right + distance,
      }
    default:
      return { top: 0, left: 0 }
  }
}

// Helper functions
function getAvailableVerticalSpace(position: 'top' | 'bottom', anchor: ElementProps, distance: number) {
  return position === 'top'
    ? anchor.top - distance
    : window.innerHeight - anchor.bottom - distance
}

function getAvailableHorizontalSpace(position: 'left' | 'right', anchor: ElementProps, distance: number) {
  return position === 'left'
    ? anchor.left - distance
    : document.body.clientWidth - anchor.right - distance
}

function calculateMaxDimension(overflowAmount: number, originalDimension: number) {
  const availableSpace = Math.max(0, originalDimension + overflowAmount)
  return Math.min(originalDimension, availableSpace)
}

function reversePositionIfOffscreen(
  anchorProps: ElementProps,
  targetProps: ElementProps,
  currentPosition: Position,
  distance: number,
): PositionCalculation {
  const tooltipHeight = targetProps.bottom
  const tooltipWidth = targetProps.right
  const viewportHeight = window.innerHeight
  const viewportWidth = document.body.clientWidth

  let newPosition = currentPosition
  let maxHeight: number | undefined
  let maxWidth: number | undefined

  // Handle primary axis positioning
  if (['top', 'bottom'].includes(currentPosition)) {
    const currentSpace = getAvailableVerticalSpace(currentPosition as any, anchorProps, distance)
    const reversePosition = currentPosition === 'top' ? 'bottom' : 'top'
    const reverseSpace = getAvailableVerticalSpace(reversePosition, anchorProps, distance)

    if (tooltipHeight > currentSpace) {
      if (reverseSpace > currentSpace) {
        newPosition = reversePosition
        maxHeight = Math.min(tooltipHeight, reverseSpace)
      } else {
        maxHeight = currentSpace
      }
    }
  } else { // left/right
    const currentSpace = getAvailableHorizontalSpace(currentPosition as any, anchorProps, distance)
    const reversePosition = currentPosition === 'left' ? 'right' : 'left'
    const reverseSpace = getAvailableHorizontalSpace(reversePosition, anchorProps, distance)

    if (tooltipWidth > currentSpace) {
      if (reverseSpace > currentSpace) {
        newPosition = reversePosition
        maxWidth = Math.min(tooltipWidth, reverseSpace)
      } else {
        maxWidth = currentSpace
      }
    }
  }

  // Calculate new position
  const newProps = getTopLeftProps(anchorProps, targetProps, newPosition, distance)

  // Check opposite axis overflow
  const { top: finalTop, left: finalLeft } = newProps
  const finalBottom = finalTop + tooltipHeight
  const finalRight = finalLeft + tooltipWidth

  if (['top', 'bottom'].includes(newPosition)) {
    // Check horizontal overflow
    if (finalLeft < 0) {
      maxWidth = calculateMaxDimension(finalLeft, tooltipWidth)
    } else if (finalRight > viewportWidth) {
      maxWidth = calculateMaxDimension(viewportWidth - finalRight, tooltipWidth)
    }
  } else {
    // Check vertical overflow
    if (finalTop < 0) {
      maxHeight = calculateMaxDimension(finalTop, tooltipHeight)
    } else if (finalBottom > viewportHeight) {
      maxHeight = calculateMaxDimension(viewportHeight - finalBottom, tooltipHeight)
    }
  }

  return {
    top: finalTop,
    left: finalLeft,
    newPosition,
    maxHeight,
    maxWidth,
  }
}

// Updated setPosition function
export function setPosition(
  cfg: {
    targetEl: HTMLElement | null
    anchorEl: HTMLElement | null
    position: Position
    distance: number
  },
  retryNumber: number = 0,
): void {
  if (!cfg.targetEl || !cfg.anchorEl || retryNumber > 5) return
  // some browsers report zero height or width because
  // we are trying too early to get these dimensions
  if (cfg.targetEl.offsetHeight === 0 || cfg.targetEl.offsetWidth === 0) {
    setTimeout(setPosition, 10, cfg, retryNumber + 1)
    return
  }

  const { targetEl, anchorEl, distance, position } = cfg
  // scroll position might change
  // if max-height/-width changes, so we
  // need to restore it after we calculate
  // the new positioning
  const { scrollLeft, scrollTop } = targetEl

  // Reset positioning styles for accurate measurement
  Object.assign(targetEl.style, {
    top: '0',
    left: '0',
    minWidth: '',
    minHeight: '',
    visibility: 'visible',
  })

  const anchorProps = getAnchorProps(anchorEl)
  const targetProps = getTargetProps(targetEl.offsetWidth, targetEl.offsetHeight)

  const positionResult = reversePositionIfOffscreen(
    anchorProps,
    targetProps,
    position,
    distance,
  )

  // Apply final positioning and constraints
  Object.assign(targetEl.style, {
    top: `${positionResult.top}px`,
    left: `${positionResult.left}px`,
    maxHeight: positionResult.maxHeight ? `${positionResult.maxHeight}px` : '',
    maxWidth: positionResult.maxWidth ? `${positionResult.maxWidth}px` : '',
    overflow: 'auto',
  })

  // Restore scroll position
  if (targetEl.scrollTop !== scrollTop) targetEl.scrollTop = scrollTop
  if (targetEl.scrollLeft !== scrollLeft) targetEl.scrollLeft = scrollLeft
}

// ------------------------------------------------------------------ cursor rect

/** `true` tracks both axes; `'x'` / `'y'` name the single axis that tracks the cursor. */
export type CursorFollow = boolean | 'x' | 'y'

interface CursorPoint { x: number, y: number }

/** The part of a `DOMRect` the measurement needs. */
type Edges = Pick<DOMRect, 'left' | 'top' | 'right' | 'bottom'>

/** Structurally a floating-ui `ClientRectObject` (that type isn't re-exported by the Vue package). */
type CursorRect = Record<'x' | 'y' | 'top' | 'left' | 'right' | 'bottom' | 'width' | 'height', number>

/**
 * The reference rect a cursor-anchored floating element is positioned against.
 *
 * A tracked axis collapses to a point at the cursor, clamped to the anchor's
 * bounds. A locked axis keeps the anchor's own edges, which is what pins the
 * floating element to the trigger on that axis while it slides along the other.
 */
export function getCursorRect(cursor: CursorPoint, follow: CursorFollow, anchorRect?: Edges | null): CursorRect {
  const rect = follow === true ? undefined : anchorRect

  // nothing to lock to — a bare point at the cursor, tracking both axes
  if (!rect) {
    const { x, y } = cursor
    return { x, y, left: x, top: y, right: x, bottom: y, width: 0, height: 0 }
  }

  // `true` returned above, so only a named axis tracks from here — `false`
  // tracks neither and measures the anchor itself
  const tracksX = follow === 'x'
  const tracksY = follow === 'y'
  const left = tracksX ? clamp(cursor.x, rect.left, rect.right) : rect.left
  const right = tracksX ? left : rect.right
  const top = tracksY ? clamp(cursor.y, rect.top, rect.bottom) : rect.top
  const bottom = tracksY ? top : rect.bottom

  return { x: left, y: top, left, top, right, bottom, width: right - left, height: bottom - top }
}
