export function createContext<ContextType>(contextName: string | string[]) {
  const injectionKey: InjectionKey<ContextType> = Symbol(contextName.toString())

  const provideContext = (contextValue: ContextType) => {
    provide(injectionKey, contextValue)
    return contextValue
  }

  const injectContext = (fallback?: ContextType) => {
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

  return { provideContext, injectContext }
  // return [provideContext, injectContext]
}
