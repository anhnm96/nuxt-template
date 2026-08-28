import { effectScope } from 'vue'
import { useDragAutoScroll } from './useDragAutoScroll'

/**
 * happy-dom's `DragEvent` constructor drops the `MouseEvent` coordinates and the
 * related target, so both are put on the event by hand. Browsers carry them.
 */
function dragEvent(
  type: string,
  props: { clientY?: number, relatedTarget?: Node } = {},
) {
  const event = new DragEvent(type, { bubbles: true })
  Object.defineProperties(event, {
    clientY: { value: props.clientY ?? 0 },
    relatedTarget: { value: props.relatedTarget ?? null },
  })
  return event
}

/**
 * happy-dom runs no layout, so the container's geometry is stubbed: a 400px tall
 * box starting at y=100, which puts its edge zones at 100..180 and 420..500, and
 * 2000px of content, which leaves 1600px to scroll. `scrollTop` is stubbed too,
 * it would stay clamped to 0 without a layout.
 */
async function setup({ scrollTop: start = 0 } = {}) {
  const el = document.createElement('div')
  const child = document.createElement('div')
  el.append(child)
  document.body.append(el)
  el.getBoundingClientRect = () =>
    ({ top: 100, bottom: 500, left: 0, right: 300 }) as DOMRect
  /** the scrollable area, which a row on its way to a new slot grows, see below */
  let scrollHeight = 2000
  Object.defineProperties(el, {
    clientHeight: { value: 400 },
    scrollHeight: { get: () => scrollHeight },
  })
  let scrollTop = start
  Object.defineProperty(el, 'scrollTop', {
    get: () => scrollTop,
    set: (value: number) => {
      scrollTop = value
    },
  })

  const scope = effectScope()
  const autoScroll = scope.run(() => useDragAutoScroll(ref(el)))!
  // the listeners are bound by a post-flush watch on the target
  await nextTick()

  const dragover = (clientY: number) =>
    el.dispatchEvent(dragEvent('dragover', { clientY }))
  const dragleaveTo = (relatedTarget: Node) =>
    el.dispatchEvent(dragEvent('dragleave', { relatedTarget }))

  /** a drop preview of `height` px, rendered in the container as a list would */
  const renderPreview = (height: number) => {
    const gap = document.createElement('div')
    gap.className = 'drag-placeholder'
    gap.getBoundingClientRect = () => ({ height }) as DOMRect
    el.append(gap)
    return gap
  }

  /**
   * The row the drag came from, at `top`. The preview's room is only held back
   * around this, see `previewRoom`, so the tests below place it under the cursor
   * or well away from it.
   */
  const renderDraggedRow = (top: number, height = 60) => {
    const row = document.createElement('div')
    row.className = 'drag-container'
    row.dataset.dragging = 'true'
    row.getBoundingClientRect = () =>
      ({ top, bottom: top + height, height }) as DOMRect
    el.append(row)
    return row
  }

  /**
   * A row on its way to a new slot: it carries the move class, and the transform
   * playing it grows the scrollable area by however far it still has to go.
   */
  const startRowMove = (distance: number) => {
    const row = document.createElement('div')
    row.className = 'drag-list--move'
    el.append(row)
    scrollHeight += distance
    return () => {
      row.remove()
      scrollHeight -= distance
    }
  }

  return {
    ...autoScroll,
    el,
    child,
    scope,
    dragover,
    dragleaveTo,
    renderPreview,
    renderDraggedRow,
    startRowMove,
  }
}

/** one animation frame, which is one step of the scroll loop */
const frame = () => new Promise(resolve => requestAnimationFrame(resolve))

afterEach(() => {
  document.body.innerHTML = ''
})

it('scrolls up near the top edge and down near the bottom edge', async () => {
  const { direction, dragover, scope } = await setup()

  dragover(150)
  expect(direction.value).toBe(-1)

  dragover(450)
  expect(direction.value).toBe(1)

  scope.stop()
})

it('does not scroll away from the edges', async () => {
  const { direction, dragover, scope } = await setup()

  dragover(300)
  expect(direction.value).toBe(0)

  // and it gives up the direction it had
  dragover(450)
  dragover(300)
  expect(direction.value).toBe(0)

  scope.stop()
})

