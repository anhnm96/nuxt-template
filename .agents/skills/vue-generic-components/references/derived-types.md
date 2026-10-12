# Deriving types from accessor props

Read this when a prop's value decides the *type* of another prop or of `v-model` — an
`itemValue` accessor choosing what the model emits, an `itemChildren` accessor choosing what
an "option" even is.

- [The shape](#the-shape)
- [Detecting an omitted prop](#detecting-an-omitted-prop)
- [Composing derivations](#composing-derivations)
- [Inference limits worth knowing](#inference-limits-worth-knowing)
- [Testing a derived type](#testing-a-derived-type)
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

Then every *other* accessor keys off the derived type, not off `items`. This is the parameter
list `<script setup generic="…">` carries, written out:

```ts
I extends Record<string, any>,
CK extends keyof I | ((item: I) => any[]) | undefined = undefined,
VK extends keyof OptionOf<I, CK> | ((item: OptionOf<I, CK>) => any) | undefined = undefined,
M extends boolean = false
```

This is what makes `item-label="title"` an error when `title` belongs to the group rather than
the child — the constraint is computed from `CK`, so the editor rejects it at the call site.

## Inference limits worth knowing

**A key accessor infers everywhere. A function accessor needs an explicit parameter type when,
and only when, the prop is itself a type parameter.**

```vue
<!-- infers VK = 'gameId'; the model is string | null -->
<Select :items="games" item-value="gameId" />

<!-- `g` has no contextual type: TS7006 on the parameter, and TS2322 because
     VK falls back to its `undefined` default — which is whole-item mode -->
<Select :items="games" :item-value="g => g.gameId" />

<!-- works: annotate the parameter -->
<Select :items="games" :item-value="(g: Game) => g.gameId" />
```

The reason is circular: `VK` is inferred from this very expression, so there is no settled
type to push back into the arrow's parameter. It is not specific to nesting — the flat form
behaves the same way.

An accessor typed in terms of an *already inferred* parameter has no such circularity, and the
bare arrow is fine there:

```vue
<!-- itemLabel is SelectAccessor<SelectOptionType<I, CK>, string>, not a type parameter.
     CK is already fixed by item-children, so `g` is contextually typed as Game. -->
<Select
  :items="categories"
  item-children="games"
  :item-label="g => g.gameName"
  item-value="gameId"
/>
```

So the limit is per prop. Document it on the props that are type parameters — `itemChildren`,
`itemValue` — and leave the others alone.

**Keep the `= undefined` default on every accessor type parameter.** It is what makes the
failure loud: nothing but `undefined` is assignable to `undefined`, so the rejected arrow
reports TS2322 at the call site as well as TS7006, with or without `noImplicitAny`. A looser
default could absorb the arrow and drop to whole-item mode in silence.

## Testing a derived type

A derived type is only as good as its call-site test. These conditionals are easy to write in
a way that compiles and then resolves to `any` or `never`, so assert in both directions — that
the right type is accepted *and* that the wrong one is rejected. A one-direction assertion
passes happily when the type resolved to `any`.

The call-site probe is a `.vue` page checked by vue-tsc; `app/pages/playground/select-types.vue`
is the worked example. For an assertion inside the component, where there is no call site, an
exact-match helper reports both directions at once:

```ts
type Expect<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never

// Fails to compile if the model type drifts in either direction.
const _model: Expect<typeof modelValue.value, SelectModel<V, M> | undefined> = true
```

Accessor cases worth one line each in the probe page:

- the accessor **omitted** — the whole item is the value, so the model is `Game | null`;
- the accessor **as a key** — the model is the key's property type;
- the accessor **as an annotated arrow** — the model is the return type;
- the accessor **as a bare arrow** — expected to fail, so hold it under `@vue-expect-error`
  and confirm the directive is live. One directive covers both errors the bare arrow raises,
  so give that element no other mistake;
- a **nested** accessor, where every other accessor must key off the child and not the group;
- a key that belongs to the **group** rather than the child, under `@vue-expect-error`.

## Declaring the props

Put the props interface in a plain `<script>` block alongside `<script setup>` so it can be
exported and referenced by name:

```vue
<script lang="ts">
// `OptionOf` and `Accessor` live in a .ts module beside the component, because the
// `generic` attribute and this block both need them.
import type { Accessor, OptionOf } from './useSelect'

export interface SelectProps<
  I extends Record<string, any>,
  CK extends keyof I | ((item: I) => any[]) | undefined = undefined,
  VK extends keyof OptionOf<I, CK> | ((item: OptionOf<I, CK>) => any) | undefined = undefined,
  M extends boolean = false,
> {
  items: I[]
  itemChildren?: CK
  itemValue?: VK
  itemLabel?: Accessor<OptionOf<I, CK>, string>
  multiple?: M & boolean
}
</script>

<script setup lang="ts" generic="
  I extends Record<string, any>,
  CK extends keyof I | ((item: I) => any[]) | undefined = undefined,
  VK extends keyof OptionOf<I, CK> | ((item: OptionOf<I, CK>) => any) | undefined = undefined,
  M extends boolean = false
">
const props = defineProps<SelectProps<I, CK, VK, M>>()
</script>
```

The `generic` attribute carries the real constraints, and it may span lines. The exported
interface restates them so consumers can name the type. The two drift apart in silence, so
change both together.
