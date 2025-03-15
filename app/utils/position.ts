// import { client } from '../../plugins/platform/Platform.js'
// import { getScrollbarWidth } from '../scroll/scroll.js'

// let vpLeft: number | undefined, vpTop: number | undefined

type VerticalPosition = 'top' | 'center' | 'bottom'
type HorizontalPosition = 'left' | 'middle' | 'right'
type TooltipPosition = `${VerticalPosition} ${HorizontalPosition}`

export function validatePosition(pos: TooltipPosition): boolean {
  const parts = pos.split(' ') as [string, string]
  if (parts.length !== 2) {
    return false
  }
  if (!['top', 'center', 'bottom'].includes(parts[0])) {
    console.error('Anchor/Self position must start with one of top/center/bottom')
    return false
  }
  if (!['left', 'middle', 'right', 'start', 'end'].includes(parts[1])) {
    console.error('Anchor/Self position must end with one of left/middle/right/start/end')
    return false
  }
  return true
}

export function validateOffset(val?: [number, number]): boolean {
  if (!val) {
    return true
  }
  if (val.length !== 2) {
    return false
  }
  if (typeof val[0] !== 'number' || typeof val[1] !== 'number') {
    return false
  }
  return true
}

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

function getAbsoluteAnchorProps(
  el: Element,
  absoluteOffset: { top: number, left: number },
  offset?: [number, number],
): { top: number, bottom: number, height: number, left: number, right: number, width: number, middle: number, center: number } {
  let { top, left } = el.getBoundingClientRect()

  top += absoluteOffset.top
  left += absoluteOffset.left

  if (offset !== void 0) {
    top += offset[1]
    left += offset[0]
  }

  return {
    top,
    bottom: top + 1,
    height: 1,
    left,
    right: left + 1,
    width: 1,
    middle: left,
    center: top,
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

// Refactored getTopLeftProps to compute tooltip position based on `position`
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

// Insert new helper function before setPosition or at appropriate location
function reversePositionIfOffscreen(
  props: { top: number, left: number },
  anchorProps: ElementProps,
  targetProps: { top: number, center: number, bottom: number, left: number, middle: number, right: number },
  currentPosition: 'top' | 'bottom' | 'left' | 'right',
  distance: number,
): { top: number, left: number, newPosition: 'top' | 'bottom' | 'left' | 'right' } {
  const innerHeight = window.innerHeight
  const innerWidth = document.body.clientWidth
  const tooltipHeight = targetProps.bottom // approximated height
  const tooltipWidth = targetProps.right // approximated width

  const isOffscreenVertically = props.top < 0 || (props.top + tooltipHeight) > innerHeight
  const isOffscreenHorizontally = props.left < 0 || (props.left + tooltipWidth) > innerWidth

  if (isOffscreenVertically || isOffscreenHorizontally) {
    let opposite: 'top' | 'bottom' | 'left' | 'right' = currentPosition
    switch (currentPosition) {
      case 'top':
        opposite = 'bottom'
        break
      case 'bottom':
        opposite = 'top'
        break
      case 'left':
        opposite = 'right'
        break
      case 'right':
        opposite = 'left'
        break
    }
    const newProps = getTopLeftProps(anchorProps, targetProps, opposite, distance)
    return { top: newProps.top, left: newProps.left, newPosition: opposite }
  }
  return { top: props.top, left: props.left, newPosition: currentPosition }
}

export function setPosition(
  cfg: {
    targetEl: HTMLElement | null
    anchorEl: HTMLElement | null
    offset?: [number, number]
    anchorOrigin: { vertical: VerticalPosition, horizontal: HorizontalPosition }
    selfOrigin: { vertical: VerticalPosition, horizontal: HorizontalPosition }
    position: Position
    distance: number
    absoluteOffset?: { top: number, left: number }
    fit?: boolean
    cover?: boolean
    maxHeight?: string
    maxWidth?: string
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
    offset,
    anchorEl,
    anchorOrigin,
    selfOrigin,
    absoluteOffset,
    fit,
    cover,
    maxHeight,
    maxWidth,
  } = cfg
  // console.log('cfg', cfg)

  // if (client.is.ios === true && window.visualViewport !== void 0) {
  //   // uses the q-position-engine CSS class
  //   const elStyle = document.body.style
  //   const { offsetLeft: left, offsetTop: top } = window.visualViewport
  //   if (left !== vpLeft) {
  //     elStyle.setProperty('--q-pe-left', `${left}px`)
  //     vpLeft = left
  //   }
  //   if (top !== vpTop) {
  //     elStyle.setProperty('--q-pe-top', `${top}px`)
  //     vpTop = top
  //   }
  // }

  const { scrollLeft, scrollTop } = targetEl

  const anchorProps = absoluteOffset === void 0
    ? getAnchorProps(anchorEl)
    : getAbsoluteAnchorProps(anchorEl, absoluteOffset, offset)

  // ...existing code...
  Object.assign(targetEl.style, {
    top: '0',
    left: '0',
    minWidth: null,
    minHeight: null,
    maxWidth,
    maxHeight,
    visibility: 'visible',
  })

  const { offsetWidth: origElWidth, offsetHeight: origElHeight } = targetEl
  const { elWidth, elHeight } = (fit === true || cover === true)
    ? { elWidth: Math.max(anchorProps.width!, origElWidth), elHeight: cover === true ? Math.max(anchorProps.height!, origElHeight) : origElHeight }
    : { elWidth: origElWidth, elHeight: origElHeight }

  let elStyleObj: Partial<CSSStyleDeclaration> = { maxWidth, maxHeight }
  if (fit === true || cover === true) {
    elStyleObj.minWidth = `${anchorProps.width}px`
    if (cover === true) {
      elStyleObj.minHeight = `${anchorProps.height}px`
    }
  }
  Object.assign(targetEl.style, elStyleObj)

  const targetProps = getTargetProps(elWidth, elHeight)
  // console.log('targetProps', targetProps)
  // Use the new getTopLeftProps with cfg.position to calculate tooltip placement
  let props = getTopLeftProps(anchorProps, targetProps, cfg.position, cfg.distance)
  // console.log('props', props)

  if (absoluteOffset === void 0 || offset === void 0) {
    console.log('no offset', props, anchorProps, targetProps, anchorOrigin, selfOrigin)
    // Check if tooltip is offscreen, and if so, reverse its position
    const result = reversePositionIfOffscreen(props, anchorProps, targetProps, cfg.position, cfg.distance)
    props.top = result.top
    props.left = result.left
    // Optionally update cfg.position if you need to reflect the new position internally:
    cfg.position = result.newPosition
    // applyBoundaries(props, anchorProps, targetProps, anchorOrigin, selfOrigin)
  } else {
    console.log('has offset')
    const { top, left } = props
    // applyBoundaries(props, anchorProps, targetProps, anchorOrigin, selfOrigin)
    let hasChanged = false
    if (props.top !== top) {
      hasChanged = true
      const offsetY = 2 * offset[1]
      anchorProps.center = (anchorProps.top -= offsetY)
      anchorProps.bottom -= offsetY + 2
    }
    if (props.left !== left) {
      hasChanged = true
      const offsetX = 2 * offset[0]
      anchorProps.middle = (anchorProps.left -= offsetX)
      anchorProps.right -= offsetX + 2
    }
    if (hasChanged === true) {
      props = getTopLeftProps(anchorProps, targetProps, cfg.position, cfg.distance)
      // applyBoundaries(props, anchorProps, targetProps, anchorOrigin, selfOrigin)
    }
  }

  elStyleObj = {
    top: `${props.top}px`,
    left: `${props.left}px`,
  }
  Object.assign(targetEl.style, elStyleObj)
  if (targetEl.scrollTop !== scrollTop) {
    targetEl.scrollTop = scrollTop
  }
  if (targetEl.scrollLeft !== scrollLeft) {
    targetEl.scrollLeft = scrollLeft
  }
}
