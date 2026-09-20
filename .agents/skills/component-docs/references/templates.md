# Skeletons and how to choose sections

The skeleton is fixed; the sections inside it are not. Select and Dropdown produced the same
outer shape and almost none of the same middle, so pick sections from what the component
actually does rather than filling in a fixed list.

- [README.md](#readmemd)
- [DESIGN.md](#designmd)
- [Choosing sections](#choosing-sections)
- [Tone](#tone)

## README.md

````markdown
# <Name>

One or two sentences: what it is, and the one thing that makes it different from the
obvious alternative.

This file is how to **use** it. For why it is built this way — <the two or three things
DESIGN covers> — see [DESIGN.md](./DESIGN.md).

```vue
<!-- the shortest call that does something real, copy-pasteable -->
```

> Any precondition a consumer will otherwise hit: a required host element, a global
> provider, a peer prop. Put it directly under the quick start, not at the bottom.

## Props
<!-- from extract-api.mjs; fill the description column -->

## <Model / Open state / Value>
<!-- only if v-model is involved; show the type in each mode -->

## Slots
<!-- from extract-api.mjs -->

## Keyboard
<!-- a table per state if behaviour differs open vs closed -->

## Accessibility
<!-- the roles and the focus model, in the terms a reviewer would check -->

## Styling
<!-- which stylesheet owns what, plus the data-slot hooks -->

## Gotchas
<!-- things that will cost someone an hour; include known gaps -->
````

## DESIGN.md

````markdown
# <Name> — design

Why this component is built the way it is. For how to *use* it — props, slots, keyboard —
see [README.md](./README.md).

<If widely depended on, name the consumers and say that reach is the constraint.>

## <One H2 per decision, titled as the decision>

State the constraint, then what was chosen, then what it costs. A decision nobody can
reconstruct is the only thing worth a section.

## Known limitations

Things that are wrong but deliberately unfixed, with what fixing them would take. This
section earns more trust than any other — it is where a reader learns the doc is honest.

## Out of scope

What this component deliberately does not do, and what to use instead.
````

## Choosing sections

Include a section when the component has the behaviour, not because the template lists it:

| Include | When |
| --- | --- |
| Model / Value | It has a `v-model`, especially if the type varies by prop |
| Grouping, filtering, async | It renders a collection |
| Keyboard | It is interactive — almost always |
| Accessibility | Always. If there is nothing to say, that is a finding, not an omission |
| Migration table | It replaces something with a different API |
| Consumers list | Several things depend on it and a change is not local |
| Positioning / CSS variables | It publishes custom properties for consumers to style with |

Two rules that keep the pair honest:

- **Each fact lives in one file.** README says what `manageKeyboard` does; DESIGN says why the
  opt-out exists. Repeating the reasoning in README guarantees the two will disagree later.
- **A DESIGN section needs a real constraint.** If the reason is "it seemed cleaner", it is not
  a design decision and does not need a section.

## Tone

Write for someone competent who has not seen this code. Prefer the concrete failure over the
abstraction: "a bare `M` compiles to `type: null`, so `<Select multiple>` arrives as `''`"
beats "be careful with generic boolean props".

Name what does not work. A README that only describes the happy path gets trusted once.
