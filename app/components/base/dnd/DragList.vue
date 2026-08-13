<script lang="ts" setup generic="T">
import type { DragItemEvent } from './context'
import type { DraggingPayload, DragListPayload } from '~/stores/dnd'
import { throttle } from 'lodash-es'
import { useDragRows } from './composables/useDragRows'
import {
  closestDragList,
  createDnDId,
  dragLeaveTarget,
  DragListKey,
  isSafari,
} from './context'
import DragItem from './DragItem.vue'

const props = withDefaults(
  defineProps<{
    list: T[]
    /** unique id of this list, generated when omitted */
    id?: string
    /** func to get the v-for key of an item */
    itemKey?: (item: T) => PropertyKey
    /** HTML tag for draglist */
    tag?: string
    /** HTML tag for each item */
    itemTag?: string
    /** DragItem prop */
    handle?: string
    /** DragItem prop */
    enterZone?: string
    /**
     * only lists and items sharing a group interact with each other. Also
     * lands on the list root as `data-group` for styling and e2e selectors,
     * the logic itself looks groups up in the store.
     */
    group?: string
    /**
     * validates the payload of the dragging item. `true` allows the drop,
     * `false` refuses it, `undefined` stays neutral: allowed, but without the
     * allow/forbid classes on the items.
     *
     * The payload may come from any other list or a standalone item, so read it
     * defensively: `data?.value` may be undefined, and `index` only exists when
     * a `DragList` started the drag.
     */
    acceptData?: (payload?: DraggingPayload) => boolean | undefined
    /** what happens to the original item when another list takes it over */
    transfer?: 'copy' | 'cut'
    /**
     * how items of this list reorder while being dragged over it.
     * `immediate` shifts them under the cursor, `placeholder` keeps them in
     * place and previews the landing spot through the `placeholder` slot until
     * the drop. Items coming from another list always use the placeholder,
     * they are not part of this list yet.
     */
    reorder?: 'immediate' | 'placeholder'
    /**
     * which slice of `list` is rendered, for a virtualizer owning the scrolling
     * (`useVirtualList` and friends): `offset` is the position of the first
     * rendered item in `list`, `count` how many follow it.
     *
     * `list` stays the whole list and every index stays a position in it, so
     * items reorder and land across the parts that are not rendered. The list
     * keeps the dragged item mounted while it is scrolled out of the window,
     * and drops its own transitions: rows entering and leaving on every scroll
     * step have nothing to animate.
     */
    visible?: { offset: number, count: number }
  }>(),
  {
    itemKey: (item: any) => item,
    tag: 'div',
    itemTag: 'div',
    acceptData: () => undefined,
    transfer: 'copy',
    reorder: 'immediate',
  },
)
const emit = defineEmits<{ 'update:list': [list: T[]] }>()

const slots = defineSlots<{
  /**
   * one entry of the list
   * @binding item the entry itself
   * @binding index its position in `list`
   * @binding dragging whether this entry is the one being dragged
   */
  'default': (props: { item: T, index: number, dragging: boolean }) => any
  /**
   * previews where the dragging item will land. Required by
   * `reorder="placeholder"`, and to accept items of other lists
   * @binding origin 'self' when the item comes from this list, 'other' when it
   *   comes from another list or a standalone DragItem. Not something `data` can
   *   tell you: an item of another list carries a position too
   * @binding data payload of the dragging item, `data.value` being the dragged
   *   thing. Only assumed to be a T of this list
   */
  'placeholder': (props: {
    origin: 'self' | 'other'
    data: DraggingPayload<T>
  }) => any
  /**
   * follows the cursor instead of the browser's own drag ghost
   * @binding data payload of the entry being dragged
   * @binding width width of the entry when it was mounted
   * @binding height height of the entry when it was mounted
   */
  'drag-image': (props: {
    item: T
    index: number
    data: DragListPayload<T>
    width: number
    height: number
  }) => any
}>()

const store = useDnDStore()
/** every list keeps its own id, so several lists can share one store */
const listId = props.id || createDnDId('list')
const listEl = useTemplateRef('listEl')
// draggingOver listEl
const listBeingDraggedOver = ref(false)
/**
 * Index the dragged item had in this list when the drag started, -1 while the
 * dragged item is not ours. The store owns everything else about the drag.
 */
