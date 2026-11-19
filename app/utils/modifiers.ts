/** The modifiers of a gesture, with Ctrl already read as ⌘ on an Apple platform. */
export interface GestureModifiers {
  shift: boolean
  /** Ctrl, or ⌘ on an Apple platform. */
  primary: boolean
}

export function isApplePlatform() {
  if (typeof navigator === 'undefined') return false
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } }
  return /mac|iphone|ipad|ipod/i.test(nav.userAgentData?.platform ?? nav.platform ?? '')
}

/**
 * Reads Shift and the primary modifier: Ctrl, or ⌘ on an Apple platform.
 *
 * Returns `null` when the event has the other platform modifier. Ctrl on an Apple platform
 * opens the context menu, and ⌘ elsewhere belongs to the system. The caller must ignore such
 * a gesture.
 */
export function readModifiers(event: MouseEvent | KeyboardEvent): GestureModifiers | null {
  const apple = isApplePlatform()
  if (apple ? event.ctrlKey : event.metaKey) return null
  return { shift: event.shiftKey, primary: apple ? event.metaKey : event.ctrlKey }
}
