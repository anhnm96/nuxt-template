/**
 * What a Host offers the content inside its Popover. Provided by `Dropdown` and
 * `ContextMenu`, and injected by content that has to close the thing wrapping it.
 *
 * It exists because a `Menu` owns no placement of its own, so activating a Menu Item has
 * to reach a Host the Menu cannot name. See CONTEXT.md — Host, Menu Host.
 */
export interface HostContext {
  dismiss: () => void
}

/**
 * The fallback for content rendered outside any Popover. Dismissal is then a no-op, and its
 * identity is how content asks whether it has a Host at all — `Menu` reads that as "the user
 * just opened me".
 */
export const NO_HOST: HostContext = { dismiss: () => {} }

export const [provideHostContext, injectHostContext]
  = createContext<HostContext>('HostContext')
