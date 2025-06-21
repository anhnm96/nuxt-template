<script setup lang="ts">
import type { ToolbarItems } from '~/types/tiptap'
import Image from '@tiptap/extension-image'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import TextAlign from '@tiptap/extension-text-align'
import { BackgroundColor, Color, FontFamily, FontSize, TextStyle } from '@tiptap/extension-text-style'
import Typography from '@tiptap/extension-typography'
import { CharacterCount, Placeholder } from '@tiptap/extensions'
import StarterKit from '@tiptap/starter-kit'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import { Listbox } from 'primevue'
import ImageResize from 'tiptap-extension-resize-image'
import CustomBulletList from '~/tiptap-extensions/BulletList'
import CustomOrderedList from '~/tiptap-extensions/OrderedList'
import Dropdown from '../Dropdown.vue'
import Tooltip from '../Tooltip.vue'

const props = withDefaults(defineProps<{
  modelValue?: string
  heightMin?: number
  heightMax?: number
  imageDefaultWidth?: number
  charCounterMax?: number
  placeholderText?: string
}>(), {
  modelValue: '',
  heightMin: 152,
  heightMax: 320,
  charCounterMax: 500,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const { t } = useI18n()

const editor = useEditor({
  content: props.modelValue,
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getHTML())
  },
  editorProps: {
    attributes: {
      class: 'outline-none p-4 overflow-y-auto',
      style: `min-height: ${props.heightMin}px; max-height: ${props.heightMax}px;`,
    },
  },
  extensions: [
    StarterKit.configure({
      link: { protocols: ['https'], openOnClick: false },
    }),
    Subscript,
    Superscript,
    CharacterCount.configure({ limit: props.charCounterMax }),
    Placeholder.configure({
      placeholder: props.placeholderText || t('placeholder.max_length_count', { length: props.charCounterMax }),
    }),
    TextStyle,
    FontFamily,
    FontSize,
    Color,
    BackgroundColor,
    Typography,
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
    CustomBulletList,
    CustomOrderedList,
    Image,
    ImageResize,
    Table.configure({ resizable: true }),
    TableHeader,
    TableRow,
    TableCell.extend({
      addAttributes() {
        return {
          ...this.parent?.(),
          style: '',
        }
      },
    }),
  ],
})

const { isFullViewMode, toggleFullViewMode } = useFullViewMode()
const fontFamilies = [
  { label: 'Arial', value: 'Arial', style: { fontFamily: 'Arial' } },
  { label: 'Georgia', value: 'Georgia', style: { fontFamily: 'Georgia' } },
  { label: 'Impact', value: 'Impact', style: { fontFamily: 'Impact' } },
  { label: 'Tahoma', value: 'Tahoma', style: { fontFamily: 'Tahoma' } },
  { label: 'Times New Roman', value: 'Times New Roman', style: { fontFamily: 'Times New Roman' } },
  { label: 'Verdana', value: 'Verdana', style: { fontFamily: 'Verdana' } },
]

