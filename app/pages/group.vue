<script setup lang="ts">
import type { TreeItem } from '~/components/Tree.vue'
import { nanoid } from 'nanoid'
import { ContextMenu } from 'primevue'
import Button from '~/components/Button.vue'
import Tree from '~/components/Tree.vue'
// #region tree
interface Element extends TreeItem {
  name: string
  description: string
  autoAssign: boolean | null
  parentId?: string
  order: number
  children?: Element[]

  isNew?: boolean
  hasChanged?: boolean
}

const initFlatData = [
  {
    id: '0',
    name: 'Disabled drag',
    description: 'Disabled drag',
    disabled: true,
    autoAssign: true,
    order: 0,
  },
  {
    id: '1',
    name: 'One',
    description: 'One',
    autoAssign: true,
    order: 1,
  },
  {
    id: '3',
    name: 'Three',
    description: 'Three',
    autoAssign: true,
    order: 3,
  },
  {
    id: '4',
    name: 'Four (OFF)',
    description: 'Four (OFF)',
    autoAssign: false,
    order: 4,
  },
  {
    id: '2',
    name: 'Two',
    description: 'Two',
    autoAssign: true,
    order: 2,
  },
  {
    id: '1-1',
    name: 'One-OneOne-OneOne-OneOne-OneOne-OneOne-One',
    description: 'One-One',
    disabled: false,
    parentId: '1',
    autoAssign: true,
    order: 0,
  },
  {
    id: '1-1-2',
    name: 'One-One-Two',
    description: 'One-One-Two',
    parentId: '1-1',
    autoAssign: true,
    order: 1,
  },
  {
    id: '1-1-1',
    name: 'One-One-One',
    description: 'One-One-One',
    parentId: '1-1',
    autoAssign: true,
    order: 0,
  },
  {
    id: '1-1-1-2',
    name: 'One-One-One-Two',
    description: 'One-One-One-Two',
    parentId: '1-1-1',
    autoAssign: true,
    order: 1,
  },
  {
    id: '1-1-1-1',
    name: 'One-One-One-One',
    description: 'One-One-One-One',
    autoAssign: true,
    parentId: '1-1-1',
    order: 0,
  },
  {
    id: '1-2',
    name: 'One-Two',
    description: 'One-Two',
    parentId: '1',
    autoAssign: true,
    order: 1,
  },
  {
    id: '2-2',
    name: 'Two-Two',
    description: 'Two-Two',
    parentId: '2',
    autoAssign: true,
    order: 1,
  },
  {
    id: '2-1',
    name: 'Two-One',
    description: 'Two-One',
    parentId: '2',
    autoAssign: true,
    order: 0,
  },
  {
    id: '2-1-1',
    name: 'Two-One-One',
    description: 'Two-One-One',
    parentId: '2-1',
    autoAssign: true,
    order: 0,
  },
  {
    id: '2-1-1-1',
    name: 'Two-One-One-One',
    description: 'Two-One-One-One',
    parentId: '2-1-1',
    autoAssign: true,
    order: 0,
  },
  {
    id: '2-1-1-2',
    name: 'Two-One-One-Two',
    description: 'Two-One-One-Two',
    parentId: '2-1-1',
    autoAssign: true,
    order: 1,
  },
  {
    id: '2-1-2',
    name: 'Two-One-Two',
    description: 'Two-One-Two',
    parentId: '2-1',
    autoAssign: true,
    order: 1,
  },
]

const {
  items,
  depthLimit,
  getFlatItems,
  setFlatItems,
  handleDrop,
  sortItems,
} = useTreeItems({
  depthLimitInitValue: 3,
  getParentId: (item: Element) => item.parentId,
  getOrder: (item: Element) => item.order,
  setOrder: (item: Element, order: number) => {
    item.order = order
  },
})

setFlatItems(initFlatData)
const flatItems = computed(() => getFlatItems()) // @TODO: remove
const selectedItem = ref<Element | null>(items.value[0] || null)

// find list containing the item with the given id
function findList(list: Element[], id: string): Element[] | null {
  for (const item of list) {
    if (item.children) {
      if (item.children.some(child => child.id === id)) {
        return item.children
      }

      const found = findList(item.children, id)

      if (found) {
        return found
      }
    }

    if (item.id === id) {
      return list
    }
  }

  return null
}

