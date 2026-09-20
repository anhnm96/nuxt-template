---
name: vue-generic-components
description: Typing Vue components whose props change the shape of another prop or of v-model — `multiple` making a value an array, `range` making a date a tuple, an accessor prop deciding what v-model emits. Covers `<script setup generic>`, conditional model types, accessor-derived types, and the two prop-casting traps that fail silently. Use when writing or reviewing a generic component, `defineProps` with a type parameter, a `defineModel` whose type depends on another prop, or a base component with a `multiple`/`range`/`clearable`-style prop that changes the model shape.
---

# Generic Vue components

For components where one prop changes what another prop means — `multiple` turning `v-model`
into an array, `range` turning a date into a pair, `itemValue` deciding whether the model
carries a string or an object.

## The thing that trips people up

A prop declaration is compiled twice, and the two can disagree with no error:

- **TypeScript** — erased at build time. Gives you the type parameter to narrow with.
- **The SFC compiler** — emits a runtime `props` object that decides casting and defaults.

The SFC compiler is syntactic. It never runs the type checker, so it can only emit a
constructor it can literally see.

Check what a component really emitted:

```bash
# cwd must be the project root — the script resolves Vue from there, not from its own location
node .claude/skills/vue-generic-components/scripts/probe-props.mjs   app/components/base/select/Select.vue multiple
# multiple: { type: Boolean, required: false }
```

Omit the prop name to dump the whole props object — the quickest way to audit a component
you did not write.

## Boolean props in a generic component

| declaration | runtime type | `<C multiple>` yields |
| --- | --- | --- |
| `multiple?: boolean` | `Boolean` | `true` |
| `multiple?: M` | `null` | `''` — falsy |
| **`multiple?: M & boolean`** | **`Boolean`** | **`true`** |

A bare type parameter gives the compiler nothing concrete, so it emits `type: null` — "don't
cast". Boolean casting is what turns a valueless attribute's `''` into `true`, so without it
`<C multiple>` is falsy and the component silently behaves as single-select while the types
insist otherwise.

`& boolean` gives the compiler a concrete member while TypeScript still infers the literal
`M`. It looks redundant, so leave a comment — otherwise someone tidies it away and the bug
comes back.

```ts
/** `M & boolean`, never a bare `M`: a bare type parameter emits `type: null` and
 *  `<Select multiple>` arrives as `''`. */
multiple?: M & boolean
```

## Don't put `boolean` in a union with another type

Vue casts an **absent** prop to `false` whenever `Boolean` is in its runtime type. So a
`false` sentinel breaks every call site that passes nothing:

```ts
filterFn?: false | ((item: T, q: string) => boolean)  // → type: [Boolean, Function]
```

`props.filterFn ?? defaultFilter` now resolves to `false` everywhere, because the prop is
`false` rather than `undefined`. Use two props that each mean one thing — a plain function
prop plus a separate boolean (`externalFilter`) — instead of one prop meaning two.

## Narrowing v-model

```ts
type SelectModel<V, M extends boolean> = M extends true ? V[] : V | null

const modelValue = defineModel<SelectModel<Value, M>>()
```

- **No `default`.** The modes need different ones (`null` vs `[]`) and a prop carries one.
  Normalise where you read it.
- **`props.multiple` won't narrow `modelValue` inside the component** — TypeScript can't
  narrow a conditional over an unresolved type parameter. Keep an `isMultiple` computed for
  logic and funnel writes through one cast.
- **Keep slot props the same shape in both modes.** Expose `option` and `options`; let the
  single case read `options[0] ?? null`. A slot whose props change shape is worse to type
  than the model.

## Deriving types from accessor props

When `itemValue` decides what the model emits, or `itemChildren` decides what an option even
is, see `references/derived-types.md` — conditional accessor types, detecting an omitted prop
with `[CK] extends [undefined]`, and the inference limits (function accessors need an explicit
parameter type; key accessors infer fine).

## Checking it

Both traps are invisible to the browser, to unit tests and to the editor, so measure rather
than assume:

1. `probe-props.mjs` — is it `type: Boolean`, or `type: null`?
2. A `.vue` file checked by `vue-tsc`, binding a deliberately wrong `v-model` under
   `@vue-expect-error`. Use the bare attribute (`<Select multiple>`); `:multiple="true"`
   supplies a real boolean and never exercises casting, so it passes either way.
3. A test that mounts with `multiple: ''` — the pre-cast value a valueless attribute gives.

One caveat on step 2: an `@vue-expect-error` guard can pass because nothing is being checked.
When you add one, confirm it is live — make the binding correct and check the checker now
reports the directive as *unused*. Broken tsconfig resolution and a missing `strictTemplates`
both produce a green run that checks nothing.
