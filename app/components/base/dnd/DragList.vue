<script lang="ts" setup generic="T">
import type { DragItemEvent } from './context'
import { throttle } from 'lodash-es'
import { createDnDId, DragListKey } from './context'
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
     */
    acceptData?: (payload: any) => boolean | undefined
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

const store = useDnDStore()
/** every list keeps its own id, so several lists can share one store */
const listId = props.id || createDnDId('list')

const slots = useSlots()
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
 * purpose, `slots` is not reactive.
 */
function itemSlotNames() {
  return Object.keys(slots).filter(name => name !== 'placeholder')
}

/** where the dragging item comes from, bound to the placeholder slot */
const placeholderOrigin = computed<'self' | 'other'>(() =>
  isOwnItem.value ? 'self' : 'other',
)
const showPlaceholder = computed(() => {
  if (!hasPlaceholderSlot || !listBeingDraggedOver.value) return false
  // an item of another list is not here yet, it can only be previewed
  return placeholderOrigin.value === 'other' || props.reorder === 'placeholder'
})
const itemsBeforePlaceholder = computed(() => {
  if (!showPlaceholder.value) return props.list
  return props.list.slice(0, placeholderIndex.value)
})
const itemsAfterPlaceholder = computed<T[]>(() => {
  if (!showPlaceholder.value) return []
  return props.list.slice(placeholderIndex.value)
})
/**
 * Rendered items carry two indexes: `index` is the position in `list`, the one
 * consumers care about, and `slotIndex` counts the placeholder's own slot, which
 * is what the placeholder math below runs on. They differ by one below the
 * placeholder.
 */
const rowsBeforePlaceholder = computed(() =>
  itemsBeforePlaceholder.value.map((item, index) => ({
    item,
    index,
    slotIndex: index,
  })),
)
const rowsAfterPlaceholder = computed(() =>
  itemsAfterPlaceholder.value.map((item, offset) => {
    const index = itemsBeforePlaceholder.value.length + offset
    return { item, index, slotIndex: index + 1 }
  }),
)

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
  // back to where a fresh list starts, -1 is not an insertion index
  placeholderIndex.value = props.list.length
}

// dragend bubbles from the dragged item up to the source list only, so lists
// the item merely passed through clean up from the document instead. document
// is the last node of the propagation path, the local handler already ran.
useEventListener(document, 'dragend', resetDragState)

// item events, called by the closest DragItem through the provided context
function onItemDragStart({ payload }: DragItemEvent) {
  // placeholder items carry no payload
  if (payload?.index === undefined) return
  const index = Number(payload.index)
  ownDragFromIndex.value = index
  ownDragAtIndex.value = index
  placeholderIndex.value = index
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
  // the first item can only be passed by comparing distances, there is no
  // sibling above it to enter. listTopEl marks the top of the list
  const slotIndex = enteredItemEl.dataset.slotIndex
  const isFirst = slotIndex === '0'
  const isFirstBelowPlaceholder
    = slotIndex === '1' && itemsBeforePlaceholder.value.length === 0
  if (!isFirst && !isFirstBelowPlaceholder) return
  const distanceToItem = distanceToCenter(
    enteredItemEl.getBoundingClientRect(),
    e,
  )
  const distanceToTop = distanceToCenter(
    listTopEl.value.getBoundingClientRect(),
    e,
  )
  if (isFirst ? distanceToTop <= distanceToItem : distanceToItem < distanceToTop) {
    placeholderIndex.value = Number(slotIndex)
  }
}, 10)

function dragenter(e: DragEvent) {
  // init list with 0 item
  if (
    props.list.length === 0
    && !listBeingDraggedOver.value
    && !store.draggingEl?.contains(e.target as HTMLElement)
    && store.isGroupActive(props.group)
  ) {
    placeholderIndex.value = 0
    listBeingDraggedOver.value = true
    e.stopPropagation()
  }
}

const placeholderEl = useTemplateRef('placeholderEl')
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

