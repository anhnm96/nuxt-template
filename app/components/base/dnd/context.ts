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
