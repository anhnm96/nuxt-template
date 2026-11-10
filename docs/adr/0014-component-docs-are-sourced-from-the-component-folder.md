---
status: accepted
---

# Component docs are sourced from the README.md and DESIGN.md next to the component

The Docs Site reads each component's `README.md` and `DESIGN.md` where they already sit, through a
Content collection whose `source` points at `app/components/**`. Nothing is copied or symlinked
into `content/`. A copy would drift from the code the file describes, and an agent editing a
component would no longer find its docs beside it. The cost is that the Content collection must
reach outside `content/`, and that relative links in those files (`./DESIGN.md`, `CONTEXT.md`,
`docs/adr/*`) are rewritten when the Docs Site renders the page.
