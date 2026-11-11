import type { MaybeRefOrGetter } from 'vue'
import { getTabEnds } from '~/utils/getTabStops'

interface TooltipElements {
  anchor: MaybeRefOrGetter<HTMLElement | null>
  /** The positioned element. It holds the Surface and gets the pointer events. */
  container: MaybeRefOrGetter<HTMLElement | null | undefined>
  /** The Surface: the element that takes focus and holds the slot content. */
  surface: MaybeRefOrGetter<HTMLElement | null | undefined>
}

interface TooltipState {
  isVisible: () => boolean
  interactive: () => boolean | undefined
  disabled: () => boolean | undefined
}

interface TooltipActions {
  /** Shows at once, and replaces a show delay that focus on the Anchor may have started. */
  showNow: () => void
  hide: (immediate?: boolean) => void
  /** Cancels a pending hover-leave hide. */
  cancelHide: () => void
}

// Shift is not a modifier here. Shift+Tab is a Tab shortcut, so each caller tests `shiftKey`.
const hasNonShiftModifier = (event: KeyboardEvent) => event.altKey || event.ctrlKey || event.metaKey

/**
 * Keyboard entry for an Interactive Tooltip: ArrowDown on the Anchor focuses the Surface;
 * Tab, Shift+Tab and Escape leave it. See DESIGN.md, "Keyboard entry".
 */
export function useTooltipKeyboard(elements: TooltipElements, state: TooltipState, actions: TooltipActions) {
  const { isVisible, interactive, disabled } = state
  const { showNow, hide, cancelHide } = actions
  const anchor = () => toValue(elements.anchor)
  const container = () => toValue(elements.container)
  const surface = () => toValue(elements.surface)

  // Set while ArrowDown has moved focus into the Surface. A mouse click that focuses the
  // Surface does not set it, so the pointer leaving still hides the tooltip.
  let enteredByKeyboard = false
  // Sync flush: a handler that runs right after the tooltip hides must not read a stale flag.
  watch(isVisible, (visible) => {
    if (!visible) enteredByKeyboard = false
  }, { flush: 'sync' })

  function hasKeyboardSurfaceFocus() {
    return enteredByKeyboard && isNodeInside(container(), document.activeElement)
  }

  /** Returns focus to the Anchor only if focus is inside the tooltip. */
  function hideAndRestoreFocus() {
    const el = anchor()
    if (isNodeInside(container(), document.activeElement) && el?.isConnected)
      el.focus({ preventScroll: true })
    // `hide(true)` can still wait for `hideDelay`; see DESIGN.md, "Keyboard entry".
    const surfaceEl = surface()
    if (interactive() && surfaceEl) surfaceEl.inert = true
    hide(true)
  }

  function handleFocusout(event: FocusEvent) {
    if (isNodeInside(container(), event.relatedTarget)) return
    enteredByKeyboard = false
    hide()
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.defaultPrevented) return
    if (event.key === 'Escape') {
      event.preventDefault()
      // The document listener would also hide the tooltip, but it lets Escape reach a
      // dialog behind the tooltip.
      event.stopPropagation()
      hideAndRestoreFocus()
      return
    }

    const surfaceEl = surface()
    if (event.key !== 'Tab' || hasNonShiftModifier(event) || !surfaceEl || !anchor()?.isConnected) return

    // No stop precedes the Surface itself, so Shift+Tab from the Surface hides the tooltip.
    if (!(event.shiftKey && event.target === surfaceEl)) {
      const { first, last } = getTabEnds(surfaceEl)
      const boundary = event.shiftKey ? first : last
      if (boundary && event.target !== boundary) return
    }

    // Focus the Anchor first. The browser then handles a forward Tab from the Anchor, which
    // keeps the page tab order. The code cancels Shift+Tab, because the browser would move
    // focus to the element before the Anchor.
    if (event.shiftKey) event.preventDefault()
    event.stopPropagation()
    hideAndRestoreFocus()
  }

  useEventListener(() => (interactive() ? anchor() : null), 'keydown', async (event: KeyboardEvent) => {
    const el = anchor()
    if (disabled() || !el || event.target !== el) return
    if (event.key !== 'ArrowDown' || event.defaultPrevented || hasNonShiftModifier(event) || event.shiftKey) return

    event.preventDefault()
    showNow()
    // The Surface mounts on the next tick. Skip the focus move if focus left the Anchor meanwhile.
    await nextTick()
    if (!isVisible() || document.activeElement !== el) return
    const surfaceEl = surface()
    surfaceEl?.focus({ preventScroll: true })
    enteredByKeyboard = isNodeInside(surfaceEl, document.activeElement)
  })

  const surfaceListeners = computed(() => (interactive()
    ? { focusin: cancelHide, focusout: handleFocusout, keydown: handleKeydown }
    : {}))

  return { hasKeyboardSurfaceFocus, hideAndRestoreFocus, surfaceListeners }
}
