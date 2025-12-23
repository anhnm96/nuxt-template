import type { IRect } from 'konva/lib/types'

/**
 * Convert SVG string to data URL
 * @param {string} svgString - SVG markup as string
 * @returns {string} Data URL string
 */
export function svgToURL(svgString: string) {
  const uri = window.btoa(unescape(encodeURIComponent(svgString)))
  return `data:image/svg+xml;base64,${uri}`
}

/**
 * Generate a rotated cursor SVG based on rotation angle
 * @param {number} rotation - Rotation angle in degrees
 * @returns {string} Data URL string for the rotated cursor
 */
export function getRotatedCursor(rotation = 0) {
  const rotatedCursorSvg = `<svg width="27" height="27" viewBox="0 0 27 27" fill="none" xmlns="http://www.w3.org/2000/svg"><g transform="rotate(${rotation - 45} 13.5 13.5)" filter="url(#a)"><mask id="b" maskUnits="userSpaceOnUse" x="3.414" y="2.414" width="19" height="19" fill="#000"><path fill="#fff" d="M3.414 2.414h19v19h-19z"/><path fill-rule="evenodd" clip-rule="evenodd" d="m8.95 4.414.707.707L7.319 7.46c3.544.074 6.177.617 7.935 2.25 1.783 1.655 2.553 4.322 2.65 8.337l2.339-2.339.707.707-3.536 3.536-3.536-3.536.708-.707 2.317 2.317c-.1-3.91-.855-6.215-2.329-7.583-1.469-1.364-3.762-1.904-7.236-1.982l2.319 2.319-.707.707L5.414 7.95z"/></mask><path fill-rule="evenodd" clip-rule="evenodd" d="m8.95 4.414.707.707L7.319 7.46c3.544.074 6.177.617 7.935 2.25 1.783 1.655 2.553 4.322 2.65 8.337l2.339-2.339.707.707-3.536 3.536-3.536-3.536.708-.707 2.317 2.317c-.1-3.91-.855-6.215-2.329-7.583-1.469-1.364-3.762-1.904-7.236-1.982l2.319 2.319-.707.707L5.414 7.95z" fill="#000"/><path d="m9.657 5.121.707.707.707-.707-.707-.707zm-.707-.707.707-.707L8.95 3l-.708.707zM7.32 7.46l-.708-.707L4.954 8.41l2.344.05zm7.934 2.25.68-.733zm2.65 8.337-1 .024.056 2.334 1.65-1.651zm2.339-2.339L20.95 15l-.707-.707-.708.707zm.707.707.707.707.707-.707-.707-.707zm-3.536 3.536-.707.707.707.707.707-.707zm-3.536-3.536-.707-.707-.707.707.707.707zm.708-.707.707-.707-.707-.707-.707.707zm2.317 2.317-.707.707 1.77 1.77-.064-2.503zm-2.329-7.583.68-.733zM7.338 8.459l.022-1-2.491-.055L6.63 9.167zm2.319 2.319.707.707.707-.707-.707-.707zm-.707.707-.708.707.708.707.707-.707zM5.414 7.95l-.707-.708L4 7.95l.707.707zm4.243-2.83.707-.707-.707-.707-.707.707-.708.707.708.707zM7.319 7.46l.707.707 2.338-2.338-.707-.707-.707-.707-2.338 2.338zm0 0-.02 1c3.507.073 5.806.619 7.274 1.982l.68-.733.681-.732C13.887 7.075 10.92 6.534 7.34 6.459zm7.935 2.25-.68.732c1.475 1.37 2.235 3.682 2.33 7.629l1-.024 1-.024c-.1-4.083-.878-7.105-2.97-9.046zm4.989 5.998L19.535 15l-2.339 2.339.707.707.708.707 2.339-2.339zm.707.707.707-.707L20.95 15l-.707.707-.708.707.707.707zm-3.536 3.536.707.707 3.536-3.536-.707-.707-.707-.707-3.536 3.535zm-3.536-3.536-.707.707 3.536 3.536.707-.707.707-.707-3.535-3.536zm.708-.707L13.879 15l-.708.707.708.707.707.707.707-.707zm2.317 2.317.707-.707L15.293 15l-.707.707-.707.707 2.316 2.317zm0 0 1-.026c-.102-3.978-.868-6.636-2.648-8.29l-.68.733-.681.733c1.166 1.083 1.91 3.034 2.009 6.875zm-2.329-7.583.68-.733c-1.758-1.633-4.386-2.17-7.894-2.248l-.022 1-.022 1c3.439.075 5.398.618 6.578 1.714zm-4.917.337.707-.707-2.319-2.319-.707.707-.707.708 2.319 2.318zm-.707.707.707.707.707-.707-.707-.707-.707-.707-.708.707zM5.414 7.95l-.707.707 3.535 3.535.708-.707.707-.707L6.12 7.242zM8.95 4.414l-.708-.707-3.535 3.535.707.708.707.707L9.657 5.12z" fill="#fff" mask="url(#b)"/></g><defs><filter id="a" x="0" y="0" width="26.363" height="26.363" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dy="1"/><feGaussianBlur stdDeviation="2"/><feColorMatrix values="0 0 0 0 0.6 0 0 0 0 0.6 0 0 0 0 0.6 0 0 0 1 0"/><feBlend mode="multiply" in2="BackgroundImageFix" result="effect1_dropShadow_10127_472320"/><feBlend in="SourceGraphic" in2="effect1_dropShadow_10127_472320" result="shape"/></filter></defs></svg>`
  return svgToURL(rotatedCursorSvg)
}

