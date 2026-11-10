import { describe, expect, it } from 'vitest'
import { extractToc } from './docsToc'

describe('extractToc', () => {
  it('lists h2 and h3 headings in order and skips h1', () => {
    const body = { type: 'minimark', value: [
      ['h1', { id: 'select' }, 'Select'],
      ['p', {}, 'text'],
      ['h2', { id: 'v-model' }, 'v-model'],
      ['h3', { id: 'types' }, 'Types'],
      ['h2', { id: 'api' }, 'API'],
    ] }
    expect(extractToc(body)).toEqual([
      { id: 'v-model', text: 'v-model', depth: 2 },
      { id: 'types', text: 'Types', depth: 3 },
      { id: 'api', text: 'API', depth: 2 },
    ])
  })

  it('reads the text of headings that contain code or links', () => {
    const body = { value: [['h2', { id: 'period' }, ['code', {}, 'period'], ' prop']] }
    expect(extractToc(body)).toEqual([{ id: 'period', text: 'period prop', depth: 2 }])
  })

  it('skips a heading without an id', () => {
    expect(extractToc({ value: [['h2', {}, 'No id']] })).toEqual([])
  })

  it('returns an empty list for a missing body', () => {
    expect(extractToc(null)).toEqual([])
    expect(extractToc({})).toEqual([])
  })
})
