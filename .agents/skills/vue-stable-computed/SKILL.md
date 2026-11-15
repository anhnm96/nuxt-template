---
name: vue-stable-computed
description: Decide whether to preserve the identity of an object or array returned by a Vue `computed`. Use when its identity triggers expensive downstream work, a child receives fresh object or array props on parent renders, or watchers and child effects run despite unchanged fields. Covers primitive computeds, hoisted constants, the previous-value form `computed(previous => …)`, and `shallowRef` with a manual write.
---

# Stable Computed Values in Vue

A computed getter runs again when a dependency changes. From Vue 3.4, Vue compares the new
result with the previous value using `Object.is`, and does not notify readers when the two are
equal. An object or array created by the getter has a new identity, so it compares unequal
even when all its fields are equal.

The getter runs in both cases. The difference is whether Vue notifies its readers:

```ts
// The getter can rerun, but Vue can skip downstream effects when the value is equal.
const a = computed(() => source.value.a)

// Each run creates a new identity, so downstream effects can run.
const box = computed(() => ({ a: source.value.a }))
```

This is a decision guide, not a rule. Most object computeds are correct as they are.

## The test: both conditions must hold

1. **A dependency changes while the result's content stays equal.** The getter runs again
   and creates a new identity for equivalent content. If the result only changes when its
   content changes, there is no identity to stabilize.
2. **The new identity triggers meaningful downstream work.** Examples include layout over
   many rows, sorting, filtering, a watcher with side effects, or style updates on many
   elements. A small template render does not justify the added code. Measure this
   condition, do not estimate it; see [How to check](#how-to-check).

If either condition does not hold, leave the computed alone. Equality checks add a second
place that must list every field. A field missing from that check can leave readers with stale
data.

## Find the source of the new identity

Inspect the inputs before the getter. The cause may be in a parent component or another file.

| source | why the identity changes |
| --- | --- |
| an inline object or array binding, such as `:virtual="{ optionHeight: 48 }"` or `:sizes="[1, 2]"` | When the parent renders, its render function creates a fresh object or array for the binding. |
| a getter that builds a result with `.map()`, `.filter()`, or `{ ...defaults, ...props.x }` | Each getter run creates a fresh object or array. |
| a parent prop computed with either form above | When the parent reruns that expression, the child receives a new identity. |
| a function that the getter calls, such as `toRowHeights(props.virtual)` in another file | It can create a new object on each call, and the getter does not show that. |

A component cannot require consumers to preserve prop identity. Account for callers that
create a fresh object or array when the parent renders.

## Options, in order of cost

### 1. Return primitives

Use one computed per field when readers need the fields rather than the object. Each computed
can stop downstream work when its primitive value stays equal.

```ts
const heights = computed(() => toRowHeights(props.virtual))
const optionHeight = computed(() => heights.value?.optionHeight)
const groupHeight = computed(() => heights.value?.groupHeight)
```

This avoids field comparisons and cannot become stale because a field was omitted from a
comparison. It does not fit when downstream code requires one object argument. Compute
shared normalization once if it is expensive.

For a `watch`, a getter source on the field does the same without a new computed:
`watch(() => heights.value?.optionHeight, …)`.

### 2. Hoist the constant

If an object never changes, define it outside the template or getter.

```ts
const VIRTUAL = { optionHeight: 48 }
```

In `<script setup>`, this object has one identity for the component instance. Hoisting fixes
the consumer's binding. A shared component cannot require its consumers to hoist values, so
this does not replace options 1 or 3 inside that component.

### 3. Return the previous value when content is equal

In Vue 3.4 and later, the computed getter receives the value it returned previously. Return
that value when every relevant field is equal:

```ts
const heights = computed<RowHeights | undefined>((previous) => {
  const next = toRowHeights(virtual())
  const isEqual = previous && next
    && previous.optionHeight === next.optionHeight
    && previous.groupHeight === next.groupHeight

  return isEqual ? previous : next
})
```

- Compare a small, fixed set of primitive fields. The comparison must cost less than the
  downstream work it prevents.
- Include every field that affects the result's meaning. Keep the comparison near the type,
  or derive it from the keys when the type can grow.
- Avoid deep comparison of large structures. Find and stabilize a smaller input that decides
  the downstream result.
- Explain why the computed returns its previous value. The comparison can otherwise look
  unnecessary.

### 4. Use `shallowRef` with a manual write

Store the object in a `shallowRef` and write a new value only when its content changes. A
watcher on primitive inputs can perform the write. Use this when the write has its own timing,
such as a snapshot that must stop updating while a popup closes. This moves the logic from a
getter to a watcher, so account for watcher flush timing. Prefer option 3 when the value is a
pure function of its inputs.

## Worked example: row heights in a virtual list

The component accepts a `virtual` prop that is either a boolean or an object with optional
row and group heights. It normalizes the prop into a height object. A layout function reads
those heights while arranging every group. Each rendered row also reads them to set its style.

- A consumer binds `:virtual="{ optionHeight: 48 }"`. Each render of the parent creates a
  fresh object. The normalizer then returns a new object with equal fields.
- The new identity runs the layout again across all groups and updates the style of the
  rendered rows.

Both conditions appear to hold. Returning primitives does not fit because the layout
function takes the heights as one argument. The consumer may hoist the constant, but a
reusable component cannot require it. Option 3 is the candidate.

The measurement gave a different result (10,000 options in 100 groups, Chromium):

- Arrow keys and typing in the component's own search field did not render the parent, so
  the getter did not run again. Only a change of the model did.
- 30 changes of the model caused 30 layout runs without option 3, and 0 with it. The 30 runs
  took 0.3–0.4 ms in total. The time from the key to the next frame was equal in both variants.

The count showed a problem; the time did not. Condition 2 failed at this size. The comparison
has two fields and a comment, so it can stay, but a plain computed is also correct here. Do
not add option 3 on the count alone.

Leave a computed that returns a row style such as `{ height }` alone if its dependency changes
only when the height changes. In that case, the first condition does not hold.

## How to check

Count getter evaluations and downstream effect runs to find which interactions create a new
identity. Then measure the time of the downstream work for one trigger, and compare it with
one frame (about 16 ms). A high count of cheap runs is not a problem.

After stabilizing the value, verify that
effects still run when relevant content changes and stay quiet when only identity changes.
