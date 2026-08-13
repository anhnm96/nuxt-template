/** A mounted `DragList`, registered under its own id. */
export interface DnDListMeta {
  id: string
  /** only lists and items sharing a group interact with each other */
  group?: string
}

/**
 * A payload as a drop target sees it: whoever starts a drag names the dragged
 * thing `value`, and the position is only there when a `DragList` started the
 * drag. `T` is what the reader expects, never what the store proved.
 */
export interface DraggingPayload<T = unknown> {
  value: T
  /** position in the source list */
  index?: number
}

/** What a `DragList` puts on its items: it always knows where each one sits. */
export interface DragListPayload<T = unknown> {
  value: T
  index: number
}

/**
 * True when the payload comes from a `DragList`, so it knows its position too.
 * Checks the envelope only, never the type of `value`: `T` is asserted by the
 * caller, not proven here.
 */
export function isDragListPayload<T = unknown>(
  payload: unknown,
): payload is DragListPayload<T> {
  return (
    typeof payload === 'object'
    && payload !== null
    && 'value' in payload
    && typeof (payload as DragListPayload).index === 'number'
  )
}

/**
 * State of a single drag. The browser runs one native drag at a time, so there
 * is one session, but every participant is identified by its own id.
 */
export interface DnDSession {
  /** id of the `DragItem` being dragged */
  itemId: string
  /** id of the `DragList` the item comes from, empty for a standalone `DragItem` */
  sourceListId: string
  group?: string
  /**
   * `payload` prop of the dragging item, a `DragListPayload` when it comes from
   * a `DragList`. Unknown on purpose: one store serves every list of the app,
   * so no single type fits. Narrow it with `isDragListPayload`, or read
   * `draggingPayload` to take the usual shape for granted.
   */
  payload: unknown
  /** root element of the dragging `DragItem` */
  el: HTMLElement | null
  /** false once the native `dragend` fired */
  inProgress: boolean
  /** the item was released on a target that accepted it */
  success: boolean
  /** ids of every `DragList`/`DragItem` that took the item over */
  dropTargetIds: string[]
}

/** what a drag needs to start, the rest of the session is bookkeeping */
export type DnDSessionInit = Omit<
  DnDSession,
  'inProgress' | 'success' | 'dropTargetIds'
>

export const useDnDStore = defineStore('dnd', () => {
  /** every mounted DragList, keyed by its id */
  const lists = ref(new Map<string, DnDListMeta>())
  /**
   * Current drag session, or the last one until a new drag starts.
   * `endDrag` only flips `inProgress` so that the `dragend` handlers of the
   * source item and of the lists above it can still read the drop result.
   */
  const session = ref<DnDSession | null>(null)

  const isDragging = computed(() => session.value?.inProgress === true)
  /**
   * Payload of the dragging item, null while no drag runs. Typed as every reader
   * has to treat it anyway: `value` is the dragged thing, the position is only
   * there when a `DragList` started the drag. The claim is the caller's, see
   * `session.payload` for the raw thing and `isDragListPayload` to prove it.
   */
  const draggingPayload = computed<DraggingPayload | null>(() =>
    isDragging.value ? (session.value!.payload as DraggingPayload) : null,
  )
  const draggingEl = computed(() => (isDragging.value ? session.value!.el : null))
  const draggingGroup = computed(() => (isDragging.value ? session.value!.group : undefined))
  const listIds = computed(() => [...lists.value.keys()])

  function registerList(meta: DnDListMeta) {
    lists.value.set(meta.id, { ...meta })
  }

  function unregisterList(id: string) {
    lists.value.delete(id)
  }

  function getList(id?: string | null) {
    return id ? lists.value.get(id) : undefined
  }

  function getGroupLists(group?: string) {
    return [...lists.value.values()].filter(list => list.group === group)
  }

  /** true while the dragging item may interact with `group` */
  function isGroupActive(group?: string) {
    return isDragging.value && session.value!.group === group
  }

  /** true while the dragging item comes from the list `listId` */
  function isDraggingFrom(listId: string) {
    return isDragging.value && session.value!.sourceListId === listId
  }

  function startDrag(init: DnDSessionInit) {
    session.value = {
      ...init,
      inProgress: true,
      success: false,
      dropTargetIds: [],
    }
  }

  /** records that `targetId` took the dragging item over, without ending the drag */
  function addDropTarget(targetId: string) {
    const ids = session.value?.dropTargetIds
    if (ids && !ids.includes(targetId)) ids.push(targetId)
  }

  /** the drop was accepted and handled by `targetId` */
  function markDropped(targetId: string) {
    if (!session.value) return
    session.value.success = true
    addDropTarget(targetId)
  }

  /** the item was released on a position no target took over */
  function markDropFailed() {
    if (session.value) session.value.success = false
  }

  function hasDropTarget(targetId: string) {
    return session.value?.dropTargetIds.includes(targetId) === true
  }

  /** the item was dropped successfully, but not into `targetId` */
  function droppedOutside(targetId: string) {
    return session.value?.success === true && !hasDropTarget(targetId)
  }

  /** ends the drag, keeping the result readable for `dragend` handlers */
  function endDrag() {
    if (!session.value) return
    session.value.inProgress = false
    session.value.el = null
    session.value.payload = null
  }

  return {
    lists,
    listIds,
    session,
    isDragging,
    draggingPayload,
    draggingEl,
    draggingGroup,
    registerList,
    unregisterList,
    getList,
    getGroupLists,
    isGroupActive,
    isDraggingFrom,
    startDrag,
    addDropTarget,
    markDropped,
    markDropFailed,
    hasDropTarget,
    droppedOutside,
    endDrag,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useDnDStore, import.meta.hot))
}