it('moves the container while a direction holds', async () => {
  const { el, dragover, scope } = await setup()

  dragover(450)
  await new Promise(resolve => requestAnimationFrame(resolve))
  const down = el.scrollTop
  expect(down).toBeGreaterThan(0)

  // and keeps going, one step per frame
  await new Promise(resolve => requestAnimationFrame(resolve))
  expect(el.scrollTop).toBeGreaterThan(down)

  scope.stop()
})

it('stops at the end of the content instead of past it', async () => {
  const { el, dragover, scope } = await setup({ scrollTop: 1595 })

  dragover(450)
  await new Promise(resolve => requestAnimationFrame(resolve))
  // 2000px of content in a 400px box, so 1600 is the last of it, not 1607
  expect(el.scrollTop).toBe(1600)

  scope.stop()
})

it('leaves the room a drop preview holds to the preview', async () => {
  const { el, dragover, renderPreview, renderDraggedRow, scope } = await setup({
    scrollTop: 1540,
  })
  // the gap grew the content by its own height, and the cursor is at the slot
  // the dragged row holds: scrolling into that room would move the row under the
  // cursor, have the list read the spot the item is already in, and retire the
  // gap the room came with
  renderPreview(60)
  renderDraggedRow(460)

  dragover(450)
  await new Promise(resolve => requestAnimationFrame(resolve))
  expect(el.scrollTop).toBe(1540)

  // and the room the list has is still its own to scroll
  el.scrollTop = 1400
  await new Promise(resolve => requestAnimationFrame(resolve))
  expect(el.scrollTop).toBeGreaterThan(1400)

  scope.stop()
})

it('runs to the end of the list away from the item\'s own slot', async () => {
  const { el, dragover, renderPreview, renderDraggedRow, scope } = await setup({
    scrollTop: 1540,
  })
  // a gap the cursor cannot retire: the item it previews came from the top of a
  // list the drag has long left behind, so its room is room like any other, and
  // holding it back would leave the last row of the list out of reach
  renderPreview(60)
  renderDraggedRow(-800)

  dragover(450)
  await frame()
  expect(el.scrollTop).toBe(1552)

  scope.stop()
})

it('leaves the room a move in flight holds until the move lands', async () => {
  const { el, dragover, renderPreview, renderDraggedRow, startRowMove, scope }
    = await setup({ scrollTop: 1540 })
  const gap = renderPreview(60)
  renderDraggedRow(460)
  dragover(450)
  await frame()
  // the gap holds the room it added, as above
  expect(el.scrollTop).toBe(1540)

  // the landing spot moves to where the item already is, so the gap goes and
  // the rows start back: the room it held is the transform's for another 200ms
  gap.remove()
  const land = startRowMove(60)
  await frame()
  await frame()
  expect(el.scrollTop).toBe(1540)

  // and once the rows are there, the room they left behind is the list's own
  land()
  await frame()
  expect(el.scrollTop).toBeGreaterThan(1540)

  scope.stop()
})

it('keeps what it measured when the cursor leaves the edge and comes back', async () => {
  const { el, dragover, renderPreview, renderDraggedRow, startRowMove, scope }
    = await setup({ scrollTop: 1540 })
  renderPreview(60)
  renderDraggedRow(460)
  // measured with the rows standing still: 60px of it is the preview's
  dragover(450)
  await frame()
  expect(el.scrollTop).toBe(1540)

  // away from the edge and back, which is one drag and not the end of one
  dragover(300)
  const gap = el.querySelector('.drag-placeholder')!
  gap.remove()
  const land = startRowMove(60)
  dragover(450)
  await frame()
  await frame()
  expect(el.scrollTop).toBe(1540)

  land()
  await frame()
  expect(el.scrollTop).toBeGreaterThan(1540)

  scope.stop()
})

it('stops when the drag ends anywhere', async () => {
  const { direction, dragover, scope } = await setup()

  dragover(450)
  document.dispatchEvent(dragEvent('dragend'))

  expect(direction.value).toBe(0)

  scope.stop()
})

it('stops on leaving the container, but not on leaving its content', async () => {
  const { direction, dragover, child, dragleaveTo, scope } = await setup()

  dragover(450)
  // dragleave bubbles from the content too, that is not leaving the container
  dragleaveTo(child)
  expect(direction.value).toBe(1)

  dragleaveTo(document.body)
  expect(direction.value).toBe(0)

  scope.stop()
})

it('stops when its scope is disposed', async () => {
  const { direction, dragover, scope } = await setup()

  dragover(450)
  scope.stop()

  expect(direction.value).toBe(0)
})
