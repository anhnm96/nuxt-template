import type { InjectionKey } from 'vue'

/** What a `DragItem` reports to the `DragList` it belongs to. */
export interface DragItemEvent {
  itemId: string
  el: HTMLElement
  /**
   * payload of the item. A `DragList` passes a `DragListPayload`, the
   * placeholder item carries nothing. Narrow it with `isDragListPayload`.
   */
  payload: unknown
}

export interface DragListContext {
  id: string
  onItemDragStart: (item: DragItemEvent) => void
  onItemDragEnter: (item: DragItemEvent & { event: DragEvent }) => void
}

/**
 * `DragItem` talks to its closest `DragList` through this context instead of
 * DOM events, so nested lists each get their own notifications.
 */
export const DragListKey: InjectionKey<DragListContext> = Symbol('DragList')

let uid = 0
/**
 * Ids must stay unique per document: a list id also lands on the DOM and the
 * store is shared, while `useId` only guarantees uniqueness inside one app.
 */
export function createDnDId(prefix: 'list' | 'item') {
  uid += 1
  return `dnd-${prefix}-${uid}`
}

let safari: boolean | undefined
/**
 * Safari needs its own path out of `dragleave`, see `dragLeaveTarget`. Read
 * lazily and kept: the check touches `navigator`, which a server render has no
 * business evaluating.
 */
export function isSafari() {
  safari ??= /^(?:(?!chrome|android).)*safari/i.test(navigator.userAgent)
  return safari
}

/**
 * The element a `dragleave` moved to. Safari always reports `relatedTarget` as
 * null, so there the element is looked up by coordinates instead.
 */
export function dragLeaveTarget(e: DragEvent) {
  if (isSafari()) {
    return document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
  }
  return e.relatedTarget as HTMLElement | null
}

/** the `DragList` a node sits in, null when it sits in none */
export function closestDragList(node: Node | null) {
  if (!node) return null
  const element = node.nodeType === 1 ? (node as Element) : node.parentElement
  return (element?.closest('.drag-list') as HTMLElement | null) ?? null
}

/** the nearest ancestor that scrolls `el`, null when none of them does */
export function scrollParentOf(el: HTMLElement) {
  let node = el.parentElement
  while (node) {
    const { overflowY } = getComputedStyle(node)
    if (/^(?:auto|scroll|overlay)$/.test(overflowY)) return node
    node = node.parentElement
  }
  return null
}

/**
 * What each scroller currently owes: how many drags asked it to stop anchoring,
 * and the value to give it back once the last of them is done. Keyed by the
 * element, because several lists can share one scroller and each of them asks
 * on its own — the second to ask would otherwise read `none` as what the
 * scroller had all along, and hand it that back for good.
 */
const anchoringHeld = new WeakMap<
  HTMLElement,
  { holds: number, had: string }
>()

/**
 * Stops the browser from holding its scroll anchor still while a drag is running,
 * and puts the container back the way it was afterwards.
 *
 * A gap appearing or retiring changes how tall the list is. Where the container
 * is scrolled to its end, the browser answers that by scrolling to keep its
 * anchor in place, which slides every row across the cursor — the rows a landing
 * spot is then read from, so the reading changes with no cursor movement behind
 * it. Once a drag is over, anchoring is the container's business again: it is
 * what holds a reader's place when something above them loads in.
 *
 * `overflow-anchor: none` has to sit on the container that scrolls. On the list
 * it only bars the list from being picked as the anchor, which leaves the
 * container free to pick another and scroll for it just the same. A list no
 * element scrolls is scrolled by the viewport, which anchors from the root, so
 * that is where the property goes for one of those.
 *
 * Returns what puts the scroller back, which is safe to call more than once and
 * only lands once the last drag holding that scroller has let go.
 */
export function suspendScrollAnchoring(el: HTMLElement) {
  const scroller = scrollParentOf(el)
    ?? (document.scrollingElement as HTMLElement | null)
  if (!scroller) return () => {}
  const held = anchoringHeld.get(scroller)
    ?? { holds: 0, had: scroller.style.overflowAnchor }
  held.holds += 1
  anchoringHeld.set(scroller, held)
  scroller.style.overflowAnchor = 'none'

  let letGo = false
  return () => {
    // a list is put back by both its own dragend and its unmount, and whichever
    // comes second is not another drag letting go
    if (letGo) return
    letGo = true
    held.holds -= 1
    if (held.holds > 0) return
    scroller.style.overflowAnchor = held.had
    anchoringHeld.delete(scroller)
  }
}