const toolbarItems: ToolbarItems = [
  {
    type: 'button',
    label: 'Fullscreen',
    icon: computed(() => isFullViewMode.value ? 'i-icon-park-outline:off-screen-one' : 'i-icon-park-outline:full-screen-one'),
    isActive: isFullViewMode,
    action: toggleFullViewMode,
  },
  {
    type: 'button',
    label: 'Bold',
    icon: 'i-fluent:text-bold-16-filled',
    isActive: computed(() => editor.value?.isActive('bold')),
    action: () => editor.value?.chain().focus().toggleBold().run(),
  },
  {
    type: 'button',
    label: 'Italic',
    icon: 'i-fluent:text-italic-16-filled',
    isActive: computed(() => editor.value?.isActive('italic')),
    action: () => editor.value?.chain().focus().toggleItalic().run(),
  },
  {
    type: 'button',
    label: 'Underline',
    icon: 'i-fluent:text-underline-16-filled',
    isActive: computed(() => editor.value?.isActive('underline')),
    action: () => editor.value?.chain().focus().toggleUnderline().run(),
  },
  {
    type: 'button',
    label: 'Strikethrough',
    icon: 'i-fluent:text-strikethrough-16-filled',
    isActive: computed(() => editor.value?.isActive('strike')),
    action: () => editor.value?.chain().focus().toggleStrike().run(),
  },
  {
    type: 'button',
    label: 'Subscript',
    icon: 'i-fluent:text-subscript-16-filled',
    isActive: computed(() => editor.value?.isActive('subscript')),
    action: () => editor.value?.chain().focus().toggleSubscript().run(),
  },
  {
    type: 'button',
    label: 'Superscript',
    icon: 'i-fluent:text-superscript-16-filled',
    isActive: computed(() => editor.value?.isActive('superscript')),
    action: () => editor.value?.chain().focus().toggleSuperscript().run(),
  },
  { type: 'separator' },
  {
    type: 'popover',
    label: 'Font Family',
    icon: 'i-mingcute:font-line',
    list: fontFamilies,
    value: computed(() => editor.value?.getAttributes('textStyle').fontFamily),
    action: (newFont: string) => editor.value?.chain().focus().setFontFamily(newFont).run(),
  },
  {
    type: 'popover',
    label: 'Font Size',
    icon: 'i-fluent:text-font-size-16-filled',
    list: ['8', '9', '10', '11', '12', '14', '16', '18', '20', '24', '28', '32', '36', '48', '60', '72', '96'].map(size => ({
      label: size,
      value: size,
    })),
    value: computed(() => editor.value?.getAttributes('textStyle').fontSize?.slice(0, -2) || '11'),
    action: (newSize: number) => editor.value?.chain().focus().setFontSize(`${newSize}px`).run(),
  },
  {
    type: 'colorpicker',
    label: 'Text Color',
    icon: 'i-material-symbols:format-color-text-rounded',
    attribute: 'color',
    buttonStyle: () => ({
      color: editor.value?.getAttributes('textStyle').color,
    }),
    action: (newColor: string) => editor.value?.chain().focus().setColor(newColor).run(),
  },
  {
    type: 'colorpicker',
    label: 'Background Color',
    icon: 'i-material-symbols:format-color-fill-rounded',
    attribute: 'backgroundColor',
    buttonStyle: () => ({
      color: editor.value?.getAttributes('textStyle').backgroundColor,
    }),
    action: (newBackgroundColor: string) => editor.value?.chain().focus().setBackgroundColor(newBackgroundColor).run(),
  },
  { type: 'separator' },
  { type: 'link' },
  {
    type: 'popover',
    label: 'Align',
    icon: 'i-lucide:align-left',
    list: [
      { label: 'Left', value: 'left', icon: 'i-lucide:align-left' },
      { label: 'Center', value: 'center', icon: 'i-lucide:align-center' },
      { label: 'Right', value: 'right', icon: 'i-lucide:align-right' },
      { label: 'Justify', value: 'justify', icon: 'i-lucide:align-justify' },
    ],
    value: computed(() => editor.value?.getAttributes(editor.value?.state.selection.$anchor.node().type.name).textAlign),
    action: (value: string) => {
      editor.value?.chain().focus().setTextAlign(value).run()
    },
  },
  {
    type: 'popover',
    label: 'Ordered List',
    icon: 'i-lucide:list-ordered',
    list: [
      { label: 'None', value: 'list-none' },
      { label: 'Decimal 1. __', value: 'list-decimal' },
      { label: 'Lower Alpha a. __', value: 'list-lower-alpha' },
      { label: 'Lower Greek α. __', value: 'list-lower-greek' },
      { label: 'Lower Roman ⅰ. __', value: 'list-lower-roman' },
      { label: 'Upper Alpha A. __', value: 'list-upper-alpha' },
      { label: 'Upper Roman Ⅰ. __', value: 'list-upper-roman' },
    ],
    buttonClass: () => ({
      '!text-primary': editor.value?.isActive('customOrderedList'),
    }),
    value: computed(() => editor.value?.getAttributes('customOrderedList').class),
    action: (value: string) => {
      editor.value?.chain().focus().toggleOrderedClass(value).run()
    },
  },
  {
    type: 'popover',
    label: 'Unordered List',
    icon: 'i-lucide:list',
    buttonClass: () => ({
      '!text-primary': editor.value?.isActive('customBulletList'),
    }),
    list: [
      { label: 'None', value: 'list-none' },
      { label: 'Disc ●', value: 'list-disc' },
      { label: 'Circle ○', value: 'list-circle' },
      { label: 'Square ■', value: 'list-square' },
    ],
    value: computed(() => editor.value?.getAttributes('customBulletList').class),
    action: (value: string) => {
      editor.value?.chain().focus().toggleBulletClass(value).run()
    },
  },
  { type: 'separator' },
  { type: 'image' },
  { type: 'table' },
]
</script>

