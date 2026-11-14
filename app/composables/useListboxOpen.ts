import type { Ref } from 'vue'
import type { UseOptionListReturn } from './useOptionList'

/**
 * Where the Active Option lands when the popup opens.
 *
 * `selected-or-none` leaves no Active Option when nothing is selected. An editable host uses
 * it so that `Enter` after a mouse open means "use my text" and does not commit the first row.
 */
export type OpenPosition = 'selected-or-first' | 'selected-or-last' | 'selected-or-none' | 'none'

export interface UseListboxOpenOptions {
  /** The open state. The host owns it; a Popover and the consumer can both write it. */
  isOpen: Ref<boolean>
  /**
   * Whether the popup may open now. Checked by `open()` only. A host must also give the same
   * answer to its Popover as `disabled`, or a mouse click opens what the keyboard refuses.
   */
  canOpen: () => boolean
  /**
   * The position for `open()` with no argument, and for an open that did not go through
   * `open()` at all.
   */
  defaultPosition: Exclude<OpenPosition, 'none'>
  /**
   * Called while open, when the Visible Options change and no longer hold the Active Option.
   * The host puts the Active Option somewhere valid, or clears it.
   */
  onActiveLost: () => void
  /** Called after the popup closes and the Active Option is cleared. */
  onClose?: () => void
}

/**
 * The open protocol that `Select` and `Autocomplete` share: where the Active Option starts,
 * and how it stays valid while the popup is open.
 *
 * It owns the mechanism only. Whether the popup may open, where an undriven open lands and
 * what replaces a lost Active Option are the host's policy, which is the cut ADR-0012 makes
 * for `useOptionList`. That is also why this is a separate composable and the list does not
 * take `isOpen`.
 */
export function useListboxOpen<T>(list: UseOptionListReturn<T>, options: UseListboxOpenOptions) {
  const { visibleOptions, activeKey, activeIndex, isSelected, navigate, nav } = list

  /** Positions the Active Option for a freshly-opened popup. */
  function positionOnOpen(position: Exclude<OpenPosition, 'none'>) {
    const selected = visibleOptions.value.findIndex(isSelected)
    if (selected !== -1) return navigate(selected)
    if (position === 'selected-or-none') {
      activeKey.value = null
      return
    }
    navigate(position === 'selected-or-first' ? nav.firstEnabled() : nav.lastEnabled())
  }

  /**
   * Set by `open()` so the `isOpen` watcher can tell an open that is already positioned,
   * possibly deliberately to nothing, from one that `open()` did not drive. A mouse click
   * reaches the Popover directly, and a consumer can write `isOpen` itself.
   */
  let openWasHandled = false

  /** Returns whether the popup actually opened; callers must not act on a refused open. */
  function open(position: OpenPosition = options.defaultPosition): boolean {
    if (!options.canOpen()) return false
    openWasHandled = true
    options.isOpen.value = true
    if (position === 'none') {
      activeKey.value = null
      return true
    }
    positionOnOpen(position)
    return true
  }

  function close() {
    options.isOpen.value = false
  }

  watch(options.isOpen, (isOpen) => {
    if (!isOpen) {
      activeKey.value = null
      openWasHandled = false
      options.onClose?.()
      return
    }
    if (!openWasHandled) positionOnOpen(options.defaultPosition)
  })

  // A re-narrowing, or `items` that arrive late, can remove the Active Option from the list.
  watch(visibleOptions, () => {
    if (!options.isOpen.value) return
    // `activeIndex` already scans the new list for this answer, and the template reads it
    // through `activeDescendantId` on the same tick. A second scan here would repeat it.
    if (activeIndex.value !== -1) return
    options.onActiveLost()
  })

  return { open, close }
}
