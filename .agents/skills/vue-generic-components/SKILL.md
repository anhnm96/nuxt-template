---
name: vue-generic-components
description: Typing Vue components whose props change the shape of another prop or of v-model — `multiple` making a value an array, `range` making a date a tuple, an accessor prop deciding what v-model emits. Covers `<script setup generic>`, conditional model types, accessor-derived types, and the two prop-casting traps that fail silently. Use when writing or reviewing a generic component, `defineProps` with a type parameter, a `defineModel` whose type depends on another prop, or a base component with a `multiple`/`range`/`clearable`-style prop that changes the model shape.
---

# Generic Vue components

For components where one prop changes what another prop means — `multiple` turning `v-model`
into an array, `range` turning a date into a pair, `itemValue` deciding whether the model
carries a string or an object.

Every rule below was measured against the versions this repo installs: Vue 3.5.43,
`@vue/compiler-sfc` 3.5.43, TypeScript 6.0.3, vue-tsc 3.3.13 (`@vue/language-core` 3.3.13).
Casting lives in the Vue runtime and inference lives in the language tooling, so re-measure
after an upgrade rather than trusting this page.

## The thing that trips people up

A prop declaration is compiled twice, and the two can disagree with no error:

- **TypeScript** — erased at build time. Gives you the type parameter to narrow with.
- **The SFC compiler** — emits a runtime `props` object that decides casting and defaults.

The SFC compiler is syntactic. It never runs the type checker, so it can only emit a
constructor it can literally see.

Check what a component really emitted:

```bash
# cwd must be the project root — the script resolves Vue from there, not from its own location
node .claude/skills/vue-generic-components/scripts/probe-props.mjs app/components/base/select/Select.vue multiple
# multiple: { type: Boolean, required: false }
```

Omit the prop name to dump the whole props object — the quickest way to audit a component you
did not write. The dump also shows the model props that `defineModel` added, and any `default`
the compiler emitted.

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

### A generic Boolean prop cannot carry a `withDefaults` default

`false` is not assignable to `M & boolean`, so `withDefaults(…, { multiple: false })` reports
TS2322. The SFC compiler is syntactic and emits `default: false` regardless, so the failure is
type-level only. Do not silence it with a cast; restate the fallback where the prop is read:

```ts
const isMultiple = computed(() => props.multiple ?? false)
```

The `??` is there for the type, which is `(M & boolean) | undefined`. At runtime an absent
`type: Boolean` prop already arrives as `false`, so the restatement changes nothing a user can
see — unless the prop also declares a default, which is the next section.

## `Boolean` in a union: the absence trap

Vue casts an **absent** prop to `false` whenever `Boolean` is a member of its runtime type and
the prop declares no default. A `false` sentinel therefore breaks every call site that passes
nothing:

```ts
// a prop declaration, inside defineProps<{ … }>()
filterFn?: false | ((item: T, q: string) => boolean)  // → type: [Boolean, Function]
```

`props.filterFn ?? defaultFilter` never reaches `defaultFilter`, because the absent prop holds
`false` rather than `undefined`.

Three measured rules, so the union stays a judgement rather than a ban:

- Absence casts to `false` whenever `Boolean` is a member, in any position in the array.
- A declared default suppresses that cast. `withDefaults(…, { filterFn: undefined })` compiles
  to `default: undefined`, and the absent prop then arrives as `undefined`. The same trick
  restores `undefined` to a plain `boolean` prop.
- Member order decides only the empty-string cast. `[Boolean, String]` turns a bare attribute
  into `true`; `[String, Boolean]` leaves it as `''`.

So the union is wrong only when `false` and "absent" need to mean different things. It is right
when they mean the same thing: `TabPanels` declares `keepAlive: [Boolean, Object]`, and the
absent prop arriving as `false` is exactly what "no KeepAlive" means there.

Where they differ, prefer two props that each mean one thing — a plain function prop plus a
separate boolean (`externalFilter`) — over one prop meaning two. Where the union is
unavoidable, add the explicit `undefined` default, and probe the compiled props to confirm it
landed.

## Narrowing v-model

```ts
// <script setup lang="ts" generic="V, M extends boolean = false">
type SelectModel<V, M extends boolean> = M extends true ? V[] : V | null

const props = defineProps<{ items: V[], multiple?: M & boolean }>()
const modelValue = defineModel<SelectModel<V, M>>()
const isMultiple = computed(() => props.multiple ?? false)
```

**The public model type carries `undefined`.** `defineModel<T>()` gives `modelValue.value` the
type `T | undefined`, and a call site may bind a ref that holds `undefined`. `{ required: true }`
or a `default` removes the `undefined`, and removes the uncontrolled case with it. Keep the
two apart: `T | undefined` is the contract a consumer sees, and the `?? []` below is internal
normalisation that never widens that contract.

- **No `default` on the model.** The modes need different ones (`null` vs `[]`) and a prop
  carries one. Normalise where you read it, behind the runtime mode check:
  `isMultiple.value ? (modelValue.value as unknown[] | undefined) ?? [] : …`.
- **`props.multiple` does not narrow `modelValue` inside the component.** TypeScript cannot
  narrow a conditional over an unresolved type parameter. Use `isMultiple` for the logic.
- **Assert narrowly, on the line the runtime check makes safe.** One
  `modelValue.value = next as SelectModel<V, M>` inside the `isMultiple` branch is the whole
  cost. Widening the model type, casting `props`, or an `as any` at the top of the file hides
  the same mistake from the call site as well. Each assertion needs a call-site type test to
  earn its place — see "Checking it".
- **Keep slot props the same shape in both modes.** Expose `option` and `options`; let the
  single case read `options[0] ?? null`. A slot whose props change shape is worse to type than
  the model.