const ownDragFromIndex = ref(-1)
/** index our dragged item currently sits at, it moves while being shifted around */
const ownDragAtIndex = ref(-1)
const isOwnItem = computed(() => ownDragFromIndex.value > -1)
/** insertion index of the placeholder, counting its own slot */
const placeholderIndex = ref(props.list.length)
const lastEnteredEl = ref<HTMLElement | null>(null)
const hasPlaceholderSlot = Object.keys(slots).includes('placeholder')

/**
 * Slots handed down to the items. `placeholder` belongs to the list itself, the
 * items would only carry it around unrendered. Called on every render on
 * purpose, `slots` is not reactive. Keyed, not `string[]`, so the template can
 * index the declared slots with it.
 */
function itemSlotNames() {
  const names = Object.keys(slots).filter(name => name !== 'placeholder')
  // the placeholder row renders through its default slot, which has to be
  // handed down even when the consumer declared no default slot of its own
  if (!names.includes('default')) names.unshift('default')
  return names as (keyof typeof slots)[]
}

/** where the dragging item comes from, bound to the placeholder slot */
const placeholderOrigin = computed<'self' | 'other'>(() =>
  isOwnItem.value ? 'self' : 'other',
)
/**
 * Payload of the item hovering this list, and what the placeholder slot renders.
 * Copied instead of read from the store: the dragged item's `dragend` clears the
 * session, and a scheduler flush can land between that and this list's own
 * `dragend`, so the placeholder would render one last time with nothing to show.
 * The dragged value is only assumed to be a T of this list.
 */
// shallow: the payload is replaced as a whole, and `ref` would unwrap T
const hoveringPayload = shallowRef<DraggingPayload<T> | null>(null)
const showPlaceholder = computed(() => {
  if (!hasPlaceholderSlot || !listBeingDraggedOver.value) return false
  // nothing to preview, and nothing this list could insert either: `drop` skips
  // an undefined value the same way. The types cannot rule this out, a `DragItem`
  // payload is any object
  if (hoveringPayload.value?.value === undefined) return false
  // an item of another list is not here yet, it can only be previewed
  return placeholderOrigin.value === 'other' || props.reorder === 'placeholder'
})
/**
 * What to render, and where the placeholder sits among it. `placeholderRendered`
 * is the placeholder actually on screen: in a windowed list its insertion index
 * may have scrolled out of view.
 */
const { rows, topRow, placeholderOnTop, placeholderRendered, isWindowed }
  = useDragRows<T>({
    list: () => props.list,
    // read through props, a changed itemKey has to re-key the rows
    itemKey: item => props.itemKey(item),
    visible: () => props.visible,
    placeholderIndex: () => placeholderIndex.value,
    showPlaceholder: () => showPlaceholder.value,
    draggingAtIndex: () => ownDragAtIndex.value,
  })

/** the missing slot warning sits in a drag handler, warn once per list */
let warnedMissingSlot = false

if (props.reorder === 'placeholder' && !hasPlaceholderSlot) {
  console.warn(
    'DragList: reorder="placeholder" needs a #placeholder slot to preview where the item lands',
  )
}

// keep the store in sync so any list can be looked up by its id
watch(() => props.group, group => store.registerList({ id: listId, group }), {
  immediate: true,
})
onBeforeUnmount(() => store.unregisterList(listId))

function resetDragState() {
  ownDragFromIndex.value = -1
  ownDragAtIndex.value = -1
  listBeingDraggedOver.value = false
  lastEnteredEl.value = null
  hoveringPayload.value = null
  // back to where a fresh list starts, -1 is not an insertion index
  placeholderIndex.value = props.list.length
}

// dragend bubbles from the dragged item up to the source list only, so lists
// the item merely passed through clean up from the document instead. document
// is the last node of the propagation path, the local handler already ran.
useEventListener(document, 'dragend', resetDragState)

// item events, called by the closest DragItem through the provided context
function onItemDragStart({ payload }: DragItemEvent) {
  // the placeholder item carries no payload
  if (!isDragListPayload<T>(payload)) return
  ownDragFromIndex.value = payload.index
  ownDragAtIndex.value = payload.index
  placeholderIndex.value = payload.index
  hoveringPayload.value = payload
}

const listTopEl = useTemplateRef('listTopEl')

function distanceToCenter(rect: DOMRect, e: DragEvent) {
  return Math.hypot(
    rect.left + rect.width / 2 - e.clientX,
    rect.top + rect.height / 2 - e.clientY,
  )
}

