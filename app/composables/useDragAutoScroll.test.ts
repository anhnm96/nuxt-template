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
 * box starting at y=100, which puts its edge zones at 100..180 and 420..500.
 * `scrollTop` is stubbed too, it would stay clamped to 0 without a layout.
 */
async function setup() {
  const el = document.createElement('div')
  const child = document.createElement('div')
  el.append(child)
  document.body.append(el)
  el.getBoundingClientRect = () =>
    ({ top: 100, bottom: 500, left: 0, right: 300 }) as DOMRect
  let scrollTop = 0
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

  return { ...autoScroll, el, child, scope, dragover, dragleaveTo }
}

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