function setAncestorsExpanded(tree: Element[], targetId: string, isExpanded = true) {
  // helper function to recursively traverse the tree
  function traverse(node: Element, targetId: string, isExpanded: boolean) {
    // if the current node is the target, return true to indicate it was found
    if (node.id === targetId) {
      return true
    }

    // recursively check the children
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        if (traverse(child, targetId, isExpanded)) {
          // if the target is found in the child's subtree, set isExpanded for the current node
          node.isExpanded = isExpanded

          return true
        }
      }
    }

    // if the target is not found in the current subtree, return false
    return false
  }

  // iterate through the tree and apply the helper function
  for (const node of tree) {
    traverse(node, targetId, isExpanded)
  }

  return tree
}
// #endregion

const { t } = useI18n()
const menu = useTemplateRef('menu')

const contextItem = ref<{ element: Element, depth: number } | null>(null)
const contextOptions = ref([
  { label: t('add'), disabled: () => contextItem.value?.depth === depthLimit.value, command: addItem, icon: 'ph:plus-circle' },
  { label: t('delete'), disabled: () => hasLiveDescendant(contextItem.value!.element), command: deleteItem, icon: 'i-mdi:trash-can-outline' },
])

// add item at root level
function handleAddRootItem() {
  contextItem.value = null
  addItem()
}

function deleteItem() {
  if (!contextItem.value) {
    return
  }

  const foundList = findList(items.value, contextItem.value.element.id)

  if (!foundList) {
    return
  }

  const index = foundList.findIndex(item => item.id === contextItem.value!.element.id)

  foundList.splice(index, 1)

  // update order property of the list after deleting
  for (let i = index; i < foundList.length; i++) {
    const element = foundList[i]!

    element.order = i
  }

  // if the deleted item was selected, select the first item
  if (selectedItem.value?.id === contextItem.value.element.id) {
    selectedItem.value = items.value[0] || null
  }
}

function handleRightClick(event: Event, element: Element, depth: number) {
  contextItem.value = { element, depth }
  menu.value?.show(event)
}

function hasLiveDescendant(node: Element): boolean {
  if (node.autoAssign) {
    return true
  }

  if (node.children) {
    for (const child of node.children) {
      if (hasLiveDescendant(child)) {
        return true
      }
    }
  }

  return false
}

// edit form functions
function addItem() {
  const id = `tmp-${nanoid()}`
  const newItem: Element = {
    id,
    name: '',
    description: '',
    autoAssign: null,
    order: items.value.length,
    isNew: true,
    hasChanged: true,
  }

  if (contextItem.value) { // add to children
    newItem.parentId = contextItem.value.element.id
    newItem.order = contextItem.value.element.children?.length || 0

    if (!contextItem.value.element.children) {
      contextItem.value.element.children = []
    }

    contextItem.value.element.children.push(newItem)

    // expand the list containing the new item
    contextItem.value.element.isExpanded = true
  } else { // add to root
    items.value.push(newItem)
  }

  // select the new item
  selectedItem.value = newItem
}
</script>

<template>
  <div class="grid-cols-[350px_1fr] grid p-4 gap-4">
    <div class="flex flex-col gap-4 overflow-hidden rounded-bl-md">
      <!-- add to root -->
      <div>
        <Button
          :label="t('report_contact_management.add_top_menu')"
          icon="i-ph:plus-bold"
          icon-pos="right"
          @click="handleAddRootItem"
        />
      </div>
      <!-- tree wrapper -->
      <div class="-mx-4 flex flex-col overflow-y-auto pb-4">
        <!-- context menu -->
        <ContextMenu ref="menu" :model="contextOptions" />
        <Tree
          v-model:selected-item="selectedItem"
          :list="items"
          :depth-limit
          class="sortable-tree px-4"
          @drop="handleDrop"
        >
          <template #default="{ element, depth, disabled }">
            <div
              class="draggable-item relative min-h-10"
              :class="[
                selectedItem?.id === element?.id && 'font-500 !bg-primary text-white',
                disabled && 'cursor-default bg-gray-300',
              ]"
              @click="selectedItem = element"
              @contextmenu="handleRightClick($event, element, depth)"
            >
              <p
                class="absolute left-0 top-1/2 -translate-y-1/2 w-full truncate whitespace-nowrap pl-4 pr-4"
                :class="{
                  'opacity-50': !element.autoAssign,
                  'pr-2': element.children?.length && depth < depthLimit,
                }"
              >
                {{ element.name }}
              </p>
              <Button
                v-if="element.children?.length && depth < depthLimit"
                class="btn-link ml-auto translate-x-1/3 transform p-0 text-current"
                :icon="{ class: `text-lg transition-transform duration-250 ${element.isExpanded && 'rotate-180'}`, name: 'tabler:chevron-down' }"
                @click.stop="element.isExpanded = !element.isExpanded"
              />
            </div>
          </template>
        </Tree>
      </div>
    </div>
    <pre class="">{{ selectedItem }}</pre>
  </div>
</template>