const dragover = throttle((e: DragEvent) => {
  if (!store.isGroupActive(props.group) || !listTopEl.value) return
  // get closest drag element
  const target = e.target as Element
  const enteredItemEl
    = target.nodeType === 1
      ? (target.closest('.drag-container') as HTMLElement)
      : (target.parentElement?.closest('.drag-container') as HTMLElement)
  // stop update lastEnteredEl if in transition
  // fast moving causes sometimes e.target is listEl. So enteredItemEl would be null
  if (!enteredItemEl || enteredItemEl.classList.contains('drag-list--move')) {
    return
  }
  lastEnteredEl.value = enteredItemEl
  // the topmost rendered item can only be passed by comparing distances, there
  // is no sibling above it to enter. listTopEl marks the top of the rendered
  // rows, which is the top of the list unless a window is given
  const row = topRow.value
  if (!row || Number(enteredItemEl.dataset.slotIndex) !== row.slotIndex) return
  const distanceToItem = distanceToCenter(
    enteredItemEl.getBoundingClientRect(),
    e,
  )
  const distanceToTop = distanceToCenter(
    listTopEl.value.getBoundingClientRect(),
    e,
  )
  if (placeholderOnTop.value) {
    // coming closer to the item than to the top means landing below it
    if (distanceToItem < distanceToTop) placeholderIndex.value = row.index + 1
  } else if (distanceToTop <= distanceToItem) {
    placeholderIndex.value = row.index
  }
}, 10)

function dragenter(e: DragEvent) {
  // the list's own background, so no row of ours is under the cursor and the
  // drag is past the last one. Rows are the only children, which makes this the
  // whole area below them, and an empty list nothing but this
  if (
    e.target === (listEl.value?.$el as HTMLElement | undefined)
    && !listBeingDraggedOver.value
    && !store.draggingEl?.contains(e.target as HTMLElement)
    && store.isGroupActive(props.group)
  ) {
    placeholderIndex.value = props.list.length
    listBeingDraggedOver.value = true
    hoveringPayload.value = store.draggingPayload as DraggingPayload<T> | null
    e.stopPropagation()
  }
}

const inTransition = ref(false)
function setTransitionState(val: boolean, e: TransitionEvent | AnimationEvent) {
  // transitions of the consumer's own content bubble up here too. Only the move
  // transition of a direct child counts, and Vue drops the move class before
  // transitionend reaches us, so match on the property instead of the class.
  const target = e.target as HTMLElement | null
  if (!target || target.parentElement !== (listEl.value?.$el as HTMLElement)) {
    return
  }
  if ('propertyName' in e && !e.propertyName.endsWith('transform')) return
  inTransition.value = val
}

/**
 * True for this list's own placeholder. The class alone is not enough: a nested
 * list's placeholder carries it too, and `lastEnteredEl` is whatever
 * `.drag-container` the cursor came from, nested ones included. Rows are direct
 * children of the list root, so the parent tells them apart.
 */
function isOwnPlaceholder(el: HTMLElement) {
  return (
    el.classList.contains('drag-placeholder')
    && el.parentElement === (listEl.value?.$el as HTMLElement | undefined)
  )
}

// this fire before list's dragover
function onItemDragEnter(item: DragItemEvent & { event: DragEvent }) {
  // the placeholder item carries no payload
  if (!isDragListPayload(item.payload)) return
  const { index, slotIndex } = item.payload
  // stop if target element is moving
  // inTransition can't stop if directly dragenter children of target; cause bug in safari
  if (item.el.classList.contains('drag-list--move')) return
  // prevent drag into its nested list
  const closestList = item.el.closest('.drag-list')
  if (store.draggingEl?.contains(closestList)) return
  listBeingDraggedOver.value = true
  // the store's payload, not this item's: `item` is the one being entered
  hoveringPayload.value = store.draggingPayload as DraggingPayload<T> | null
  // move with placeholder
  if (showPlaceholder.value) {
    if (!lastEnteredEl.value) return
    // placeholderIndex counts the placeholder's slot while slotIndex counts it
    // too, so comparing them is what makes the placeholder land on the side the
    // cursor came from
    if (isOwnPlaceholder(lastEnteredEl.value)) {
      // enter from placeholder
      placeholderIndex.value = slotIndex
    } else if (placeholderIndex.value > slotIndex) {
      placeholderIndex.value = slotIndex + 1
    } else {
      placeholderIndex.value = slotIndex
    }
    lastEnteredEl.value = item.el
    item.event.stopPropagation()
    return
  }
  // move item immediately, in list indexes: no placeholder is rendered here
  if (
    props.reorder === 'immediate'
    && isOwnItem.value
    && ownDragAtIndex.value !== index
  ) {
    moveItem(props.list, ownDragAtIndex.value, index)
    // update index of dragging element
    ownDragAtIndex.value = index
    // this list already took the item over, it must not be cut on dragend
    store.addDropTarget(listId)
  }
  // an item of another list can only land through the placeholder
  if (!hasPlaceholderSlot && !isOwnItem.value && !warnedMissingSlot) {
    warnedMissingSlot = true
    console.warn(
      'DragList: a #placeholder slot is required to accept items of other lists',
    )
  }
  item.event.stopPropagation()
}

