import type { MockInstance } from 'vitest'

// eslint-disable-next-line import/no-mutable-exports
export let consoleError: MockInstance<typeof console.error>

beforeEach(() => {
  const originalConsoleError = console.error
  consoleError = vi.spyOn(console, 'error')
  consoleError.mockImplementation(
    (...args: Parameters<typeof console.error>) => {
      originalConsoleError(...args)
      throw new Error(
        'Console error was called. Call consoleError.mockImplementation(() => {}) if this is expected.',
      )
    },
  )
})
