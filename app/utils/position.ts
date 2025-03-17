interface ElementProps {
  top: number
  bottom: number
  height?: number
  left: number
  right: number
  width?: number
  middle: number
  center: number
}
export function getAnchorProps(
  el: Element,
): ElementProps {
  const { top, left, right, bottom, width, height } = el.getBoundingClientRect()

  return {
    top,
    bottom,
    height,
    left,
    right,
    width,
    middle: left + (right - left) / 2,
    center: top + (bottom - top) / 2,
  }
}

function getTargetProps(width: number, height: number): { top: number, center: number, bottom: number, left: number, middle: number, right: number } {
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
  targetProps: { top: number, center: number, bottom: number, left: number, middle: number, right: number },
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

function reversePositionIfOffscreen(
  props: { top: number, left: number },
  anchorProps: ElementProps,
  targetProps: { top: number, center: number, bottom: number, left: number, middle: number, right: number },
  currentPosition: 'top' | 'bottom' | 'left' | 'right',
  distance: number,
): { top: number, left: number, newPosition: 'top' | 'bottom' | 'left' | 'right', maxHeight?: number, maxWidth?: number } {
  let newPosition = currentPosition
  let maxHeight: number | undefined
  let maxWidth: number | undefined
  const tooltipHeight = targetProps.bottom
  const tooltipWidth = targetProps.right
  const viewportHeight = window.innerHeight
  const viewportWidth = document.body.clientWidth

  // Helper functions to calculate available space
  const getVerticalSpace = (pos: 'top' | 'bottom') =>
    pos === 'top'
      ? anchorProps.top - distance
      : viewportHeight - anchorProps.bottom - distance

  const getHorizontalSpace = (pos: 'left' | 'right') =>
    pos === 'left'
      ? anchorProps.left - distance
      : viewportWidth - anchorProps.right - distance

  // Check primary axis first
  if (currentPosition === 'top' || currentPosition === 'bottom') {
    const currentSpace = getVerticalSpace(currentPosition)
    const reversePos = currentPosition === 'top' ? 'bottom' : 'top'
    const reverseSpace = getVerticalSpace(reversePos)

    if (tooltipHeight > currentSpace) {
      if (reverseSpace > currentSpace) {
        newPosition = reversePos
        if (tooltipHeight > reverseSpace) {
          maxHeight = reverseSpace
        }
      } else {
        maxHeight = currentSpace
      }
    }
  } else { // left/right
    const currentSpace = getHorizontalSpace(currentPosition)
    const reversePos = currentPosition === 'left' ? 'right' : 'left'
    const reverseSpace = getHorizontalSpace(reversePos)

    if (tooltipWidth > currentSpace) {
      if (reverseSpace > currentSpace) {
        newPosition = reversePos
        if (tooltipWidth > reverseSpace) {
          maxWidth = reverseSpace
        }
      } else {
        maxWidth = currentSpace
      }
    }
  }

  // Get new position coordinates
  const newProps = getTopLeftProps(anchorProps, targetProps, newPosition, distance)

  // Check OPPOSITE axis overflow after repositioning
  const finalTop = newProps.top
  const finalLeft = newProps.left
  const finalBottom = finalTop + tooltipHeight
  const finalRight = finalLeft + tooltipWidth

  if (currentPosition === 'top' || currentPosition === 'bottom') {
    // Vertical position - check horizontal overflow only
    if (finalLeft < 0 || finalRight > viewportWidth) {
      const available = finalLeft < 0
        ? viewportWidth + finalLeft
        : viewportWidth - finalLeft
      maxWidth = Math.min(tooltipWidth, available)
    }
  } else {
    // Horizontal position - check vertical overflow only
    if (finalTop < 0 || finalBottom > viewportHeight) {
      const available = finalTop < 0
        ? viewportHeight + finalTop
        : viewportHeight - finalTop
      maxHeight = Math.min(tooltipHeight, available)
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

export function setPosition(
  cfg: {
    targetEl: HTMLElement | null
    anchorEl: HTMLElement | null
    position: Position
    distance: number
  },
  retryNumber: number = 0,
): void {
  if (
    cfg.targetEl === null
    || cfg.anchorEl === null
    || retryNumber > 5 // we should try only a few times
  ) {
    return
  }

  // some browsers report zero height or width because
  // we are trying too early to get these dimensions
  if (cfg.targetEl.offsetHeight === 0 || cfg.targetEl.offsetWidth === 0) {
    setTimeout(() => {
      setPosition(cfg, retryNumber + 1)
    }, 10)
    return
  }

  const {
    targetEl,
    anchorEl,
  } = cfg

  // scroll position might change
  // if max-height/-width changes, so we
  // need to restore it after we calculate
  // the new positioning
  const { scrollLeft, scrollTop } = targetEl

  const anchorProps = getAnchorProps(anchorEl)

  /**
   * We "reset" the critical CSS properties
   * so we can take an accurate measurement.
   *
   * Ensure that targetEl has a max-width & max-height
   * set in CSS and that the value does NOT exceeds 100vw/vh.
   */
  Object.assign(targetEl.style, {
    top: '0',
    left: '0',
    minWidth: null,
    minHeight: null,
    visibility: 'visible',
  })

  const targetProps = getTargetProps(targetEl.offsetWidth, targetEl.offsetHeight)
  const initialPos = getTopLeftProps(anchorProps, targetProps, cfg.position, cfg.distance)
  const { top, left, maxHeight, maxWidth } = reversePositionIfOffscreen(
    initialPos,
    anchorProps,
    targetProps,
    cfg.position,
    cfg.distance,
  )

  Object.assign(targetEl.style, {
    top: `${top}px`,
    left: `${left}px`,
    maxHeight: maxHeight ? `${maxHeight}px` : '',
    maxWidth: maxWidth ? `${maxWidth}px` : '',
    overflow: 'auto', // Add scroll if content exceeds max dimensions
  })

  // restore scroll position
  if (targetEl.scrollTop !== scrollTop) {
    targetEl.scrollTop = scrollTop
  }
  if (targetEl.scrollLeft !== scrollLeft) {
    targetEl.scrollLeft = scrollLeft
  }
}
