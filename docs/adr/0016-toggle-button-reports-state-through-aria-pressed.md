---
status: accepted
---

# A Toggle Button keeps its name and reports state through aria-pressed

`ToggleButton` renders a fixed name and carries its state in `aria-pressed`. It never renames
itself to describe what the next press will do.

```html
<ToggleButton v-model="bold" aria-label="Bold" />   <!-- "Bold, toggle button, pressed" -->
```

This records why, because the repo already contains the other pattern, and the two look alike
enough that the next reader will copy whichever they find first.

## Considered options

- **A renaming button** — no `aria-pressed`; the name is the state, so "Mute" becomes
  "Unmute". A reader hears only what pressing will do, which is the whole announcement. This
  is what `SwapButton` does, and it is correct there.
- **A pressed button** — chosen. The name is fixed and the state travels beside it, on
  `aria-pressed`.
- **Both at once** — rejected, and it is the one that gets built by accident. A button that
  renames itself *and* sets `aria-pressed` announces the state twice, and the two disagree by
  construction: at the moment "Unmute" is the name, `aria-pressed` is `false`, so a reader
  hears an unpressed control offering to undo something.

The deciding case is a toolbar. Seven toggles sit in a row in `Tiptap.vue`, and a renaming one
would make every announcement depend on reading the name carefully — "Bold" and "Unbold" differ
by two characters, spoken fast, with no fixed label to anchor them. A fixed name plus a state
is one word of difference in a predictable position.

## What this rules out

`aria-pressed="mixed"` is valid ARIA and is not supported. A partial selection — half of the
text bold — is the state it exists for, and no consumer in this repo can produce it: tiptap's
`isActive` already collapses a mixed selection to `false`. Supporting it would widen the model
to `boolean | 'mixed'` for every consumer, to report a state none of them can reach.

An exclusive row of toggles is also out. `app/components/konva/EditImage.vue` has one — a tool picker where exactly
one is on — and `aria-pressed` on each member is the wrong answer: the set has one value, so it
is a radio group wearing button clothes. That row is tracked separately.

## The state is drawn from the attribute that announces it

The stylesheet selects on `[aria-pressed='true']`. There is no class or `data-` attribute
mirroring it, because a mirror is a thing that can fall out of date, and out of date here means
right on screen and silent to a reader — the exact defect this component exists to remove.

The attribute is rendered from `!!model`, not from the model. The consumer that prompted this
binds `editor?.isActive('bold')`, which is `boolean | undefined`, and Vue drops an attribute
whose value is `null` or `undefined`. Passed through, an unpressed toggle and a toggle with no
state at all would render identically and announce differently.

## SwapButton stays, and its generality is unused

`SwapButton` is the renaming pattern, and moves to `base/swap-button/` so that its folder stops
claiming this component's name. It is written for N states and has exactly one consumer, which
has two. Whether a cycler earns its keep is a separate question; this decision does not answer
it, and deleting it here would have smuggled a behaviour change into a component addition.

## Cost of reversal

Low in one direction, high in the other. Adding a renaming mode later is additive. Removing
`aria-pressed` from a shipped `ToggleButton` is not: every consumer would have to supply a
state-dependent name, and a consumer that forgot would keep rendering a correct-looking button
that reports nothing — which is how all seven tiptap toggles arrived nameless in the first
place.
