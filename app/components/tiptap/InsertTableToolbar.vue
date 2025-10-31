<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import type { ToolbarItems } from '~/types/tiptap'
import { BubbleMenu } from '@tiptap/vue-3/menus'
import Listbox from 'primevue/listbox'
import Dropdown from '~/components/Dropdown.vue'

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

function updateCellStyle(key: string, value: string) {
  const style = editor?.getAttributes('tableCell').style || ''

  const styleObj = parseStyle(style)

  styleObj[key] = value

  const styleString = Object.entries(styleObj)
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ')

  editor?.chain().focus().setCellAttribute('style', styleString).run()
}

const bubbleMenuItems: ToolbarItems = [
  { type: 'button', label: 'Toggle Header Row', action: () => editor?.chain().focus().toggleHeaderRow().run(), icon: 'i-tabler:table-row' },
  { type: 'button', label: 'Toggle Column Row', action: () => editor?.chain().focus().toggleHeaderColumn().run(), icon: 'i-tabler:table-column' },
  { type: 'popover', label: 'Row', icon: 'i-tabler:layout-rows', list: [
    { label: 'Add Row Above', action: () => editor?.chain().focus().addRowBefore().run(), icon: 'i-tabler:row-insert-top' },
    { label: 'Add Row Below', action: () => editor?.chain().focus().addRowAfter().run(), icon: 'i-tabler:row-insert-bottom' },
    { label: 'Remove Row', action: () => editor?.chain().focus().deleteRow().run(), icon: 'i-tabler:row-remove' },
  ] },
  { type: 'popover', label: 'Column', icon: 'i-tabler:layout-columns', list: [
    { label: 'Add Column Before', action: () => editor?.chain().focus().addColumnBefore().run(), icon: 'i-tabler:column-insert-left' },
    { label: 'Add Column After', action: () => editor?.chain().focus().addColumnAfter().run(), icon: 'i-tabler:column-insert-right' },
    { label: 'Remove Column', action: () => editor?.chain().focus().deleteColumn().run(), icon: 'i-tabler:column-remove' },
  ] },
  { type: 'popover', label: 'Vertical Align', icon: 'i-material-symbols:vertical-align-center-rounded', list: [
    { label: 'Top', action: () => updateCellStyle('vertical-align', 'top'), icon: 'i-material-symbols:vertical-align-top-rounded' },
    { label: 'Middle', action: () => updateCellStyle('vertical-align', 'middle'), icon: 'i-material-symbols:vertical-align-center-rounded' },
    { label: 'Bottom', action: () => updateCellStyle('vertical-align', 'bottom'), icon: 'i-material-symbols:vertical-align-bottom-rounded' },
  ] },
  { type: 'button', label: 'Merge Cells', action: () => editor?.chain().focus().mergeCells().run(), icon: 'i-ant-design:merge-cells-outlined' },
  { type: 'button', label: 'Split Cell', action: () => editor?.chain().focus().splitCell().run(), icon: 'i-ant-design:split-cells-outlined' },
  {
    type: 'colorpicker',
    label: 'Cell Background',
    action: (newBackgroundColor: string) => updateCellStyle('background-color', newBackgroundColor),
    icon: 'i-material-symbols:format-color-fill-rounded',
    attribute: 'backgroundColor',
    buttonStyle: () => ({
      color: cellBackgroundColor.value,
    }),
  },
  { type: 'button', label: 'Remove Table', action: () => editor?.chain().focus().deleteTable().run(), icon: 'i-mdi:trash-can-outline' },
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
      <div class="rounded-md border border-elevated p-4 text-center">
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
              class="size-4 shrink-0 rounded border border-elevated"
              :class="[selectedArea.row >= row && selectedArea.col >= col && 'border-primary bg-primary-200 dark:bg-primary-800']"
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
    :should-show="({ editor }) => editor.isEditable && !editor.isActive('link') && !editor.isActive('image') && editor.isActive('table')"
    :options="{ placement: 'bottom' }"
    plugin-key="tableBubbleMenu"
  >
    <div class="bubble-menu grid grid-cols-5 place-items-center">
      <template
        v-for="item in bubbleMenuItems"
        :key="item.label"
      >
        <button
          v-if="item.type === 'button'"
          class="btn btn-text btn-icon"
          @click="item.action"
        >
          <Icon class="text-xl" :name="item.icon" />
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
            <Icon class="translate-x-1" name="mdi:chevron-down" />
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
              class="w-full md:w-fit md:min-w-20"
              list-style="max-height:250px"
            >
              <template #option="{ option }">
                <div
                  class="flex w-full items-center gap-1"
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
            <Icon class="translate-x-1" name="mdi:chevron-down" />
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
