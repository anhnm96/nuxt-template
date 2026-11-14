import type { MaybeElement, Placement, ReferenceElement } from '@floating-ui/vue'
import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue'
import { autoUpdate, flip, offset as floatingOffset, shift, useFloating } from '@floating-ui/vue'

/** Where `PopoverSurface` teleports every Popover. */
export const POPOVER_HOST = '.popovers'

export interface UsePopoverOptions {
  /**
   * What the Popover is placed against — an element, a component, or a `VirtualElement`
   * standing for a point. This is the whole of what `usePopover` knows about the thing it
   * belongs to; it never learns whether a Trigger exists. See DESIGN.md — The seam.
   */
  reference: MaybeRefOrGetter<MaybeElement<ReferenceElement>>
  /** The open state. The caller owns it, so a host can model it however it likes. */
  open: Ref<boolean>
  placement?: MaybeRefOrGetter<Placement>
  offset?: MaybeRefOrGetter<number>
  /** Gates opening, never dismissal. See DESIGN.md — `disabled` gates opening. */
  disabled?: MaybeRefOrGetter<boolean | undefined>
  /**
   * Whether a click outside dismisses. A resolved boolean: this composable never derives it
   * from how the Popover opens, because a host with no Trigger has nothing to derive it from.
   * @defaultValue true
   */
  dismissOnClickOutside?: MaybeRefOrGetter<boolean | undefined>
  /**
   * Whether closing returns focus to whatever held it when the Popover opened.
   * @defaultValue true
   */
  restoreFocus?: MaybeRefOrGetter<boolean | undefined>
  /**
   * An element that counts as "inside" for click-outside, besides the Popover itself. A host
   * passes its Trigger, so a click in a text-field Trigger can place the caret without a
   * dismiss. Hosts anchored to a point pass nothing.
   */
  anchor?: MaybeRefOrGetter<HTMLElement | null | undefined>
}

export interface Popover {
  /** The positioned element, once bound. Read-only to everything but `PopoverSurface`. */
  popoverEl: Readonly<Ref<HTMLElement | null>>
  /** Binds the positioned element. `PopoverSurface` calls this; nothing else should. */
  setPopoverEl: (el: HTMLElement | null) => void
  /** Whether the teleport is mounted. Stays true through the leave transition. */
  isMounted: Readonly<Ref<boolean>>
  isOpen: Ref<boolean>
  /** Floating styles plus `--trigger-origin`, for the positioned element. */
  styles: ComputedRef<Record<string, string>>
  resolvedPlacement: Readonly<Ref<Placement>>
  /** The resolved options, for a host that needs to report its own configuration. */
  dismissOnClickOutside: ComputedRef<boolean>
  restoreFocus: ComputedRef<boolean>
  toggle: (value?: boolean) => void
  dismiss: () => void
  /**
   * Dismisses on a click outside the Popover and outside the `anchor`, when
   * `dismissOnClickOutside` allows it. `PopoverSurface` calls it from click-outside.
   */
  handleClickOutside: (event: Event) => void
  /**
   * Dismisses on `Escape` and stops the event. A host calls this from its own keydown
   * handler; `PopoverSurface` calls it for keystrokes inside the Popover, which never reach
   * the host because the teleport moved them out of its subtree.
   */
  handleEscape: (event: KeyboardEvent) => void
  /** Releases the teleport once the leave transition has finished. */
  onAfterLeave: () => void
  /**
   * Re-measures against the reference. Needed only where the reference keeps its identity
   * while moving — a `VirtualElement` standing for a cursor point does, so `useFloating`
   * sees no change to watch.
   */
  update: () => void
}

/**
 * Everything a Popover needs and nothing a Trigger needs. `Dropdown` adds the Trigger on top;
 * `ContextMenu`, `Select`, `Autocomplete`, `DatePicker` and `TimePicker` use this directly.
 *
 * See `DESIGN.md` beside this file, and ADR-0013.
 */
