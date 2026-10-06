# nuxt-template

## Code comments

Write comments and JSDoc in STE-flavored `asd-ste100` style:

- Use active voice.
- Use one idea per sentence.
- Avoid phrasal verbs: "start the job", not "spin up the job".
- Avoid em-dash run-ons. A single em-dash for an aside is this repo's voice and is fine. Three
  clauses chained with dashes is not.
- Use one word for one action. If the code says `show`, do not write `display` in the comment
  above it. The same rotation that drifts across docs (`check`/`verify`/`validate`,
  `remove`/`delete`) drifts across comments.
- Keep hedges such as `may`, `could` and `usually` exactly as written. A hedge promoted to a
  fact is a different claim, and a length cap is the most common reason one gets promoted.
- Keep domain terminology, identifiers and API names.

Semicolons are fine. They are house style here, in comments and in docs alike. Do not "fix"
them.

A comment explains intent, constraints, assumptions, invariants, or behaviour that is not
obvious from the code. It does not restate what the code already says. Explain why a
surprising decision exists, and name preconditions and side effects.

Keep a comment as short as the reasoning allows. **When the reasoning needs a paragraph, it
belongs in that component's `DESIGN.md`, with a one-line pointer from the code.** A comment is
not the place for an essay, and anyone changing the file reads `DESIGN.md` anyway.

Do not add a comment unless it says something the code cannot. Delete comments that no longer
earn their place.

### A comment that names something is a link

A comment naming a file, a directory or an ADR outlives the thing it points at, and nothing
checks it. When you move a doc, grep the source for its old path. Moving
`docs/specs/select/design.md` to `select/DESIGN.md` left two comments pointing at a file that
did not exist, and both survived every review of that move.

### Comments in `<template>`

Keep the short section labels (`<!-- trigger -->`, `<!-- popover -->`). They read faster than
finding `data-slot` inside a multi-line attribute list, which is what they are for. Lowercase,
a word or two, directly above the element they name.

One thing follow from where they end up:

- A label that no longer matches the markup under it is worse than no label. Move it when you
  move the element.

A template comment may also carry something the markup cannot express, which is worth more
than a label. `CalendarDayGrid.vue` has a good example: "Named so the week column is not
announced as an unlabelled column."

### Mode

STE-flavored by default. Use `/asd-ste100 strict` when a comment states a contract that
callers must follow.
