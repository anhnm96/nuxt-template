import { scrollParentOf, suspendScrollAnchoring } from './context'
import { createScroller } from './utils'

/** a list inside a scroller, or straight in the body for one nothing scrolls */
function listIn(scroller: HTMLElement | null) {
  const list = document.createElement('div')
  ;(scroller ?? document.body).append(list)
  return list
}

afterEach(() => {
  document.body.innerHTML = ''
  document.documentElement.style.overflowAnchor = ''
})

describe('suspendScrollAnchoring', () => {
  it('stops the scroller anchoring and puts back what it found', () => {
    const scroller = createScroller()
    const list = listIn(scroller)

    const restore = suspendScrollAnchoring(list)
    expect(scroller.style.overflowAnchor).toBe('none')

    restore()
    expect(scroller.style.overflowAnchor).toBe('')
  })

  it('keeps a value the container set for itself', () => {
    const scroller = createScroller()
    const list = listIn(scroller)
    scroller.style.overflowAnchor = 'auto'

    suspendScrollAnchoring(list)()

    expect(scroller.style.overflowAnchor).toBe('auto')
  })

  it('holds the scroller until the last list sharing it lets go', () => {
    const scroller = createScroller()
    const list = listIn(scroller)
    const second = listIn(scroller)

    const restoreFirst = suspendScrollAnchoring(list)
    const restoreSecond = suspendScrollAnchoring(second)

    // whichever drag ends first, the other is still running
    restoreFirst()
    expect(scroller.style.overflowAnchor).toBe('none')

    restoreSecond()
    expect(scroller.style.overflowAnchor).toBe('')
  })

  it('counts one hold however often it is let go', () => {
    const scroller = createScroller()
    const list = listIn(scroller)
    const second = listIn(scroller)

    const restoreFirst = suspendScrollAnchoring(list)
    const restoreSecond = suspendScrollAnchoring(second)
    // a list is put back by its dragend and by its unmount, and the second of
    // those must not release the hold the other list still has
    restoreFirst()
    restoreFirst()

    expect(scroller.style.overflowAnchor).toBe('none')

    restoreSecond()
    expect(scroller.style.overflowAnchor).toBe('')
  })

  it('falls back to the root for a list the viewport scrolls', () => {
    const list = listIn(null)
    expect(scrollParentOf(list)).toBe(null)

    const restore = suspendScrollAnchoring(list)
    expect(document.documentElement.style.overflowAnchor).toBe('none')

    restore()
    expect(document.documentElement.style.overflowAnchor).toBe('')
  })
})