// this fire before list's dragover
function onItemDragEnter(item: DragItemEvent & { event: DragEvent }) {
  // placeholder items carry no payload
  if (item.payload?.slotIndex === undefined) return
  const slotIndex = Number(item.payload.slotIndex)
  // stop if target element is moving
  // inTransition can't stop if directly dragenter children of target; cause bug in safari
  if (item.el.classList.contains('drag-list--move')) return
  // prevent drag into its nested list
  const closestList = item.el.closest('.drag-list')
  if (store.draggingEl?.contains(closestList)) return
  listBeingDraggedOver.value = true
  // move with placeholder
  if (showPlaceholder.value) {
    if (!lastEnteredEl.value) return
    // placeholderIndex counts the placeholder's slot while slotIndex counts it
    // too, so comparing them is what makes the placeholder land on the side the
    // cursor came from
    if (lastEnteredEl.value === placeholderEl.value?.$el) {
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
  const index = Number(item.payload.index)
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

const dataAllowed = computed(() => {
  return props.acceptData(store.draggingPayload)
})

function drop(e: DragEvent) {
  // remember that we may drop on placeholder
  if (!store.isGroupActive(props.group) || dataAllowed.value === false) return
  if (!showPlaceholder.value) {
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
    // that is not serializable
    const payload = store.draggingPayload
    if (payload) {
      const items = props.list
      items.splice(placeholderIndex.value, 0, payload.value)
      emit('update:list', items)
    }
    listBeingDraggedOver.value = false
    lastEnteredEl.value = null
  }
  e.stopPropagation()
}

const isSafari = /^(?:(?!chrome|android).)*safari/i.test(navigator.userAgent)

function closestDragList(node: Node | null) {
  if (!node) return null
  const element = node.nodeType === 1 ? (node as Element) : node.parentElement
  return (element?.closest('.drag-list') as HTMLElement | null) ?? null
}

function dragleave(e: DragEvent) {
  // move back to original if drag out of list or cancel
  // safari always return relatedTarget as null so we use elementFromPoint instead
  const relatedTarget = isSafari
    ? document.elementFromPoint(e.clientX, e.clientY)
    : (e.relatedTarget as HTMLElement | null)
  if (!isSafari && !relatedTarget) return
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
  if (!isSafari) e.stopPropagation()
}

/**
 * Moves an item, shifting everything in between. In place, so the array
 * identity stays the same and transition-group can animate the move.
 */
function moveItem<Item>(arr: Item[], from: number, to: number) {
  if (from === to) return
  if (from < 0 || to < 0 || from >= arr.length || to >= arr.length) return
  arr.splice(to, 0, ...arr.splice(from, 1))
  return arr
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
    :tag="tag"
    :data-group="group"
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
    <DragItem
      v-for="row of rowsBeforePlaceholder"
      :key="itemKey(row.item)"
      :payload="{ index: row.index, slotIndex: row.slotIndex, value: row.item }"
      :data-slot-index="row.slotIndex"
      :group="group"
      :accept-data="acceptData"
      :enter-zone="enterZone"
      :handle="handle"
      :as="itemTag"
    >
      <template v-for="name of itemSlotNames()" #[name]="scope">
        <slot :name="name" v-bind="scope" :item="row.item" :index="row.index" />
      </template>
    </DragItem>
    <DragItem
      v-if="showPlaceholder"
      ref="placeholderEl"
      key="drag-item--placeholder"
      :as="itemTag"
      class="drag-placeholder"
      :class="`drag-placeholder--${placeholderOrigin}`"
    >
      <!--
        @slot placeholder previews where the dragging item will land
        @binding origin 'self' when the item comes from this list, 'other' when
          it comes from another list or a standalone DragItem
        @binding item value of the dragging item
        @binding data whole payload of the dragging item
       -->
      <slot
        name="placeholder"
        :origin="placeholderOrigin"
        :item="store.draggingPayload?.value"
        :data="store.draggingPayload"
      />
    </DragItem>
    <DragItem
      v-for="row of rowsAfterPlaceholder"
      :key="itemKey(row.item)"
      :payload="{ index: row.index, slotIndex: row.slotIndex, value: row.item }"
      :data-slot-index="row.slotIndex"
      :group="group"
      :accept-data="acceptData"
      :enter-zone="enterZone"
      :handle="handle"
      :as="itemTag"
    >
      <template v-for="name of itemSlotNames()" #[name]="scope">
        <slot :name="name" v-bind="scope" :item="row.item" :index="row.index" />
      </template>
    </DragItem>
  </transition-group>
</template>

<style scoped>
.drag-list--move {
  transition: transform 0.2s ease-out;
}
</style>
