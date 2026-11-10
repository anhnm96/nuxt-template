import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { NO_DEMO, PLAYGROUND_OVERRIDES, playgroundFor } from './docsComponents'

const components = join(import.meta.dirname, '../components')
const playground = join(import.meta.dirname, '../pages/playground')

/** Every folder under `app/components` that holds a README.md, as the docs collection reads them. */
function readmeFolders(dir = components): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (!entry.isDirectory()) return []
    const path = join(dir, entry.name)
    return [...(existsSync(join(path, 'README.md')) ? [entry.name.toLowerCase()] : []), ...readmeFolders(path)]
  })
}

describe('docs component mapping', () => {
  const folders = readmeFolders()

  it('finds the component folders', () => {
    expect(folders).toContain('select')
  })

  it('gives every component folder a Playground page or a NO_DEMO entry', () => {
    const unmapped = folders.filter((f) => {
      const page = playgroundFor(f)
      return page ? !existsSync(join(playground, `${page}.vue`)) : !NO_DEMO.includes(f)
    })
    expect(unmapped).toEqual([])
  })

  it('has no stale NO_DEMO entry', () => {
    const stale = NO_DEMO.filter(f => !folders.includes(f) || existsSync(join(playground, `${PLAYGROUND_OVERRIDES[f] ?? f}.vue`)))
    expect(stale).toEqual([])
  })

  it('has no override for an unknown folder', () => {
    expect(Object.keys(PLAYGROUND_OVERRIDES).filter(f => !folders.includes(f))).toEqual([])
  })

  it('maps progress to progress-bar', () => {
    expect(playgroundFor('progress')).toBe('progress-bar')
  })

  it('maps context-menu and dropdown to the Menu page, which demos both', () => {
    expect(playgroundFor('context-menu')).toBe('menu')
    expect(playgroundFor('dropdown')).toBe('menu')
  })
})
