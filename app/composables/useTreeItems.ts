import type { SortableEvent } from 'sortablejs'
import type { TreeItem } from '~/components/Tree.vue'
import { isUndefined } from 'lodash-es'

interface TreeItemsParams<T> {
  depthLimitInitValue: number
  getId?: (item: T) => string
  getParentId: (item: T) => string | null | undefined
  getOrder: (item: T) => number
  setOrder: (item: T, order: number) => void
}

export function useTreeItems<T extends TreeItem>({
  depthLimitInitValue,
  getId = (item: T) => item.id,
  getParentId,
  getOrder,
  setOrder,
}: TreeItemsParams<T>) {
  const items = ref<T[]>([])

  const depthLimit = ref(depthLimitInitValue)
  const setDepthLimit = (limit: number) => {
    depthLimit.value = limit
  }

  const sortItems = (items: T[]) => {
    return items.toSorted((a, b) => {
      // If both items have no parentId (are root items)
      if (!getParentId(a) && !getParentId(b)) {
        return getOrder(a) - getOrder(b)
      }

      // If only a has no parentId, it should come first
      if (!getParentId(a)) {
        return -1
      }

      // If only b has no parentId, it should come first
      if (!getParentId(b)) {
        return 1
      }

      // If items have different parentIds, sort by parentId
      if (getParentId(a) !== getParentId(b)) {
        return getParentId(a)!.localeCompare(getParentId(b)!)
      }

      // If items have the same parentId, sort by order
      return getOrder(a) - getOrder(b)
    })
  }

  const setFlatItems = (flatArray: T[]) => {
    // sort items by its order and parentId
    const sortedArray = sortItems(flatArray)

    // create a map to store nodes by their id for quick lookup
    const nodeMap = new Map()

    // create all nodes and store them in the map
    for (const item of sortedArray) {
      nodeMap.set(getId(item), { ...item, children: [] })
    }

    // initialize the root nodes array
    const roots: T[] = []

    // build the tree structure
    for (const item of sortedArray) {
      const node = nodeMap.get(getId(item))

      if (getParentId(item)) {
        // if the node has a parent, add it to the parent's children array
        const parent = nodeMap.get(getParentId(item))

        if (parent) {
          parent.children.push(node)
        }
      } else {
        // if the node has no parent, it's a root node
        roots.push(node)
      }
    }

    items.value = roots
  }

  const getFlatItems = (tree: T[] = items.value as T[]) => {
    let result: T[] = []

    for (const node of tree) {
      // create a new object for the current node
      const flattenedNode = { ...node }

      // remove the children property to avoid duplication in the flattened structure
      delete flattenedNode.children

      // add the current node to the result
      result.push(flattenedNode)

      // recursively flatten the children and add them to the result
      if (node.children && node.children.length > 0) {
        result = result.concat(getFlatItems(node.children as T[]))
      }
    }

    return result
  }

  const handleDrop = ({ list, event }: { list: T[], event: SortableEvent }) => {
    const from = event.oldIndex
    const to = event.newIndex

    if (isUndefined(from) || isUndefined(to)) {
      return
    }

    // move items
    const temp = list.splice(from, 1)[0]!

    list.splice(to, 0, temp)

    // update order all items in the current list
    const minIndex = 0
    const maxIndex = list.length - 1

    for (let i = minIndex; i <= maxIndex; i++) {
      setOrder(list[i]!, i)
    }
  }

  return {
    items, // tree items
    depthLimit: readonly(depthLimit),
    setDepthLimit,
    sortItems,
    setFlatItems,
    getFlatItems,
    handleDrop,
  }
}
