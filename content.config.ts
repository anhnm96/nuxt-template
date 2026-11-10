import { resolve } from 'node:path'
import { defineCollection, defineContentConfig } from '@nuxt/content'

// The docs read README.md and DESIGN.md where they sit, next to the component.
// `cwd` points outside `content/`, so nothing is copied.
const repoRoot = import.meta.dirname
const componentsDir = resolve(repoRoot, 'app/components')

export default defineContentConfig({
  collections: {
    componentReadme: defineCollection({
      type: 'page',
      source: { cwd: componentsDir, include: '**/README.md' },
    }),
    componentDesign: defineCollection({
      type: 'page',
      source: { cwd: componentsDir, include: '**/DESIGN.md' },
    }),
    // Both are cited by every README and DESIGN file, so they are part of the Docs Site.
    // `cwd` is the repo root, and Content watches that whole folder minus `exclude`. Without it
    // the watcher walks `node_modules`, `.output` and `.git`, and `pnpm dev` stalls for minutes.
    glossary: defineCollection({
      type: 'page',
      source: { cwd: repoRoot, include: 'CONTEXT.md', exclude: ['*/**'] },
    }),
    // Composables and directives have no README, so these pages are written by hand.
    composable: defineCollection({
      type: 'page',
      source: { cwd: resolve(repoRoot, 'content/docs/composables'), include: '*.md' },
    }),
    directive: defineCollection({
      type: 'page',
      source: { cwd: resolve(repoRoot, 'content/docs/directives'), include: '*.md' },
    }),
    adr: defineCollection({
      type: 'page',
      source: { cwd: resolve(repoRoot, 'docs/adr'), include: '*.md' },
    }),
  },
})
