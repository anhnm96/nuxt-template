import { getCursorRect, useCursorAnchor } from './useCursorAnchor'

// a 100x40 trigger sitting at (200, 100)
const ANCHOR = { left: 200, top: 100, right: 300, bottom: 140 }

function mouseEvent(type: string, x: number, y: number) {
  return new MouseEvent(type, { clientX: x, clientY: y, bubbles: true })
}

function anchorRef(el: HTMLElement | null = null) {
  const anchor = shallowRef(el)
  return anchor
}

function stubbedAnchor(rect = ANCHOR) {
  const el = document.createElement('div')
  el.getBoundingClientRect = () => rect as DOMRect
  return el
}

describe('getCursorRect', () => {
  it('collapses to a point at the cursor when following both axes', () => {
    expect(getCursorRect({ x: 250, y: 120 }, true, ANCHOR)).toMatchObject({
      left: 250,
      right: 250,
      top: 120,
      bottom: 120,
      width: 0,
      height: 0,
    })
  })

  it('keeps the anchor\'s vertical edges when only x tracks', () => {
    const rect = getCursorRect({ x: 250, y: 120 }, 'x', ANCHOR)

    // a zero-width point at the cursor's x, spanning the anchor's height —
    // this is what pins the tooltip to the anchor's top/bottom edge
    expect(rect).toMatchObject({ left: 250, right: 250, width: 0 })
    expect(rect).toMatchObject({ top: 100, bottom: 140, height: 40 })
  })

  it('keeps the anchor\'s horizontal edges when only y tracks', () => {
    const rect = getCursorRect({ x: 250, y: 120 }, 'y', ANCHOR)

    expect(rect).toMatchObject({ top: 120, bottom: 120, height: 0 })
    expect(rect).toMatchObject({ left: 200, right: 300, width: 100 })
  })

  it('clamps the tracked axis to the anchor bounds', () => {
    expect(getCursorRect({ x: 40, y: 120 }, 'x', ANCHOR)).toMatchObject({ left: 200, right: 200 })
    expect(getCursorRect({ x: 999, y: 120 }, 'x', ANCHOR)).toMatchObject({ left: 300, right: 300 })
    expect(getCursorRect({ x: 250, y: 0 }, 'y', ANCHOR)).toMatchObject({ top: 100, bottom: 100 })
    expect(getCursorRect({ x: 250, y: 999 }, 'y', ANCHOR)).toMatchObject({ top: 140, bottom: 140 })
  })

  it('falls back to a bare cursor point when there is no anchor rect', () => {
    expect(getCursorRect({ x: 250, y: 120 }, 'x', null)).toMatchObject({
      left: 250,
      right: 250,
      top: 120,
      bottom: 120,
      width: 0,
      height: 0,
    })
  })

  it('measures the anchor itself when no axis tracks', () => {
    expect(getCursorRect({ x: 250, y: 120 }, false, ANCHOR)).toMatchObject({
      left: 200,
      right: 300,
      top: 100,
      bottom: 140,
      width: 100,
      height: 40,
    })
  })

  it('is not fooled by an anchor rect when following both axes', () => {
    const rect = getCursorRect({ x: 250, y: 120 }, true, ANCHOR)
    expect(rect.height).toBe(0)
  })
})

describe('useCursorAnchor', () => {
  function setup(follow: boolean | 'x' | 'y' = 'x') {
    const el = stubbedAnchor()
    const anchor = anchorRef(el)
    const scope = effectScope()
    const cursorAnchor = scope.run(() => useCursorAnchor(anchor, () => follow))!

    return { el, anchor, scope, ...cursorAnchor }
  }

  it('seeds the position from the event that started tracking', () => {
    const { track, cursorEl, hasCursor } = setup()

    expect(track(mouseEvent('mouseenter', 250, 120))).toBe(true)
    expect(hasCursor.value).toBe(true)
    expect(cursorEl.getBoundingClientRect()).toMatchObject({ left: 250, right: 250 })
  })

  it('reports no coordinates for a pointer-less open', () => {
    const { track, hasCursor } = setup()

    // a focus event carries no clientX — the caller falls back to anchoring
    expect(track(new FocusEvent('focus') as unknown as MouseEvent)).toBe(false)
    expect(track()).toBe(false)
    expect(hasCursor.value).toBe(false)
  })

  it('follows subsequent moves over the anchor', () => {
    const { el, track, cursorEl } = setup()
    track(mouseEvent('mouseenter', 250, 120))

    el.dispatchEvent(mouseEvent('mousemove', 280, 130))

    expect(cursorEl.getBoundingClientRect()).toMatchObject({ left: 280 })
  })

  it('notifies once per frame however many moves arrive', async () => {
    const { el, track, moves } = setup()
    track(mouseEvent('mouseenter', 250, 120))

    el.dispatchEvent(mouseEvent('mousemove', 260, 120))
    el.dispatchEvent(mouseEvent('mousemove', 270, 120))
    el.dispatchEvent(mouseEvent('mousemove', 280, 120))
    expect(moves.value).toBe(0)

    await new Promise(resolve => requestAnimationFrame(resolve))
    expect(moves.value).toBe(1)
  })

  it('does not notify after being untracked mid-frame', async () => {
    const { el, track, untrack, moves } = setup()
    track(mouseEvent('mouseenter', 250, 120))

    el.dispatchEvent(mouseEvent('mousemove', 260, 120))
    untrack()

    await new Promise(resolve => requestAnimationFrame(resolve))
    expect(moves.value).toBe(0)
  })

  it('stops following once untracked', () => {
    const { el, track, untrack, cursorEl } = setup()
    track(mouseEvent('mouseenter', 250, 120))
    untrack()

    el.dispatchEvent(mouseEvent('mousemove', 280, 130))

    expect(cursorEl.getBoundingClientRect()).toMatchObject({ left: 250 })
  })

  it('unsubscribes from the previous anchor when the target changes', () => {
    const { el, anchor, track, cursorEl } = setup()
    track(mouseEvent('mouseenter', 250, 120))

    const next = stubbedAnchor({ left: 0, top: 0, right: 500, bottom: 40 })
    anchor.value = next
    track()

    // the old element must no longer feed the cursor
    el.dispatchEvent(mouseEvent('mousemove', 290, 130))
    expect(cursorEl.getBoundingClientRect()).toMatchObject({ left: 250 })

    next.dispatchEvent(mouseEvent('mousemove', 120, 20))
    expect(cursorEl.getBoundingClientRect()).toMatchObject({ left: 120 })
  })

  it('unsubscribes when its scope is disposed', () => {
    const { el, track, scope, cursorEl } = setup()
    track(mouseEvent('mouseenter', 250, 120))

    scope.stop()

    el.dispatchEvent(mouseEvent('mousemove', 280, 130))
    expect(cursorEl.getBoundingClientRect()).toMatchObject({ left: 250 })
  })

  it('measures against the live anchor rect', () => {
    const { anchor, track, cursorEl } = setup('x')
    track(mouseEvent('mouseenter', 250, 120))

    // the trigger scrolls away — the locked axis must follow it
    anchor.value = stubbedAnchor({ left: 200, top: 300, right: 300, bottom: 340 })

    expect(cursorEl.getBoundingClientRect()).toMatchObject({ top: 300, bottom: 340 })
  })
})
