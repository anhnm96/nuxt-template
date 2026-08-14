<script lang="ts" setup generic="P extends object = object">
import type { DraggingPayload } from '~/stores/dnd'
import { throttle } from 'lodash-es'
import { createDnDId, DragListKey } from './context'

const props = withDefaults(
  defineProps<{
    /**
     * defines html tag
     */
    as?: string
    /**
     * enable/disable drag
     */
    draggable?: boolean
    /**
     * enable/disable drop
     */
    droppable?: boolean
    /**
     * what the drag carries, any shape you like. A `DragList` passes a
     * `DragListPayload`, and putting the dragged thing under `value` is what
     * lets a `DragList` accept this item: that is the key it inserts.
     */
    payload?: P
    /**
     * cursor feedback while something is dragged over this component. Set on
     * the drop target, as the spec requires, and it must be permitted by the
     * dragged source's `effectAllowed` or the browser refuses the drop.
     */
    dropEffect?: 'copy' | 'move' | 'link' | 'none'
    /** which drop effects are permitted while this component is dragged */
    effectAllowed?:
      | 'none'
      | 'copy'
      | 'copyLink'
      | 'copyMove'
      | 'link'
      | 'linkMove'
      | 'move'
      | 'all'
      | 'uninitialized'
    /** hover class for drop component */
    hoverClass?: string
    /** drag handle selector */
    handle?: string
    /** selector limiting which part of this component counts as entered */
    enterZone?: string
    group?: string
    /**
     * validates the payload of the dragging item for this drop component.
     * `true` allows the drop and adds `allowClass`, `false` refuses it and adds
     * `forbiddenClass`, `undefined` stays neutral: the drop is allowed and
     * neither class is added.
     *
     * The payload comes from whatever is being dragged, so read it defensively:
     * `data?.value` may be undefined, and `index` only exists when a `DragList`
     * started the drag.
     */
    acceptData?: (payload?: DraggingPayload) => boolean | undefined
    /** class for drop component if accepts dragging element */
    allowClass?: string
    /** class for drop component if not accepts dragging element */
    forbiddenClass?: string
  }>(),
  {
    as: 'div',
    draggable: true,
    droppable: true,
    dropEffect: 'move',
    effectAllowed: 'move',
    hoverClass: 'drop-hover',
    acceptData: () => undefined,
    allowClass: 'drop-allowed',
    forbiddenClass: 'drop-forbidden',
  },
)
const emit = defineEmits<{
  dropped: [
    result: {
      event: DragEvent
      /**
       * payload of the item that was dropped here. It may come from anywhere, so
       * `value` is only assumed and `index` only exists when a `DragList`
       * started the drag: narrow it with `isDragListPayload` when it matters
       */
      source: DraggingPayload | null
      /** payload of this component, the one that received the drop */
      target: P | undefined
    },
  ]
}>()

const slots = defineSlots<{
  /**
   * content of the item
   * @binding dragging whether this item is the one being dragged
   */
  'default': (props: { dragging: boolean }) => any
  /**
   * follows the cursor instead of the browser's own drag ghost
   * @binding data the `payload` prop of this item
   * @binding width width of the item when it was mounted
   * @binding height height of the item when it was mounted
   */
  'drag-image': (props: {
    data: P | undefined
    width: number
    height: number
  }) => any
}>()
const store = useDnDStore()
/** set when the item is rendered inside a DragList */
const dragList = inject(DragListKey, null)
/** identifies this item in the store, no matter how many items are mounted */
const itemId = createDnDId('item')
const el = ref<HTMLElement>()
const dragging = ref(false)
const dragImageEl = ref<HTMLElement>()
const hasDragImageSlot = Object.keys(slots).includes('drag-image')
const width = ref(0)
const height = ref(0)
// handle's stuffs
let handleEl: HTMLElement | null
// locked from the start when a handle is configured, waiting for onMounted would
// leave the item draggable for a tick
const handleLock = ref(!!props.handle)
function handleMouseDown() {
  handleLock.value = false
}

function handleMouseUp() {
  // only lock back when a handle is configured, otherwise the whole item drags
  if (props.handle) handleLock.value = true
}
// listen on document: releasing the button away from the handle must lock too,
// else the item stays draggable from anywhere until the next drag
useEventListener(document, 'mouseup', handleMouseUp)

let enterZoneEl: HTMLElement | null
onMounted(() => {
  // for drag-image slot
  const rect = el.value!.getBoundingClientRect()
  width.value = rect.width
  height.value = rect.height
  if (props.enterZone) {
    enterZoneEl = el.value!.querySelector(props.enterZone)
  }
  // handle handle
  if (props.handle) {
    handleEl = el.value!.querySelector(props.handle)
    handleEl?.addEventListener('mousedown', handleMouseDown)
  }
})
onBeforeUnmount(() => {
  // it's ok if handlEl was removed before removeEventlistener
  // leave garbage collector to do the job
  handleEl?.removeEventListener('mousedown', handleMouseDown)
})

const dataAllowed = computed(() =>
  props.acceptData(store.draggingPayload ?? undefined),
)

/** allow/forbid class while something is dragged over this drop component */
const dropStateClass = computed(() => {
  if (!props.droppable || !store.isGroupActive(props.group)) return null
  if (dataAllowed.value === undefined) return null
  return {
    [props.allowClass]: dataAllowed.value,
    [props.forbiddenClass]: !dataAllowed.value,
  }
})