function dragend() {
  // the item landed in another list, drop the original one
  if (
    isOwnItem.value
    && props.transfer === 'cut'
    && store.droppedOutside(listId)
  ) {
    const items = props.list
    items.splice(ownDragFromIndex.value, 1)
    emit('update:list', items)
  }
  resetDragState()
}

const dataAllowed = computed(() =>
  props.acceptData(store.draggingPayload ?? undefined),
)

function drop(e: DragEvent) {
  // remember that we may drop on placeholder
  if (!store.isGroupActive(props.group) || dataAllowed.value === false) return
  // the rendered placeholder, not merely the state: a windowed list may have
  // scrolled its landing spot out of view, and dropping on a spot nothing
  // previews would move the item somewhere the user cannot see
  if (!placeholderRendered.value) {
    // though DragItem's drop set success as true, users may drop on
    // positions belong to list only
    store.markDropFailed()
    return
  }
  // taking the item over is what keeps dragend from cutting it out of this list
  store.markDropped(listId)
  if (placeholderOrigin.value === 'self') {
    // the dragging item still sits in the list, so an insertion index below it
    // shifts up by one as soon as it is pulled out
    const to
      = placeholderIndex.value > ownDragAtIndex.value
        ? placeholderIndex.value - 1
        : placeholderIndex.value
    moveItem(props.list, ownDragAtIndex.value, to)
  } else {
    // take the payload from the store, JSON in dataTransfer loses everything
    // that is not serializable. Any source will do, a standalone DragItem knows
    // no index. T is only assumed to match, that is what acceptData is for
    const incoming = store.draggingPayload?.value as T | undefined
    if (incoming !== undefined) {
      const items = props.list
      items.splice(placeholderIndex.value, 0, incoming)
      emit('update:list', items)
    }
    listBeingDraggedOver.value = false
    lastEnteredEl.value = null
  }
  e.stopPropagation()
}

function dragleave(e: DragEvent) {
  // move back to original if drag out of list or cancel
  const safari = isSafari()
  const relatedTarget = dragLeaveTarget(e)
  if (!safari && !relatedTarget) return
  const rootEl = listEl.value?.$el as HTMLElement | undefined
  if (!listBeingDraggedOver.value || !rootEl) return

  const closestList = closestDragList(relatedTarget)
  const closestListMeta = store.getList(closestList?.id)
  const leftToOutside = !rootEl.contains(relatedTarget)
  // leave to other el's nested list
  const leftToOtherList
    = !!closestListMeta
      && closestListMeta.id !== listId
      // prevent leave to inside dragging el
      && !store.draggingEl?.contains(relatedTarget)
      // there are chances dragleave el from nested one to parent
      // relatedTarget was original list itself
      && closestListMeta.id !== store.session?.sourceListId
      && closestListMeta.group === props.group
  if (!leftToOutside && !leftToOtherList) return

  // firefox will fire dragenter and dragleave forever
  // if dragging at border of list when list is in transition
  if (!inTransition.value && isOwnItem.value) {
    moveItem(props.list, ownDragAtIndex.value, ownDragFromIndex.value)
    ownDragAtIndex.value = ownDragFromIndex.value
  }
  listBeingDraggedOver.value = false
  lastEnteredEl.value = null
  if (!safari) e.stopPropagation()
}

