import type { Placement } from '@floating-ui/vue'

/**
 * Converts a Floating UI placement value to a CSS transform-origin value
 *
 * @param placement - The Floating UI placement value
 * @returns The corresponding CSS transform-origin value
 */
export function getTransformOrigin(placement: Placement): string {
  const transformOrigins: Record<Placement, string> = {
    // Top placements
    'top': 'bottom',
    'top-start': 'bottom left',
    'top-end': 'bottom right',

    // Right placements
    'right': 'left',
    'right-start': 'left top',
    'right-end': 'left bottom',

    // Bottom placements
    'bottom': 'top',
    'bottom-start': 'top left',
    'bottom-end': 'top right',

    // Left placements
    'left': 'right',
    'left-start': 'right top',
    'left-end': 'right bottom',
  }

  return transformOrigins[placement] || 'center'
}