/**
 * Scale dimensions to fit within bounds while maintaining aspect ratio
 * @param {number} width - Current width
 * @param {number} height - Current height
 * @param {number} maxWidth - Maximum allowed width
 * @param {number} maxHeight - Maximum allowed height
 * @returns {{width: number, height: number}} Scaled dimensions
 */
export function scaleDimensionsToFitBounds(width: number, height: number, maxWidth: number, maxHeight: number) {
  const aspectRatio = width / height
  let constrainedWidth = width
  let constrainedHeight = height

  // Scale down if dimensions exceed bounds
  if (constrainedWidth > maxWidth) {
    constrainedWidth = maxWidth
    constrainedHeight = constrainedWidth / aspectRatio
  }
  if (constrainedHeight > maxHeight) {
    constrainedHeight = maxHeight
    constrainedWidth = constrainedHeight * aspectRatio
    // Re-check width after adjusting for height
    if (constrainedWidth > maxWidth) {
      constrainedWidth = maxWidth
      constrainedHeight = constrainedWidth / aspectRatio
    }
  }

  return { width: constrainedWidth, height: constrainedHeight }
}

export function constrainBoxToBounds(box: IRect, bounds: { left: number, top: number, right: number, bottom: number }) {
  const { x, y, width, height } = box
  const { left, top, right, bottom } = bounds
  const maxWidth = right - left
  const maxHeight = bottom - top

  // Scale dimensions to fit within bounds
  const { width: constrainedWidth, height: constrainedHeight }
    = scaleDimensionsToFitBounds(width, height, maxWidth, maxHeight)

  // Constrain position to keep box within bounds
  let constrainedX = Math.max(left, Math.min(x, right - constrainedWidth))
  let constrainedY = Math.max(top, Math.min(y, bottom - constrainedHeight))

  // Final validation: ensure the box fits within bounds
  if (constrainedX + constrainedWidth > right) {
    constrainedX = right - constrainedWidth
  }
  if (constrainedY + constrainedHeight > bottom) {
    constrainedY = bottom - constrainedHeight
  }
  if (constrainedX < left) {
    constrainedX = left
  }
  if (constrainedY < top) {
    constrainedY = top
  }

  return {
    x: constrainedX,
    y: constrainedY,
    width: constrainedWidth,
    height: constrainedHeight,
  }
}
