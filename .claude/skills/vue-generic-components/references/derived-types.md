# Deriving types from accessor props

Read this when a prop's value decides the *type* of another prop or of `v-model` — an
`itemValue` accessor choosing what the model emits, an `itemChildren` accessor choosing what
an "option" even is.

- [The shape](#the-shape)
- [Detecting an omitted prop](#detecting-an-omitted-prop)
- [Composing derivations](#composing-derivations)
- [Inference limits worth knowing](#inference-limits-worth-knowing)
- [Declaring the props](#declaring-the-props)

## The shape

An accessor prop is `keyof T | ((item: T) => R)` — a key or a function. The derived type is a
conditional over which one was passed:

```ts
export type Accessor<T, R> = keyof T | ((item: T) => R)

/** What the accessor yields. Omitting it means the whole item is the value. */
export type ValueOf<T, VK>
  = VK extends keyof T ? T[VK]
    : VK extends (item: T) => infer R ? R
      : T
```

Order matters: test `keyof T` first, because a string literal also fails the function branch
and would otherwise fall through to the `T` fallback.

## Detecting an omitted prop

To branch on "this prop was not passed", compare against `undefined` in a **tuple**:

```ts
export type OptionOf<I, CK> = [CK] extends [undefined] ? I : ChildrenOf<I, CK>
```

The `[...]` wrapper matters. A bare `CK extends undefined` is a *distributive* conditional: if
`CK` is a union it evaluates per member and unions the results, so `string | undefined` takes
both branches and you get a union of two unrelated types. Wrapping both sides in a tuple turns
off distribution and asks the question you actually meant — "is this whole type `undefined`?"

Pair it with a default of `undefined` on the type parameter so the omitted case is reachable:

```ts
CK extends keyof I | ((item: I) => any[]) | undefined = undefined
```

## Composing derivations

Derivations compose, and the constraint of one parameter can reference another:

```ts
type ElementOf<A> = A extends (infer U)[] ? U : never

type ChildrenOf<I, CK>
  = CK extends keyof I ? ElementOf<I[CK]>
    : CK extends (item: I) => infer R ? ElementOf<R>
      : never

// The option type is `items` itself when flat, the children when nested.
type OptionOf<I, CK> = [CK] extends [undefined] ? I : ChildrenOf<I, CK>
```

Then every *other* accessor keys off the derived type, not off `items`:

```ts
<I extends Record<string, any>,
 CK extends keyof I | ((item: I) => any[]) | undefined = undefined,
 VK extends keyof OptionOf<I, CK> | ((item: OptionOf<I, CK>) => any) | undefined = undefined,
 M extends boolean = false>
```

This is what makes `item-label="title"` an error when `title` belongs to the group rather than
the child — the constraint is computed from `CK`, so the editor rejects it at the call site.

## Inference limits worth knowing

**Key accessors infer everywhere; function accessors need an explicit parameter type.**

```ts
// infers: VK = 'gameId', model is string | null
<Select :items="games" item-value="gameId" />

// infers: the parameter cannot be contextually typed, so this silently
// falls back to whole-item mode
<Select :items="games" :item-value="g => g.gameId" />

// works: annotate the parameter
<Select :items="games" :item-value="(g: Game) => g.gameId" />
```

The reason is a circularity: the parameter's type depends on a type argument that TypeScript is
still inferring from the same object literal, so contextual typing cannot close the loop. This
is not specific to nesting — it applies to the flat form too. Document it next to the prop
rather than letting each call site rediscover it.

**A derived type is only as good as its call-site test.** These conditionals are easy to write
in a way that compiles and resolves to `any` or `never` at the call site, so assert in both
directions — that the right type is accepted *and* the wrong one rejected. A one-direction
assertion passes happily when the type resolved to `any`.

## Declaring the props

Put the props interface in a plain `<script>` block alongside `<script setup>` so it can be
exported and referenced by name:

```vue
<script lang="ts">
export interface SelectProps<I, CK = undefined, VK = undefined, M extends boolean = false> {
  items: I[]
  itemChildren?: CK
  itemValue?: VK
  multiple?: M & boolean
}
</script>

<script setup lang="ts" generic="I extends Record<string, any>, CK extends ... , M extends boolean = false">
const props = defineProps<SelectProps<I, CK, VK, M>>()
</script>
```

The generic parameter list on `<script setup generic>` carries the real constraints; the
exported interface mirrors them so consumers can name the type.
