<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import type { ToolbarItems } from '~/types/tiptap'
import { BubbleMenu } from '@tiptap/vue-3/menus'
import Listbox from 'primevue/listbox'
import Dropdown from '~/components/Dropdown.vue'
import Tooltip from '../Tooltip.vue'

const { editor } = defineProps<{ editor?: Editor }>()

const maxCols = ref(10)
const maxRows = ref(2)
const selectedArea = ref({
  row: 1,
  col: 1,
})

watch(() => selectedArea.value.row, (newRow) => {
  if (maxRows.value === 10) {
    return
  }

  if (newRow === maxRows.value) {
    maxRows.value++
  }
})

function insertTable() {
  editor?.chain().focus().insertTable({
    rows: selectedArea.value.row,
    cols: selectedArea.value.col,
    withHeaderRow: false,
  }).run()
  selectedArea.value = { row: 1, col: 1 }
  maxRows.value = 2
}

// #region bubble menu
// convert inline style string to object
// e.g. 'background-color: red; color: blue;' to { 'background-color': 'red', 'color': 'blue' }
function parseStyle(styleAttr: string) {
  if (!styleAttr) {
    return {}
  }

  const styles: Record<string, string> = {}

  styleAttr.split(';').forEach((pair) => {
    const [prop, value] = pair.split(':').map(part => part && part.trim())

    if (prop && value) {
      styles[prop] = value
    }
  })

  return styles
}

const cellBackgroundColor = computed<string>(() => {
  if (!editor!.isActive('tableCell')) {
    return ''
  }

  const style = editor?.getAttributes('tableCell').style || ''

  if (!style) {
    return ''
  }

  return parseStyle(style)['background-color'] || ''
})

const bubbleMenuItems: ToolbarItems = [
  { type: 'button', label: 'Toggle Header Row', icon: 'i-tabler:table-row', action: () => editor?.chain().focus().toggleHeaderRow().run() },
  { type: 'button', label: 'Toggle Column Row', icon: 'i-tabler:table-column', action: () => editor?.chain().focus().toggleHeaderColumn().run() },
  { type: 'popover', label: 'Row', icon: 'i-tabler:layout-rows', list: [
    { label: 'Add Row Above', icon: 'i-tabler:row-insert-top', action: () => editor?.chain().focus().addRowBefore().run() },
    { label: 'Add Row Below', icon: 'i-tabler:row-insert-bottom', action: () => editor?.chain().focus().addRowAfter().run() },
    { label: 'Remove Row', icon: 'i-tabler:row-remove', action: () => editor?.chain().focus().deleteRow().run() },
  ] },
  { type: 'popover', label: 'Column', icon: 'i-tabler:layout-columns', list: [
    { label: 'Add Column Before', icon: 'i-tabler:column-insert-left', action: () => editor?.chain().focus().addColumnBefore().run() },
    { label: 'Add Column After', icon: 'i-tabler:column-insert-right', action: () => editor?.chain().focus().addColumnAfter().run() },
    { label: 'Remove Column', icon: 'i-tabler:column-remove', action: () => editor?.chain().focus().deleteColumn().run() },
  ] },
  { type: 'button', label: 'Merge Cells', icon: 'i-ant-design:merge-cells-outlined', action: () => editor?.chain().focus().mergeCells().run() },
  { type: 'button', label: 'Split Cell', icon: 'i-ant-design:split-cells-outlined', action: () => editor?.chain().focus().splitCell().run() },
  {
    type: 'colorpicker',
    label: 'Cell Background',
    icon: 'i-material-symbols:format-color-fill-rounded',
    attribute: 'backgroundColor',
    buttonStyle: () => ({
      color: cellBackgroundColor.value,
    }),
    action: (newBackgroundColor: string) => editor?.chain().focus().setCellAttribute('style', `background-color: ${newBackgroundColor}`).run(),
  },
  { type: 'button', label: 'Remove Table', icon: 'i-mdi:trash-can-outline', action: () => editor?.chain().focus().deleteTable().run() },
]
// #endregion bubble menu
</script>

<template>
  <Dropdown placement="bottom-start">
    <button class="btn btn-text btn-icon">
      <Icon class="text-xl" name="i-lucide:table" />
      <Tooltip
        position="bottom"
        :distance="8"
        class="tooltip-dark"
      >
        Insert Table
      </Tooltip>
    </button>
    <template #popover="{ toggleShow }">
      <div class="border border-abd rounded-md bg-white p-4 text-center">
        <p>{{ selectedArea.row }} x {{ selectedArea.col }}</p>
        <div
          v-for="row in maxRows"
          :key="row"
          class="mt-2 flex flex-col items-center gap-1"
        >
          <div class="flex gap-1">
            <div
              v-for="col in maxCols"
              :key="`${row}-${col}`"
              class="size-4 flex-shrink-0 border border-abd rounded"
              :class="[selectedArea.row >= row && selectedArea.col >= col && 'border-primary bg-blue-200']"
              @mouseenter="selectedArea = { row, col }"
              @click="insertTable();toggleShow(false)"
            />
          </div>
        </div>
      </div>
    </template>
  </Dropdown>
  <!-- bubble menu -->
  <BubbleMenu
    v-if="editor"
    :editor
    :should-show="({ editor }) => editor.isActive('table')"
    :options="{ placement: 'bottom' }"
    plugin-key="tableBubbleMenu"
  >
    <div class="bubble-menu">
      <template
        v-for="item in bubbleMenuItems"
        :key="item.label"
      >
        <button
          v-if="item.type === 'button'"
          class="btn btn-text btn-icon"
          @click="item.action"
        >
          <Icon class="text-20" :name="item.icon" />
          <Tooltip
            position="bottom"
            :distance="8"
            class="tooltip-dark"
          >
            {{ item.label }}
          </Tooltip>
        </button>
        <Dropdown
          v-if="item.type === 'popover'"
          placement="bottom-start"
        >
          <button class="btn btn-text btn-icon">
            <Icon class="text-xl" :name="item.icon" />
            <Icon class="translate-x-.5" name="mdi:chevron-down" />
            <Tooltip
              position="bottom"
              :distance="8"
              class="tooltip-dark"
            >
              {{ item.label }}
            </Tooltip>
          </button>
          <template #popover="{ toggleShow }">
            <Listbox
              :options="item.list"
              class="w-full md:min-w-20 md:w-fit"
              list-style="max-height:250px"
            >
              <template #option="{ option }">
                <div
                  class="w-full flex items-center gap-1"
                  @click="toggleShow(false); option.action()"
                >
                  <Icon
                    v-if="option.icon"
                    class="text-xl"
                    :name="option.icon"
                  />
                  {{ option.label }}
                </div>
              </template>
            </Listbox>
          </template>
        </Dropdown>
        <!-- color picker -->
        <Dropdown
          v-if="item.type === 'colorpicker'"
          placement="bottom-start"
          class="flex items-center"
        >
          <button
            class="btn btn-text btn-icon"
            :style="item.buttonStyle?.()"
          >
            <Icon class="text-xl" :name="item.icon" />
            <Icon class="translate-x-.5" name="mdi:chevron-down" />
            <Tooltip
              position="bottom"
              :distance="8"
              class="tooltip-dark"
            >
              {{ item.label }}
            </Tooltip>
          </button>
          <template #popover="{ toggleShow }">
            <ColorPallette
              :model-value="cellBackgroundColor"
              :should-allow-short-hex-code="true"
              @update:model-value="toggleShow(false);item.action?.($event as string);"
              @close="toggleShow(false)"
            />
          </template>
        </Dropdown>
      </template>
    </div>
  </BubbleMenu>
</template>
