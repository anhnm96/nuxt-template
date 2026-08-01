import type { InjectionKey } from 'vue'

/** What a `DragItem` reports to the `DragList` it belongs to. */
export interface DragItemEvent {
  itemId: string
  el: HTMLElement
  /**
   * payload of the item. A `DragList` passes `{ index, slotIndex, value }`,
   * the placeholder item carries nothing.
   */
  payload: any
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