<template>
  <div class="fr-container overflow-x rounded-md" :class="[isFullViewMode && 'tiptap-fullscreen']">
    <div class="flex flex-wrap items-center gap-1 px-1 py-1.5">
      <template
        v-for="(toolbar, index) in toolbarItems"
        :key="index"
      >
        <!-- separator -->
        <div v-if="toolbar.type === 'separator'" class="h-full w-px bg-abd">
          &nbsp;
        </div>
        <!-- button -->
        <button
          v-if="toolbar.type === 'button'"
          class="btn btn-text btn-icon"
          :class="{ '!text-primary': toolbar.isActive?.value }"
          @click="toolbar.action?.()"
        >
          <Icon class="text-xl" :name="unref(toolbar.icon)" />
          <Tooltip position="bottom" :distance="8" class="tooltip-dark">
            {{ toolbar.label }}
          </Tooltip>
        </button>
        <!-- popover -->
        <Dropdown
          v-if="toolbar.type === 'popover'"
          placement="bottom-start"
          theme="no-arrow"
        >
          <button
            class="btn btn-text btn-icon"
            :class="toolbar.buttonClass?.()"
          >
            <Icon class="text-xl" :name="unref(toolbar.icon)" />
            <Icon class="translate-x-.5" name="mdi:chevron-down" />
            <Tooltip
              position="bottom"
              :distance="8"
              class="tooltip-dark"
            >
              {{ toolbar.label }}
            </Tooltip>
          </button>
          <template #popover="{ toggleShow }">
            <Listbox
              :options="toolbar.list"
              option-value="value"
              class="w-full md:min-w-20 md:w-fit"
              list-style="max-height:250px"
              :model-value="toolbar.value?.value"
            >
              <template #option="{ option }">
                <div
                  class="w-full flex items-center gap-1"
                  :style="option.style"
                  @click="toggleShow(); toolbar.action?.(option.value)"
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
          v-if="toolbar.type === 'colorpicker'"
          placement="bottom-start"
          theme="no-arrow"
        >
          <button
            class="btn btn-text btn-icon"
            :style="toolbar.buttonStyle?.()"
          >
            <Icon class="text-xl" :name="unref(toolbar.icon)" />
            <Icon class="translate-x-.5" name="mdi:chevron-down" />
            <Tooltip
              position="bottom"
              :distance="8"
              class="tooltip-dark"
            >
              {{ toolbar.label }}
            </Tooltip>
          </button>
          <template #popover="{ toggleShow }">
            <ColorPallette
              :model-value="editor?.getAttributes('textStyle')[toolbar.attribute!]"
              :should-allow-short-hex-code="true"
              @update:model-value="toggleShow();toolbar.action?.($event as string);"
              @close="toggleShow(false)"
            />
          </template>
        </Dropdown>
        <!-- insert link -->
        <InsertLinkToolbar
          v-if="toolbar.type === 'link'"
          :editor
        />
        <!-- insert image -->
        <InsertImageToolbar
          v-if="toolbar.type === 'image'"
          :editor
          :image-default-width
        />
        <!-- insert table -->
        <InsertTableToolbar v-if="toolbar.type === 'table'" :editor />
      </template>
    </div>
    <EditorContent
      class="border-y border-abd"
      :editor
      :class="[isFullViewMode && 'h-full']"
    />
    <div class="px-4 py-2 text-end">
      {{ editor?.storage.characterCount.characters() }} / {{ charCounterMax }}
    </div>
  </div>
</template>
