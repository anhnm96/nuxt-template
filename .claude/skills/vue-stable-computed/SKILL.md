---
name: vue-stable-computed
description: Deciding whether a Vue `computed` that returns an object or an array must keep the same object when its content is equal, and which form does that. Covers the test for when a new identity costs real work, where the new identity comes from (often an inline object or array in a consumer's template), and the options in order of cost — primitive computeds, a hoisted constant, the previous-value form `computed(previous => …)`, `shallowRef`. Use when a `computed` returns an object or an array that something expensive depends on; when a prop takes an object or an array (`:options="{ … }"`, `:sizes="[ … ]"`) and a layout, a sort, a filter or a watcher reads it; when a watcher or a child fires although nothing changed; or when reviewing a `computed` for wasted work.
---

# Stable Computed Values in Vue

From Vue 3.4, a `computed` stops an update when its new value is the same as its old value.
Vue compares with `Object.is`. Before 3.4 a `computed` updates its readers on every run, and
nothing in this skill applies. A number, a string or a boolean that did not change is therefore the end of
the update. An object or an array that the getter builds is a new value on every run, so the
update always continues, also when every field is equal.

The code looks the same in both cases, and that is the trap:

```ts
// Equal `a` stops here. Nothing that reads `a` runs again.
const a = computed(() => source.value.a)

// Equal `a` does not stop here. Everything that reads `box` runs again.
const box = computed(() => ({ a: source.value.a }))
```

Measured on Vue 3.5 with a source that changes identity three times and changes `a` one time:
a `computed` that reads the primitive form runs 2 times, and one that reads the object form
runs 4 times.

This skill is a decision guide and not a rule. Most object computeds are correct as they are.

## The test: two conditions, and both must hold

1. **The getter runs again while the content stays equal.** A dependency changed, and the
   fields of the result did not. If the getter only runs when the content really changes, a
   new object is the correct result and there is nothing to keep.
2. **Something expensive depends on the result.** A layout over all rows, a sort, a filter, a
   watcher with a side effect, a style object on many elements. If the only reader is a
   template that shows two fields, the extra render costs less than the comparison code.

If one condition does not hold, do nothing. Comparison code on every computed is the failure
mode of this skill: it adds a second place that must list every field, and a field that is
missing from the comparison is a stale value that no test finds.

## Where the new identity comes from

Look at the inputs before the getter. The cause is often in another file.

| source | why the identity changes |
| --- | --- |
| an object or array literal in a template: `:virtual="{ optionHeight: 48 }"`, `:sizes="[1, 2]"` | The render function builds it on every render of that component. The compiler does not hoist it, also when every value is a constant. |
| a getter that builds its result: `.map()`, `.filter()`, `{ ...defaults, ...props.x }` | Every run returns a new object. |
| a prop that the parent computes with one of the two forms above | The child sees a new prop on every render of the parent. |
| a function that normalises an input: `toHeights(props.virtual)` | It returns a new object for each object input. |

The consumer's template is not under the control of a component. A component that takes an
object prop must therefore expect a new identity on every render of its parent.

## The options, cheapest first

### 1. Return primitives

Split the object into one `computed` for each field. Each one stops by itself.

```ts
const optionHeight = computed(() => toHeights(props.virtual)?.optionHeight)
const groupHeight = computed(() => toHeights(props.virtual)?.groupHeight)
```

Use it when the readers need the fields and not the object. It has no comparison code and
cannot go stale. It does not fit when a function downstream takes the object as one argument,
or when "no object" is a state of its own.

### 2. Hoist the constant

When the object never changes, it does not belong in a template or a getter.

```ts
// in <script setup>, one object for the life of the component
const VIRTUAL = { optionHeight: 48 }
```

This is the fix on the consumer side. A component cannot require it from its consumers, so it
is not a substitute for option 1 or 3 in a shared component.

### 3. The previous-value form

The getter of a `computed` receives the value it returned last time (Vue 3.4 or later). Return
that value when the content is equal.

```ts
const heights = computed<RowHeights | undefined>((previous) => {
  const next = toRowHeights(virtual())
  const isEqual = previous && next
    && previous.optionHeight === next.optionHeight && previous.groupHeight === next.groupHeight
  return isEqual ? previous : next
})
```

Rules for this form:

- **Compare a small, fixed set of fields.** Two or three primitives. The comparison must be
  cheaper than the work it stops.
- **Every field must be in the comparison.** A field that is added to the type and not to the
  comparison keeps its old value. Put the comparison beside the type, or derive it from the
  keys, when the type can grow.
- **No deep comparison of a large structure.** A deep comparison of 10,000 rows on every run
  can cost more than the work downstream. If the structure is large, find the smaller input
  that decides it and stabilise that input.
- **Say why in a comment.** The form looks like needless code to a reader who does not know
  where the new identity comes from.

### 4. `shallowRef` with a manual write

Hold the object in a `shallowRef` and write it only when the content changes, from a watcher
on the primitive inputs. Use it when the write has a moment of its own, for example a snapshot
that must stop while a popup closes. It moves the logic from a getter to a watcher, so it has
flush timing to reason about. Prefer option 3 when the value is a pure function of its inputs.

## Worked example: the heights of a virtual list

`Listbox.vue` takes `virtual: boolean | { optionHeight?, groupHeight? }` from its host and
turns it into heights. `layoutRows` reads the heights and walks every Group; the style of
every rendered Option reads them too.

- Condition 1: a consumer writes `:virtual="{ optionHeight: 48 }"`. The host renders on each
  keystroke of the Query, so `toRowHeights` returns a new object with equal fields on each
  keystroke.
- Condition 2: the layout walks all Groups, and each rendered Option gets a new style object.

Both hold. Option 1 does not fit, because "no heights" means "not a virtual list" and the
engine takes the heights as one argument. Option 2 is the consumer's choice. The component
uses option 3 with two fields.

The same file has `optionStyle`, a `computed` that returns `{ height }`. It is left alone: it
only runs when `heights` changes, so condition 1 does not hold.

## When to do nothing

- The result is read by one template and nothing else.
- The getter runs only when the content changes.
- The work downstream is a few operations, or runs for a few items.
- You did not find the source of the new identity. Find it first; the fix may belong there.

## How to check

Count the runs. A counter in the expensive reader, or a `console.count` during development,
shows whether it runs when nothing changed, and shows that the fix stopped it. Reasoning about
identity is easy to get wrong; a count is not.