export function usePopover(options: UsePopoverOptions): Popover {
  const isOpen = options.open
  const popoverEl = shallowRef<HTMLElement | null>(null)
  const reference = computed(() => toValue(options.reference))

  const { floatingStyles, placement: resolvedPlacement, update } = useFloating(reference, popoverEl, {
    placement: () => toValue(options.placement) ?? 'bottom',
    middleware: [floatingOffset(() => toValue(options.offset) ?? 4), flip(), shift()],
    whileElementsMounted: autoUpdate,
  })

  // The resolved placement, so a Popover that `flip()` pushed above its reference still
  // animates from the edge nearest it.
  const styles = computed(() => ({
    ...floatingStyles.value,
    '--trigger-origin': getTransformOrigin(resolvedPlacement.value),
  }))

  const dismissOnClickOutside = computed(() => toValue(options.dismissOnClickOutside) ?? true)
  const restoreFocus = computed(() => toValue(options.restoreFocus) ?? true)

  function toggle(value?: boolean) {
    const next = value ?? !isOpen.value
    // `disabled` gates opening only. Gating dismissal too would strand an open Popover
    // whenever a host disables mid-interaction.
    if (toValue(options.disabled) && next) return
    isOpen.value = next
  }

  function dismiss() {
    toggle(false)
  }

  // A Trigger that toggles closes itself on its own click, so it loses nothing here.
  function handleClickOutside(event: Event) {
    if (!dismissOnClickOutside.value) return
    if (isNodeInside(toValue(options.anchor), event.target)) return
    dismiss()
  }

  function handleEscape(event: KeyboardEvent) {
    if (event.key !== 'Escape' || !isOpen.value) return
    event.stopImmediatePropagation()
    // Bypasses `toggle`: an escape hatch that can itself be disabled is not an escape hatch.
    isOpen.value = false
  }

  // ------------------------------------------------------------- focus restore

  let lastFocusedElement: HTMLElement | null = null

  watch(isOpen, (value) => {
    if (value) {
      lastFocusedElement = document.activeElement as HTMLElement
      return
    }
    if (!restoreFocus.value) return

    // Read now, while the surface is still in the DOM. Only focus inside a Popover surface is
    // the Popover's to move: this one, or one nested in its content, which is teleported
    // beside it. Focus on the Trigger is already where a restore would put it, and focus that
    // a click moved to `<body>` or to another control belongs to the user.
    const active = document.activeElement
    if (!isNodeInside(popoverEl.value, active) && !active?.closest(POPOVER_HOST)) return

    // Deferred because focus lands somewhere undefined during unmount.
    setTimeout(() => {
      // Reopened before the restore fired — the new Popover has placed focus deliberately,
      // so restoring now would steal it back.
      if (isOpen.value) return
      // Focus that moved on to another control after close, as `Tab` does, stays there. So
      // does focus in another Popover that is still open.
      const now = document.activeElement
      if (!now || now === document.body || isNodeInside(popoverEl.value, now)) {
        lastFocusedElement?.focus()
      }
    }, 0)
  })

  // ------------------------------------------------------------ mount lifecycle

  // Gated separately from `isOpen`, so closing does not unmount the teleport before the
  // leave transition has played.
  const isMounted = shallowRef(false)
  watch(isOpen, (value) => {
    if (value) isMounted.value = true
  }, { immediate: true })

  function onAfterLeave() {
    if (!isOpen.value) isMounted.value = false
  }

  return {
    popoverEl,
    setPopoverEl: (el: HTMLElement | null) => {
      popoverEl.value = el
    },
    isMounted,
    isOpen,
    styles,
    resolvedPlacement,
    dismissOnClickOutside,
    restoreFocus,
    toggle,
    dismiss,
    handleClickOutside,
    handleEscape,
    onAfterLeave,
    update,
  }
}
