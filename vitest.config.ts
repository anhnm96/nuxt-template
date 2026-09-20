import { fileURLToPath } from 'node:url'
import { defineVitestConfig } from '@nuxt/test-utils/config'
import { configDefaults } from 'vitest/config'

export default defineVitestConfig({
  test: {
    globals: true,
    environment: 'nuxt',
    restoreMocks: true,
    // Playwright e2e specs are run by Playwright, not Vitest. `.claude/worktrees` holds
    // sibling checkouts of this repo at other commits — their specs are not ours to run,
    // and they fail against whatever the current tree has renamed.
    exclude: [...configDefaults.exclude, '**/tests/playwright/**', '**/.claude/**'],
    // Absolute path: the Nuxt vitest env sets root to `app/` (srcDir), so a
    // relative `./tests/...` would resolve against the wrong directory.
    setupFiles: [fileURLToPath(new URL('./tests/setup-vitest.ts', import.meta.url))],
    environmentOptions: {
      nuxt: {
        domEnvironment: 'happy-dom',
        overrides: {
          msw: {
            testUtils: true,
          },
        },
      },
    },
  },
})
