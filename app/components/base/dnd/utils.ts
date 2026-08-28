/**
 * A scroller for the scroll-anchoring specs: happy-dom lays nothing out, but it
 * does compute `overflow-y` from an inline style, which is all `scrollParentOf`
 * and the walk it does ever read. Appended to `document.body`, which both specs
 * clear in their own `afterEach`.
 */
export function createScroller() {
  const scroller = document.createElement('div')
  scroller.style.overflowY = 'auto'
  document.body.append(scroller)
  return scroller
}
