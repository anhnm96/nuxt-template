import type { MaybeRefOrGetter } from 'vue'

/** where the reader is hung, `window.__dnd` */
const AS = '__dnd'
/** the search param that arms it */
const FLAG = 'dnd-record'
/** how many lines to keep before it stops recording */
const LIMIT = 4000

/**
 * One log for every container being watched, in the order things happened, with
 * each line saying which container it came from. Several lists in one page — or
 * in one scroller — are exactly the case worth recording, and a log per instance
 * would have them overwrite each other on the way out.
 */
const shared: string[] = []
let watched = 0

/**
 * Records what a drag does to a scrolling container, for the drags that go wrong
 * in a way no reasoning about the source will settle.
 *
 * A drop preview changes how tall a list is, a row on its way to a new slot is a
 * transform that counts towards the scrollable area, an auto-scroll writes the
 * scroll position, and the browser writes it too — for its own anchoring, or its
 * own drag auto-scroll. Those four move the same pixels, and a report of
 * "everything jumps" says nothing about which of them started it.
 *
 * So this keeps, for one drag: every drag event with the cursor and how far it
 * sits from the container's bottom edge, every frame where the scroll or the
 * layout changed, and — the reading none of the others give — whether a scroll
 * was one this page asked for. It wraps the container's `scrollTop`, so a change
 * with no `set` line beside it is the browser's own doing.
 *
 * Development only, and asleep until the page is asked for it: reading a scroll
 * position is free, but this one wraps `scrollTop` to see who wrote it, and a
 * tool that alters what it measures has no business running in every session.
 * So it wires itself up for `?dnd-record` and does nothing otherwise, which
 * leaves it safe to leave in place at the container it watches. Only the wiring
 * is conditional on that flag and on `import.meta.dev`, not the function itself:
 * a module always keeps its own declarations, this just never runs them.
 *
 * Reproduce the drag, then read it out of the console with `copy(__dnd.dump())`.
 */
export function useDragRecorder(
  target: MaybeRefOrGetter<HTMLElement | null | undefined>,
) {
  const api = {
    log: shared,
    dump: () => shared.join('\n'),
    clear: () => shared.splice(0, shared.length),
  }
  if (!import.meta.dev || import.meta.server) return api
  if (!new URLSearchParams(window.location.search).has(FLAG)) return api

  const started = performance.now()
  const at = () => Math.round(performance.now() - started)
  const label = `#${++watched}`
  const add = (line: string) => {
    if (shared.length < LIMIT) shared.push(`${label} ${line}`)
  }

  let el: HTMLElement | null = null
  let dragging = false
  let frame = 0
  let last = ''
  /**
   * The last scroll position this page asked for, to tell it from the
   * browser's. Seeded from the container's own value as soon as one is known,
   * not left at `NaN`: a comparison against `NaN` is always false, which would
   * blame the browser for the very first line of every capture whether or not
   * anything had scrolled yet.
   */
  let asked = Number.NaN

  const topOf = (node: Element | null | undefined) =>
    node ? Math.round(node.getBoundingClientRect().top) : '-'

  function snapshot() {
    if (!el) return
    const gap = el.querySelector('.drag-placeholder')
    const line = [
      `scroll=${Math.round(el.scrollTop)}`,
      `height=${el.scrollHeight}`,
      gap ? `gap@${topOf(gap)}` : 'gap-',
      el.querySelector('.drag-list--move') ? 'moving' : 'still',
      `dragged@${topOf(el.querySelector('.drag-container[data-dragging]'))}`,
    ].join(' ')
    // a frame that moved nothing has nothing to say
    if (line === last) return
    last = line
    const mine = Math.abs(el.scrollTop - asked) < 1 ? 'page' : 'BROWSER'
    add(`${at()} frame ${line} scrolled-by:${mine}`)
  }

  function tick() {
    snapshot()
    frame = requestAnimationFrame(tick)
  }

  function onDrag(e: DragEvent) {
    if (!el) return
    const row = (e.target as HTMLElement | null)?.closest?.('.drag-container') as
      | HTMLElement
      | null
    const over = row?.classList.contains('drag-placeholder')
      ? 'gap'
      : (row?.dataset.index ?? '-')
    const edge = Math.round(el.getBoundingClientRect().bottom - e.clientY)
    add(`${at()} ${e.type} y=${Math.round(e.clientY)} over=${over} edge=${edge}`)
    snapshot()
  }

  function start() {
    if (!el) return
    dragging = true
    const { top, bottom } = el.getBoundingClientRect()
    add(`--- drag start, container ${Math.round(top)}..${Math.round(bottom)} ---`)
    if (!frame) frame = requestAnimationFrame(tick)
  }

  function end() {
    dragging = false
    add('--- drag end ---')
    if (frame) cancelAnimationFrame(frame)
    frame = 0
  }

  /** own property shadowing the prototype's, `delete` puts the element back */
  function watchScrollWrites(node: HTMLElement) {
    const proto = Object.getOwnPropertyDescriptor(
      Element.prototype,
      'scrollTop',
    )!
    // what the container already held, not a scroll anyone asked for
    asked = proto.get!.call(node) as number
    Object.defineProperty(node, 'scrollTop', {
      configurable: true,
      get: () => proto.get!.call(node),
      set: (value: number) => {
        const from = Math.round(proto.get!.call(node) as number)
        proto.set!.call(node, value)
        asked = proto.get!.call(node) as number
        if (dragging) {
          add(`${at()} set ${from} -> ${Math.round(asked)} (asked ${Math.round(value)})`)
        }
      },
    })
    return () => Reflect.deleteProperty(node, 'scrollTop')
  }

  let release: (() => void) | null = null
  const dragEvents = ['dragenter', 'dragover', 'dragleave', 'drop'] as const

  watchEffect((onCleanup) => {
    const next = toValue(target)
    if (!next) return
    el = next
    release = watchScrollWrites(next)
    for (const type of dragEvents) {
      next.addEventListener(type, onDrag as EventListener, true)
    }
    document.addEventListener('dragstart', start, true)
    document.addEventListener('dragend', end, true)
    ;(window as unknown as Record<string, unknown>)[AS] = api

    console.info(`[dnd recorder] ${label} watching — reproduce the drag, then: copy(${AS}.dump())`)

    onCleanup(() => {
      end()
      release?.()
      release = null
      for (const type of dragEvents) {
        next.removeEventListener(type, onDrag as EventListener, true)
      }
      document.removeEventListener('dragstart', start, true)
      document.removeEventListener('dragend', end, true)
      el = null
    })
  })

  return api
}
