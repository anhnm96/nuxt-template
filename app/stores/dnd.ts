/** A mounted `DragList`, registered under its own id. */
export interface DnDListMeta {
  id: string
  /** only lists and items sharing a group interact with each other */
  group?: string
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
  /** `payload` prop of the dragging item. `{ index, slotIndex, value }` when it comes from a `DragList` */
  payload: any
  /** root element of the dragging `DragItem` */
  el: HTMLElement | null
  /** false once the native `dragend` fired */
  inProgress: boolean
  /** the item was released on a target that accepted it */
  success: boolean
  /** ids of every `DragList`/`DragItem` that took the item over */
  dropTargetIds: string[]
}

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
  const draggingPayload = computed(() => (isDragging.value ? session.value!.payload : null))
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

  function startDrag(
    payload: Omit<DnDSession, 'inProgress' | 'success' | 'dropTargetIds'>,
  ) {
    session.value = {
      ...payload,
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
