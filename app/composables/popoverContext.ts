/**
 * What a popover offers the content inside it. Provided by every Menu Host — `Dropdown`
 * and `ContextMenu` — and injected by content that has to close the thing wrapping it.
 *
 * It exists because a `Menu` owns no placement of its own, so activating a Menu Item has
 * to reach a host the Menu cannot name. See CONTEXT.md — Menu Host.
 */
export interface PopoverContext {
  dismiss: () => void
}

/** The fallback for content rendered outside any popover: dismissal is then a no-op. */
export const NO_POPOVER: PopoverContext = { dismiss: () => {} }

export const [providePopoverContext, injectPopoverContext]
  = createContext<PopoverContext>('PopoverContext')