/** true while this component may take the dragging item */
function acceptsDrag() {
  // group first: acceptData must not be called with the data of a dead session
  return (
    props.droppable
    && store.isGroupActive(props.group)
    && dataAllowed.value !== false
  )
}

/** puts the drag image under the cursor, in viewport coordinates */
function moveDragImage(e: { clientX: number, clientY: number }) {
  if (!dragImageEl.value) return
  dragImageEl.value.style.left = `${e.clientX}px`
  dragImageEl.value.style.top = `${e.clientY}px`
}

const documentDragover = throttle((e: DragEvent) => {
  e.preventDefault()

  if (!dragImageEl.value) {
    return
  }
  moveDragImage(e)
  // `customdrag` is public: listen to it with @customdrag to follow the cursor
  // during a drag. It only fires while a drag-image slot is given, and it exists
  // because firefox reports 0, 0 as the mouse position on drag events
  // https://bugzilla.mozilla.org/show_bug.cgi?id=505521
  el.value!.dispatchEvent(new MouseEvent('customdrag', e))
}, 20)

function dragstart(e: DragEvent) {
  dragging.value = true

  store.startDrag({
    itemId,
    sourceListId: dragList?.id ?? '',
    group: props.group,
    payload: props.payload,
    el: el.value ?? null,
  })
  dragList?.onItemDragStart({ itemId, el: el.value!, payload: props.payload })
  if (hasDragImageSlot) {
    // add dragover event for handling drag image position compatible with firefox
    // and prevent drag end move back animation when drop outside of dropable element
    nextTick(() => {
      // under the cursor from the first frame: the drag image is only rendered
      // once `dragging` flushes, and the first dragover may be a throttle
      // window away
      moveDragImage(e)
      document.addEventListener('dragover', documentDragover)
    })
    // remove default drag image
    // BUG in safari: must use empty GIF image instead of creating a div element or safari will fire dragend immediately
    const defaultImg = new Image()
    defaultImg.src
      = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7' // transparent gif, resolves issue with Safari that otherwise does not allow dragging
    defaultImg.style.visibility = 'hidden'
    e.dataTransfer?.setDragImage(defaultImg, 0, 0)
  }
  if (!e.dataTransfer) return
  e.dataTransfer.effectAllowed = props.effectAllowed
  // keep the payload on the native event for drops outside of the app
  e.dataTransfer.setData('text', JSON.stringify(props.payload))
}

function dragover(e: DragEvent) {
  // dropEffect only counts when the drop target sets it, assignments during
  // dragstart are ignored by the browser
  if (!e.dataTransfer || !acceptsDrag()) return
  e.dataTransfer.dropEffect = props.dropEffect
}

function dragenter(e: DragEvent) {
  if (enterZoneEl && !enterZoneEl.contains(e.target as Node)) {
    return
  }
  if (!acceptsDrag()) return
  // notify the owning list directly, emit causes laggy
  dragList?.onItemDragEnter({
    itemId,
    el: el.value!,
    payload: props.payload,
    event: e,
  })
  // only add hoverClass on droppable components
  if (props.droppable) el.value?.classList.add(props.hoverClass)
}

function dragleave() {
  if (props.droppable) {
    // remove hover class
    // optional value in case of placeholder in drag list disappear
    el.value?.classList.remove(props.hoverClass)
  }
}

function drop(e: DragEvent) {
  if (!acceptsDrag()) return
  const source = store.draggingPayload
  store.markDropped(itemId)
  // remove hover class
  el.value!.classList.remove(props.hoverClass)
  /** drop event */
  emit('dropped', { event: e, source, target: props.payload })

  document.removeEventListener('dragover', documentDragover)
}

function dragend() {
  if (handleEl) {
    handleLock.value = true
  }
  dragging.value = false
  // the session stays readable for the dragend handlers of parent lists
  store.endDrag()
  if (hasDragImageSlot) {
    document.removeEventListener('dragover', documentDragover)
  }
}
</script>

<template>
  <component
    :is="as"
    ref="el"
    class="drag-container"
    :class="dropStateClass"
    :draggable="draggable && !handleLock"
    @dragstart.self="dragstart"
    @dragenter.prevent="dragenter"
    @dragover.prevent="dragover"
    @dragleave="dragleave"
    @drop="drop"
    @dragend="dragend"
  >
    <!--
      @slot default
      @binding dragging item is being dragged status
     -->
    <slot :dragging="dragging" />
    <!--
      to the body, not into this item: the drag image is placed in viewport
      coordinates, and a `fixed` box resolves those against the nearest
      transformed ancestor instead of the viewport. This item gets a transform
      whenever its list animates it into a new slot, which would drag the image
      along by this item's own offset and snap it back once the move ends
    -->
    <Teleport to="body">
      <div
        v-if="dragging && hasDragImageSlot"
        ref="dragImageEl"
        class="drag-image"
      >
        <!--
          @slot drag-image
          @binding data payload passed as props
          @binding width width of the element
          @binding height height of the element
        -->
        <slot
          name="drag-image"
          :data="payload"
          :width="width"
          :height="height"
        />
      </div>
    </Teleport>
  </component>
</template>

<style scoped>
/*
 * Follows the cursor in viewport coordinates, `left`/`top` being where the cursor
 * is, so it is centred on that point rather than hanging off it. Teleported to
 * the body, see the template: `fixed` means the viewport only while no ancestor
 * is transformed.
 */
.drag-image {
  position: fixed;
  top: 0;
  left: 0;
  transform: translate(-50%, -50%);
  will-change: top, left;
  z-index: 999;
  pointer-events: none;
}
</style>