- A model whose type is a conditional compiles to `type: null`, so it never casts — harmless,
  because `v-model` always binds a real value. A plain `defineModel<boolean>('checked')`
  compiles to `type: Boolean` and does cast, which matters when a call site writes
  `<C checked>` as a bare attribute.

## Deriving types from accessor props

When `itemValue` decides what the model emits, or `itemChildren` decides what an option even
is, see `references/derived-types.md` — conditional accessor types, detecting an omitted prop
with `[CK] extends [undefined]`, and composing one derivation on another.

**An accessor prop that is itself a type parameter is an inference site.** An inline arrow
written there has no contextual type, because the parameter's type depends on an argument
TypeScript is still inferring from the same binding. The parameter is implicitly `any`, and
the type parameter falls back to its default:

```vue
<!-- infers VK = 'gameId'; the model is string | null -->
<Select :items="games" item-value="gameId" />
<!-- TS7006 on `g`, and TS2322 because VK fell back to `undefined` -->
<Select :items="games" :item-value="g => g.gameId" />
<!-- works -->
<Select :items="games" :item-value="(g: Game) => g.gameId" />
```

Two qualifications decide how much this costs:

- **It is per prop, not per component.** An accessor typed in terms of an *already inferred*
  parameter is contextually typed and needs no annotation:
  `itemLabel?: SelectAccessor<SelectOptionType<I, CK>, string>` accepts
  `:item-label="g => g.gameName"` in flat and nested mode alike. Only the parameters
  themselves — `CK`, `VK` — reject the bare arrow.
- **Default every accessor type parameter to `undefined`.** A function is not assignable to
  `undefined`, so a failed inference surfaces as TS2322 at the call site on top of the TS7006,
  with `noImplicitAny` on or off. A looser default could absorb the same arrow and let the
  component fall back to whole-item mode in silence.

An accessor prop compiles to one of two runtime shapes, and both are correct. A type parameter
emits `type: null`, so it never casts. A `keyof T | ((item: T) => R)` alias emits
`{ type: Function, skipCheck: true }`, and the `skipCheck` is what stops Vue warning when a
call site passes the string key instead.

Document the limit on the props that are type parameters, rather than letting each call site
rediscover it.

## Checking it

These traps reach neither the browser nor the editor, so measure rather than assume.

1. **Runtime props** — `probe-props.mjs`. Is the narrowing prop `type: Boolean` or
   `type: null`? Did a `default` appear that suppresses the absence cast? The script exits 1
   when the component declares no props, rather than printing the nearest object it can find.
2. **A consumer-side `.vue` probe, checked by vue-tsc** — a page under `app/pages/playground/`
   that binds the component the way a consumer does. `select-types.vue` and `slider-types.vue`
   are the worked examples. Cover all four surfaces. One set of type arguments feeds all of
   them, but each surface derives from those arguments through its own declaration, so a green
   model proves nothing about the other three:
   - **props** — the narrowing prop as a bare attribute, an accessor as a key, and an accessor
     as an annotated arrow;
   - **model** — a correct `v-model` per mode, and a deliberately mismatched one under
     `@vue-expect-error`;
   - **events** — `@change="value = $event"` in each mode, so the emit type narrows too;
   - **slots** — read a narrowed slot prop and call a method only the right type has
     (`value.toUpperCase()`). Slot props do narrow through a generic component, so a wrong
     call there is a real failure.
3. **Unit tests** for the runtime half — see below.

Two caveats on step 2.

**Use the bare attribute.** `:multiple="true"` supplies a real boolean and never exercises
casting, so it passes whether the prop casts or not.

**Confirm each `@vue-expect-error` is live.** Make the binding correct and check that vue-tsc
now reports `Unused '@ts-expect-error' directive` (TS2578 — the message names `@ts-`, not
`@vue-`). A directive over a line nothing checked passes vacuously.

**Put one deliberate mistake on each guarded element.** The directive sits in a comment above
the element and covers every error on it, however many lines the element spans. Two mistakes
on one element make the liveness check meaningless: `<Slider v-model="num" min="0" />` under a
directive stays "used" on the `min` alone, so the model could stop narrowing and nothing would
report it. The directive also belongs above the element, never between its attributes, where
it is a parse error that reports as something else entirely.

One correction worth carrying: `strictTemplates` — split in Vue language tools 3 into
`checkUnknownProps`, `checkUnknownEvents`, `checkUnknownComponents` and
`checkUnknownDirectives` — governs **unknown** names only. A known prop's type is checked
without it. With no `vueCompilerOptions` set at all, `<Slider min="0" />` reports TS2322 while
`<Slider :bogus-prop="1" />` reports nothing. So a probe page proves narrowing on its own, and
it proves nothing about a misspelt prop. Broken tsconfig resolution still produces a green run
that checks nothing, so confirm the probe file sits in the project vue-tsc actually loads.

## Tests worth having

The cases a template type-check cannot reach:

- the narrowing prop **omitted** — the component takes the scalar path, and an untouched model
  stays `undefined` rather than becoming `[]`;
- the narrowing prop as **`''`** — the pre-cast value of a valueless attribute, and the only
  *test* that catches a regression to `type: null`, since step 2 cannot see casting
  (`SelectModes.spec.ts` has one);
- the narrowing prop bound to a **boolean that flips at runtime** — the model shape has to
  follow the new mode, and an existing value has to survive or clear deliberately;
- a model value of the **wrong shape for the mode** — an array arriving in single mode, which
  the types forbid and a parent holding `any` data still delivers;
- each accessor **as a key, as a function, and omitted**, because the three take different
  branches of the conditional;
- a nested accessor whose **children list is empty or missing**.