/**
 * The box a leaving row keeps while it is out of flow, see
 * `.drag-list--leave-active`. Out of flow there is nothing left to size or place
 * it: a percentage width resolves against the list's padding box, padding
 * included, so a padded list would get a row wider than itself and flicker a
 * scrollbar, and in a flex or grid list an out-of-flow row does not even keep
 * its place, it takes the container's start corner. So it carries its own box,
 * measured here, before the leave classes land and while it is still in flow.
 *
 * Windowed lists are left alone: they run with `:css="false"`, so no leave class
 * is applied and no row goes out of flow, while rows leave on every scroll step.
 */
function pinLeavingRow(el: Element) {
  if (isWindowed.value) return
  const row = el as HTMLElement
  // offsets are measured from the padding box of `.drag-list`, which is exactly
  // the containing block the row is about to be placed in
  const { offsetLeft, offsetTop, offsetWidth, offsetHeight } = row
  row.style.left = `${offsetLeft}px`
  row.style.top = `${offsetTop}px`
  row.style.width = `${offsetWidth}px`
  row.style.height = `${offsetHeight}px`
  // its margins space no siblings now, and `left`/`top` place the margin box
  row.style.margin = '0'
}

provide(DragListKey, {
  id: listId,
  onItemDragStart,
  onItemDragEnter,
})
</script>

<template>
  <transition-group
    :id="listId"
    ref="listEl"
    class="drag-list"
    move-class="drag-list--move"
    leave-active-class="drag-list--leave-active"
    :css="isWindowed ? false : undefined"
    :tag="tag"
    :data-group="group"
    @before-leave="pinLeavingRow"
    @dragleave="dragleave"
    @dragend="dragend"
    @drop="drop"
    @dragover="dragover"
    @dragstart.stop
    @dragenter="dragenter"
    @animationstart="setTransitionState(true, $event)"
    @animationend="setTransitionState(false, $event)"
    @transitionstart="setTransitionState(true, $event)"
    @transitionend="setTransitionState(false, $event)"
  >
    <div key="list-top" ref="listTopEl" />
    <!-- one keyed sequence for items, placeholder and the pinned dragged item:
      a row that changes kind keeps its element instead of being remounted -->
    <DragItem
      v-for="row of rows"
      :key="row.key"
      :as="itemTag"
      :class="
        row.kind === 'placeholder'
          ? ['drag-placeholder', `drag-placeholder--${placeholderOrigin}`]
          : { 'drag-list__pinned': row.pinned }
      "
      :draggable="row.kind === 'item'"
      :payload="
        row.kind === 'item'
          ? { index: row.index, slotIndex: row.slotIndex, value: row.item }
          : undefined
      "
      :data-slot-index="row.kind === 'item' ? row.slotIndex : undefined"
      :group="row.kind === 'item' ? group : undefined"
      :accept-data="row.kind === 'item' ? acceptData : undefined"
      :enter-zone="row.kind === 'item' ? enterZone : undefined"
      :handle="row.kind === 'item' ? handle : undefined"
    >
      <template v-for="name of itemSlotNames()" #[name]="scope">
        <!-- @vue-ignore the slot name is only known at runtime, so its props
          cannot be matched against a single declared slot. Consumers still get
          the types from defineSlots above -->
        <slot
          v-if="row.kind === 'item'"
          :name="name"
          v-bind="scope"
          :item="row.item"
          :index="row.index"
        />
        <slot
          v-else-if="name === 'default'"
          name="placeholder"
          :origin="placeholderOrigin"
          :data="hoveringPayload!"
        />
      </template>
    </DragItem>
  </transition-group>
</template>

<style scoped>
.drag-list {
  /* containing block of the rows on their way out, see below */
  position: relative;
}

.drag-list--move {
  transition: transform 0.2s ease-out;
}

/*
 * A row on its way out must not hold its slot. transition-group measures the new
 * layout right after the update, while a leaving row is still in the DOM, so one
 * in flow puts every row below it a slot too low, sends them animating to that
 * wrong place, and snaps the whole list up once the row finally goes.
 *
 * Where it sits and how big it is comes from `pinLeavingRow`, which puts it back
 * where it stood, border-box so the numbers it measured mean the same box here.
 */
.drag-list--leave-active {
  position: absolute;
  box-sizing: border-box;
}

/*
 * The dragged item while it is scrolled out of a windowed list: out of flow so
 * it takes no room, and out of hit testing so it cannot be entered, but still
 * rendered, which is what keeps the native drag alive.
 */
.drag-list__pinned {
  position: fixed;
  top: 0;
  left: -9999px;
  width: 1px;
  height: 1px;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}
</style>
