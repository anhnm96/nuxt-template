# nuxt-template

## Code comments

Comments explain reasoning or information that the code does not make clear.
Do not narrate the implementation or repeat what the code already says.

Use comments to explain intent, constraints, assumptions, invariants, preconditions,
side effects, or surprising decisions when the code alone does not communicate them.

Short template section labels are an exception; use them as described below.

### Writing style

Write comments and JSDoc in STE-flavored `asd-ste100` style:

- Use active voice.
- Use one idea per sentence.
- Avoid phrasal verbs: "start the job", not "spin up the job".
- Avoid em-dash run-ons. A single em-dash for an aside is this repo's voice and is fine.
  Do not chain three clauses with dashes.
- Use consistent terminology for the same action. If the code says `show`, do not write
  `display` in the comment above it. Do not alternate between `check`, `verify`, and
  `validate`, or between `remove` and `delete`, unless they mean different things.
- When editing comments, preserve uncertainty and qualifications. Do not change "may"
  to "does" unless you have verified the stronger claim. Do not remove a qualification
  merely to shorten a comment.
- Keep domain terminology, identifiers, and API names.

Semicolons are house style in comments and docs. Do not remove them solely for style.

### Scope and placement

Keep a comment as short as the reasoning allows.

Keep local reasoning beside the code. Move extended design rationale to the component's
`DESIGN.md`, and add a short pointer from the code. Keep essential preconditions,
invariants, and warnings beside the code even when `DESIGN.md` explains them in detail.

Add a comment only when it contributes information beyond the code, except for the
template section labels described below. Update or delete comments that are incorrect,
stale, or redundant.

### References in comments

Treat references to files, directories, and ADRs as links that need maintenance.

When moving or renaming a referenced file, directory, or ADR, search the repository
for its old path and identifier. Update affected comments and check that their
references resolve.

### Comments in `<template>`

Keep short section labels such as `<!-- trigger -->` and `<!-- popover -->`.
They help readers locate sections without finding `data-slot` inside a multiline
attribute list.

Use lowercase labels of one or two words. Place each label directly above the element
it names. Move or update the label when the element moves or changes.

Template comments can also explain information that the markup does not express.
For example:

<!-- Name the week column so screen readers do not announce it as an unlabelled column. -->

### JSDoc

Use JSDoc when it adds information that types cannot express, such as intended usage,
constraints, side effects, or non-obvious parameter semantics.

Do not add JSDoc that merely repeats the function signature or TypeScript types.

Add JSDoc to private implementation details only when it provides specific information
that a maintainer needs.

### Mode

Use STE-flavored style by default.

Apply the `asd-ste100` skill's strict mode when a comment or JSDoc states a contract
that callers must follow.
