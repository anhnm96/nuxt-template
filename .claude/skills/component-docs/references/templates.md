# Skeletons and how to choose sections

**The order is fixed. Which sections appear is not.** Select and Dropdown produced the same
outer shape and almost none of the same middle, so pick sections from what the component
actually does — but keep the ones you pick in the order below, and keep their headings
spelled as below. A reader who has read one component's README then knows where to look in
the next one, and a reviewer can see a missing section instead of hunting for it.

Before drafting, read **Principles** in `SKILL.md`. They govern the content; this file governs
the shape.

- [README.md](#readmemd)
- [DESIGN.md](#designmd)
- [Choosing sections](#choosing-sections)
- [Tone](#tone)

## README.md

````markdown
# <Name>

One or two sentences: what it is, and the one thing that makes it different from the
obvious alternative. If it is often reached for by mistake, name what to use instead.

<Only if DESIGN.md exists: "This file is how to **use** it. For why it is built this way —
<the two or three things DESIGN covers> — see [DESIGN.md](./DESIGN.md)." A link to a file
that is not there is worse than no link.>

```vue
<!-- the shortest call that does something real, copy-pasteable, no repo imports -->
```

> Any precondition a consumer will otherwise hit: a required host element, a global
> provider, a peer prop. Put it directly under the first example, not at the bottom.

## Parts
<!-- only when the consumer imports more than one component; one line each, what it is
     and the role it carries. Not a file listing: no context.ts, no composables -->

## <Behaviour>
<!-- zero or more. One per thing that needs a worked example or a rule, named after the
     behaviour: Value, Range, Indeterminate, Grouping, Async. The place for anything a
     table cell cannot hold -->

## API
<!-- from extract-api.mjs; fill the description column. Tables in this order: Props,
     Events, Slots, Exposed. For several components, one H3 per component, each with
     the tables it has. A single-component README may use `## Props` and friends as H2
     instead, in the same order -->

## Keyboard
<!-- a table per state if behaviour differs open vs closed -->

## Accessibility
<!-- the roles and the focus model, in the terms a reviewer would check -->

## Styling
<!-- custom properties with their defaults, then the data-slot hooks -->

## Gotchas
<!-- things that will cost someone an hour; include known gaps, stated as what the
     component does not do today -->
````

Two things about that order. **Keyboard and Accessibility come before Styling**, because they
are behaviour and Styling is not. **Gotchas is last**, because it is read after something has
already gone wrong.

## DESIGN.md

Only when the component holds a decision a maintainer would otherwise re-derive wrongly. See
**Where docs live** in `SKILL.md`. No decision, no file.

````markdown
# <Name> — design

Why this component is built the way it is. For how to *use* it — props, slots, keyboard —
see [README.md](./README.md). This link is always safe; the README always exists.

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
| Parts | The consumer imports more than one component |
| Model / Value | It has a `v-model`, especially if the type varies by prop |
| Grouping, filtering, async | It renders a collection |
| Keyboard | It is interactive. A Progress Bar has no Keyboard section and should not |
| Accessibility | Anything interactive. On a static component, decide it has nothing to say rather than skip the question |
| Styling | It publishes custom properties or `data-slot` hooks |
| Gotchas | Anything about it has surprised you. It usually has |
| Consumers list | **DESIGN.md only.** A consumer cannot see the other consumers |
| Migration table | Only when the consumer asked for one. See `SKILL.md` |

Two rules that keep the pair honest:

- **Each fact lives in one file.** README says what `manageKeyboard` does; DESIGN says why the
  opt-out exists. Repeating the reasoning in README guarantees the two will disagree later.
- **A DESIGN section needs a real constraint.** If the reason is "it seemed cleaner", it is not
  a design decision and does not need a section.
- **History goes in DESIGN.md if anywhere, never in README** — and only when it passes
  principle 6: would a reader repeat the mistake without the record? A trap that caught someone
  earns its paragraph. A predecessor that was simply replaced does not; write what is true now
  instead of what it grew out of.

## Tone

Write for someone competent who has not seen this code. Prefer the concrete failure over the
abstraction: "a bare `M` compiles to `type: null`, so `<Select multiple>` arrives as `''`"
beats "be careful with generic boolean props".

Name what does not work. A README that only describes the happy path gets trusted once.
