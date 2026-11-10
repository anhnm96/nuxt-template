# createContext

A typed pair of `provide` and `inject` functions around one injection key. A parent component provides a value, and any descendant reads it. Reading it outside the parent throws an error that names the missing provider.

It is the house pattern for sharing state inside a compound component. The Accordion, Autocomplete, Calendar, Menu, Select and Tab components each have a `context.ts` built on it. So do `Dialog` and a few list pages.

## Usage

Create the pair once, in a `context.ts` next to the components.

```ts
// context.ts
export interface TabsContext {
  active: Ref<string>
  select: (id: string) => void
}

export const [provideTabsContext, injectTabsContext] = createContext<TabsContext>('Tabs')
```

The parent provides it in `setup`.

```ts
// Tabs.vue
const active = ref('first')
provideTabsContext({
  active,
  select: (id) => {
    active.value = id
  },
})
```

A descendant injects it.

```ts
// Tab.vue
const { active, select } = injectTabsContext()
```

## Signature

```ts
function createContext<ContextType>(
  contextName: string | string[],
): readonly [
  provideContext: (value: ContextType) => ContextType,
  injectContext: (fallback?: ContextType) => ContextType,
]
```

`contextName` names the provider in the error message. Pass an array when more than one component can provide the context.

## Behaviour

- `provideContext` calls `provide` and returns the value it was given, so a parent can provide and keep a reference in one step.
- `injectContext` throws when nothing is provided. The message reads ``Injection `Symbol(Tabs)` not found. Component must be used within `Tabs` ``. With an array of names it reads `…one of the following components: A, B`.
- Pass a `fallback` to `injectContext` when the descendant is allowed to render without a parent. The throw is skipped, and the fallback is returned.
- Each call to `createContext` makes its own `Symbol`, so two contexts with the same name still do not collide.

## Notes

- The check is `!context`, so a provided value that is falsy also throws. Provide an object, not `0`, `''` or `false`.
- Both functions call Vue's `provide` and `inject`, so they work only during `setup`.
- `hostContext.ts` uses the fallback form on purpose. [Menu](/docs/components/menu) injects a `HostContext` and falls back to `NO_HOST` when it renders outside any Popover. See the [glossary](/docs/reference/glossary) entry for Host.
