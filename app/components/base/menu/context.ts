export interface MenuContext {
  /**
   * Told by a Menu Item that it was activated, after the item has emitted to its consumer.
   * The Menu dismisses its Host from here; the item cannot, because it does not know what
   * the Host is.
   */
  onItemActivate: () => void
}

export const [provideMenuContext, injectMenuContext] = createContext<MenuContext>('MenuContext')
