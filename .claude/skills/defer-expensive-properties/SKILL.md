---
name: defer-expensive-properties
description: Deciding whether a per-item field is computed eagerly, behind a getter, or behind a memoised getter. Covers which consumers read the field, whether repeated reads share the same object, the value semantics each form implies, and when deferring makes code slower. Use when building a list or iteration adapter that maps a source into per-item objects — a composable over DOM nodes, a normaliser over API rows — and different consumers read different fields; when adding a field to such an object; or when a per-item field needs DOM measurement.
---

# Defer Expensive Per-Item Properties

A getter defers work; it does not make the work cheaper. Deferring helps when consumers skip
the field entirely, so the gain is conditional and usually small: it avoids computing an
expensive per-item field for consumers that never read it, and it costs access-time overhead
plus a per-item closure that keeps its source reachable. A plain getter recomputes on every
access; a memoised getter reuses the first result for later accesses on the same object, and
adds state and a lifetime to reason about.

Three forms, none of them a default:

```ts
interface NavigableEntry {
  disabled: boolean
  label: string
}

// `disabled` is eager in all three forms. Every move reads it on every item, so deferring it
// would add a closure and save nothing.

// Eager — the value is computed for every item, for every consumer.
const eager = (el: HTMLElement): NavigableEntry => ({
  disabled: el.getAttribute('aria-disabled') === 'true',
  label: el.textContent?.trim() ?? '',
})

// Deferred — the value is computed on every access.
const deferred = (el: HTMLElement): NavigableEntry => ({
  disabled: el.getAttribute('aria-disabled') === 'true',
  get label() {
    return el.textContent?.trim() ?? ''
  },
})

// Memoised — the value is computed on first access and kept, per object.
const memoised = (el: HTMLElement): NavigableEntry => {
  let memo: string | undefined
  return {
    disabled: el.getAttribute('aria-disabled') === 'true',
    get label() {
      return memo ??= el.textContent?.trim() ?? ''
    },
  }
}
```

All three satisfy `label: string` under TypeScript's structural type system, so the declared
interface stays unchanged — and that is the trap. A getter with no setter makes the field
read-only, so `entry.label = 'x'` throws in strict mode even though the interface declares
the property mutable and the type checker allows the assignment. The type cannot tell a
consumer which of the three forms it holds.

## The form follows the call graph, not the field

The same field wants a different form depending on who reads it and how often. Take a
list-navigation composable — arrow keys to move, typeahead matching against item labels:

| consumer | reads | candidate form |
| --- | --- | --- |
| arrow-key movement | `disabled` only | must not compute `label` at all |
| typeahead, one pass | `label` once per item | plain getter |
| typeahead, two passes over one array | `label` twice per item | memoised getter |
| a caller that rebuilds the array per pass | `label` on fresh objects | memoisation buys nothing |

These are candidates, not prescriptions. A menu that reads its items from the DOM meets the
third row — its typeahead reads the list once, then scans it again on the repeated-letter
cycle — and a plain getter was still the right call, because that second scan runs only when
the first found nothing and the buffer is one repeated character. Choose the value semantics
first, then compare the expected work against the overhead. Read the call graph before
choosing — a property implementation cannot be judged on its own.

## The type is identical; the semantics are not

| form | the value is evaluated | a later change to the source is |
| --- | --- | --- |
| eager field | during construction | not reflected in the stored value |
| plain getter | on every access | reflected, if the expression reads live state |
| memoised getter | on first access | not reflected after that access |

The interface cannot express which of these a field is. Pick the form whose timing the
consumers actually want, then treat performance as the tie-breaker.

## How to decide, without a profiler

1. **Count the items whose field is actually accessed.** Eager computation evaluates the
   field for every constructed item; deferring avoids that work for items discarded before
   access.
   Consider deferring when construction sits on a hot path, or when the value must reflect
   state at access time.
2. **Estimate the work per item.** Reading `textContent` may require collecting text from
   descendant nodes, so its cost can scale with the size of the subtree.
   `getBoundingClientRect` and `offsetWidth` can trigger synchronous layout when layout is
   dirty; they do not force a new layout on every call. Reading a property off
   `getComputedStyle` may require style resolution and, depending on the property and
   browser state, layout. A field read, a `dataset` lookup, a copy or arithmetic is
   generally cheap by comparison. Do not assume an operation is expensive because it
   touches the DOM.
3. **Check repeated reads, and whether they share an object.** A plain getter recomputes on
   every access. Memoisation helps only while the same object instances are reused:
   `scan(build()); scan(build())` gives every item a fresh object with nothing memoised,
   where `const list = build(); scan(list); scan(list)` reuses it. The last two rows of the
   table above are these two cases.
4. **Choose the value semantics.** Use the table above.
5. **Compare the trade-offs.** Prefer the simplest form when the collection is small, the
   path is cold, or the saving is negligible. Profile when the path is performance-critical
   and the trade-off is unclear.

## Memoisation and stale values

A memoised getter keeps the first answer. If the source changes afterwards, the item keeps
reporting the old one:

```ts
const entry = memoised(el)
entry.label // 'Alpha'
el.textContent = 'Beta'
entry.label // 'Alpha' when memoised, 'Beta' from a plain getter
```

That is not automatically wrong. It is wrong when the consumer expects live data. Memoise
only when the value may stay fixed for that item's lifetime. If the source changes,
rebuilding the collection can refresh the values, provided consumers switch to the new
entries; existing references keep their old memoised values. Prefer this simple lifecycle
over inventing an invalidation mechanism when rebuilding is already appropriate.

Because `??=` uses nullishness to detect an unmemoised value, it keeps only results that are
neither `null` nor `undefined` — an empty string memoises correctly, `''` not being nullish.
If either is a legitimate result, use an explicit flag or a sentinel.

## When to skip this optimisation

- Nearly every constructed item has the field read, the computation is not especially
  expensive, and nothing depends on *when* it runs
- A consumer reads it repeatedly and the reads do not share object instances
- The work is a field read, a `dataset` lookup, a copy or arithmetic
- The collection is small, the path is cold, and the expected saving is negligible
- The value must be captured at construction — use eager computation, not a live or
  first-access getter

The deciding factors are the cost of the computation and how often the field is actually
needed, not any particular engine optimisation.

## Relationship to `runtime-cache-property-access`

That rule — `.claude/skills/typescript/references/runtime-cache-property-access.md` — hoists
repeated property access into a local before a hot loop. This one decides what sits behind
the access in the first place. The two operate at different scopes and do not compete:

- **Eager or deferred** — is the value computed at construction, or on first need?
- **Memoised getter** — do repeated accesses to *one item* reuse a result?
- **Local variable** — do repeated reads *inside one block* reuse a value?

Use both only when both reuse patterns exist and the memoised value stays valid — a single
consumer that can read the field once into a local needs no memoisation.
