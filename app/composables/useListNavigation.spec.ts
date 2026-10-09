import type { NavigableEntry } from './useListNavigation'
import { useListNavigation } from './useListNavigation'

/**
 * `Menu` is the only consumer today and it always passes `loop: true`, so the clamping half
 * of this composable has no coverage through a component. `useSelect` is the caller that
 * will want it (see ADR-0009), and it clamps.
 */
function harness(labels: string[], options: { loop?: boolean, disabled?: number[], from?: number } = {}) {
  const disabled = new Set(options.disabled ?? [])
  const entries: NavigableEntry[] = labels.map((label, i) => ({ label, disabled: disabled.has(i) }))
  let cursor = options.from ?? 0
  const nav = useListNavigation({
    entries: () => entries,
    index: () => cursor,
    onMove: (i) => {
      cursor = i
    },
    loop: options.loop ?? false,
  })
  return {
    nav,
    press: (key: string) => nav.handleKeydown(new KeyboardEvent('keydown', { key })),
    at: () => labels[cursor],
  }
}

describe('useListNavigation — clamping (the Select half)', () => {
  it('does not wrap forward past the last entry', () => {
    const h = harness(['a', 'b', 'c'], { from: 2 })
    h.press('ArrowDown')
    expect(h.at()).toBe('c')
  })

  it('does not wrap backward past the first entry', () => {
    const h = harness(['a', 'b', 'c'], { from: 0 })
    h.press('ArrowUp')
    expect(h.at()).toBe('a')
  })

  it('settles on the last enabled entry when the tail is disabled', () => {
    // The two-pass scan: nothing enabled ahead, so it looks back rather than giving up.
    const h = harness(['a', 'b', 'c', 'd'], { from: 0, disabled: [2, 3] })
    h.press('End')
    expect(h.at()).toBe('b')
  })

  it('reports no entry when every one is disabled', () => {
    const h = harness(['a', 'b'], { from: 0, disabled: [0, 1] })
    h.press('ArrowDown')
    // Nothing enabled to move to, so the cursor is left where it was.
    expect(h.at()).toBe('a')
  })
})

describe('useListNavigation — wrapping (the Menu half)', () => {
  it('wraps forward past the last entry', () => {
    const h = harness(['a', 'b', 'c'], { from: 2, loop: true })
    h.press('ArrowDown')
    expect(h.at()).toBe('a')
  })

  it('wraps over a disabled entry it lands on', () => {
    const h = harness(['a', 'b', 'c'], { from: 2, loop: true, disabled: [0] })
    h.press('ArrowDown')
    expect(h.at()).toBe('b')
  })

  it('clamps the page keys even while looping', () => {
    // Home, End and the page keys name an absolute place rather than a step, so they do
    // not come round — a PageDown in a 3-item menu means "the end", not "two past it".
    const h = harness(['a', 'b', 'c'], { from: 0, loop: true })
    h.press('PageDown')
    expect(h.at()).toBe('c')
  })
})

describe('useListNavigation — typeahead', () => {
  it('jumps to the next matching label', () => {
    const h = harness(['Copy', 'Paste', 'Duplicate'], { from: 0 })
    h.press('d')
    expect(h.at()).toBe('Duplicate')
  })

  it('wraps even when the arrows clamp', () => {
    // Typeahead is a jump, not a step, so it comes round in both widgets.
    const h = harness(['Copy', 'Paste', 'Duplicate'], { from: 2, loop: false })
    h.press('c')
    expect(h.at()).toBe('Copy')
  })

  it('cycles same-letter rows when the character repeats', () => {
    // Searching the buffer as typed would look for "cc" from the second keystroke on,
    // match nothing, and leave the cursor stuck. APG's menu pattern requires the cycle.
    const h = harness(['Copy', 'Cut', 'Clear'], { from: 0 })
    h.press('c')
    expect(h.at()).toBe('Cut')
    h.press('c')
    expect(h.at()).toBe('Clear')
    h.press('c')
    expect(h.at()).toBe('Copy')
  })

  it('still matches a real multi-character prefix', () => {
    const h = harness(['Delete', 'Copy', 'Clear'], { from: 0 })
    h.press('c')
    expect(h.at()).toBe('Copy')
    h.press('l')
    expect(h.at()).toBe('Clear')
  })

  it('builds a buffer across keystrokes', () => {
    const h = harness(['Paste', 'Print', 'Preview'], { from: 0 })
    h.press('p')
    h.press('r')
    h.press('e')
    expect(h.at()).toBe('Preview')
  })

  it('skips disabled entries', () => {
    const h = harness(['Copy', 'Delete', 'Duplicate'], { from: 0, disabled: [1] })
    h.press('d')
    expect(h.at()).toBe('Duplicate')
  })

  it('does not treat Space as a typeahead character', () => {
    // Space activates the row in every consumer, so the composable must leave it alone.
    const h = harness(['a', 'b'], { from: 0 })
    expect(h.press(' ')).toBe(false)
    expect(h.at()).toBe('a')
  })

  it('can be switched off', () => {
    const entries: NavigableEntry[] = [{ label: 'a', disabled: false }]
    let cursor = 0
    const nav = useListNavigation({
      entries: () => entries,
      index: () => cursor,
      onMove: (i) => {
        cursor = i
      },
      typeahead: false,
    })
    expect(nav.handleKeydown(new KeyboardEvent('keydown', { key: 'a' }))).toBe(false)
  })
})

describe('useListNavigation — what it refuses', () => {
  it('leaves Enter, Space, Escape and Tab to the host', () => {
    const h = harness(['a', 'b'], { from: 0 })
    for (const key of ['Enter', ' ', 'Escape', 'Tab']) {
      expect(h.press(key)).toBe(false)
    }
  })

  it('claims the keys it handles', () => {
    const h = harness(['a', 'b'], { from: 0 })
    for (const key of ['ArrowDown', 'ArrowUp', 'Home', 'End', 'PageDown', 'PageUp']) {
      expect(h.press(key)).toBe(true)
    }
  })

  it('enters at the first enabled entry when the cursor is nowhere', () => {
    const h = harness(['a', 'b', 'c'], { from: -1, disabled: [0] })
    h.press('ArrowDown')
    expect(h.at()).toBe('b')
  })

  it('enters at the last enabled entry when arrowing up from nowhere', () => {
    const h = harness(['a', 'b', 'c'], { from: -1, disabled: [2] })
    h.press('ArrowUp')
    expect(h.at()).toBe('b')
  })
})
