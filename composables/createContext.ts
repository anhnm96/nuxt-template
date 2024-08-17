export function createContext<ContextType>(contextName: string | string[]) {
  const injectionKey: InjectionKey<ContextType> = Symbol(contextName.toString())

  function provideContext(contextValue: ContextType) {
    provide(injectionKey, contextValue)
    return contextValue
  }

  function injectContext(fallback?: ContextType) {
    const context = inject(injectionKey, fallback)
    if (!context) {
      throw new Error(
      `Injection \`${injectionKey.toString()}\` not found. Component must be used within ${
        Array.isArray(contextName)
          ? `one of the following components: ${contextName.join(
              ', ',
            )}`
          : `\`${contextName}\``
      }`,
      )
    }
    return context
  }

  return [provideContext, injectContext] as const
}
