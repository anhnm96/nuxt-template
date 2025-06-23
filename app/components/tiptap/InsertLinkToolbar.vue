<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import { BubbleMenu } from '@tiptap/vue-3/menus'
import { InputText } from 'primevue'
import Dropdown from '../Dropdown.vue'
import Tooltip from '../Tooltip.vue'

const { editor } = defineProps<{ editor?: Editor }>()

const id = useId()
const isEditing = ref(false)
const insertText = ref('')
const insertLink = ref('')
const openInNewTab = ref(false)

function handleInitLink() {
  const href = editor?.getAttributes('link').href

  // checkbox to open link in new tab
  openInNewTab.value = editor?.getAttributes('link').target === '_blank'

  // set the link input value
  insertLink.value = href || ''

  // set the text input value
  const selection = editor!.view.state.selection!

  const linkNode = editor!.state.doc.nodeAt(selection.from)

  if (href) {
    // updating existing link
    insertText.value = linkNode?.textContent || ''
    isEditing.value = true
  } else {
    // creating new link
    insertText.value = editor?.state.doc.textBetween(selection.from, selection.to) || ''
    isEditing.value = false
  }
}

function setLink() {
  if (!insertText.value) {
    return
  }

  if (insertLink.value === '') {
    editor?.chain().focus().extendMarkRange('link').unsetLink().run()

    return
  }

  // set link
  if (!insertLink.value.startsWith('http')) {
    insertLink.value = `https://${insertLink.value}`
  }

  editor?.chain().focus().extendMarkRange('link').setLink({ href: insertLink.value, target: openInNewTab.value ? '_blank' : null }).run()
  // set text
  const selection = editor!.view.state.selection!

  editor?.chain().focus().insertContentAt({ from: selection.from, to: selection.to }, insertText.value).run()
}

function openLink() {
  window.open(editor?.getAttributes('link').href, '_blank')
}

// #region bubble menu
const showInlineEditLink = ref(false)

function hideInlineEditLink() {
  showInlineEditLink.value = false
};

const { copy, copied } = useClipboard()
const bubbleMenuItems = [
  { label: computed(() => `Copy Link\n${editor?.getAttributes('link').href}`), action: () => copy(editor?.getAttributes('link').href), icon: computed(() => copied.value ? 'i-lucide:copy-check' : 'i-lucide:copy') },
  { label: computed(() => `Open Link\n${editor?.getAttributes('link').href}`), action: openLink, icon: 'i-lucide:external-link' },
  { label: 'Edit Link', action: () => {
    showInlineEditLink.value = true
    handleInitLink()
  }, icon: 'i-lucide:pencil' },
  { label: 'Unlink', action: () => editor?.chain().focus().unsetLink().run(), icon: 'i-mdi:link-variant-off' },
]
// #endregion bubble menu

const [DefineInsertLinkPopup, InsertLinkPopup] = createReusableTemplate()
</script>

<template>
  <Dropdown
    placement="bottom-start"
    theme="no-arrow"
  >
    <button
      class="btn btn-icon btn-text"
      @click="handleInitLink"
    >
      <Icon class="text-xl" name="i-mdi:link-variant" />
      <Tooltip
        position="bottom"
        :distance="8"
        class="tooltip-dark"
      >
        Insert Link
      </Tooltip>
    </button>
    <template #popover="{ toggleShow }">
      <!-- insert link popup -->
      <InsertLinkPopup :hide="() => toggleShow(false)" />
    </template>
  </Dropdown>
  <!-- bubble menu -->
  <BubbleMenu
    v-if="editor"
    :editor
    :should-show="({ editor }) => editor.isEditable && editor.isActive('link')"
    :options="{ placement: 'bottom' }"
    plugin-key="linkBubbleMenu"
  >
    <div v-if="!showInlineEditLink" class="bubble-menu">
      <button
        v-for="(item, index) in bubbleMenuItems"
        :key="index"
        class="btn btn-icon btn-text"
        @click="item.action"
      >
        <Icon class="text-xl" :name="toValue(item.icon)" />
        <Tooltip
          position="bottom"
          :distance="8"
          class="tooltip-dark"
        >
          {{ toValue(item.label) }}
        </Tooltip>
      </button>
    </div>
    <!-- insert link popup -->
    <InsertLinkPopup
      v-else
      v-click-outside="hideInlineEditLink"
      :hide="hideInlineEditLink"
      @keydown.esc="hideInlineEditLink"
    />
  </BubbleMenu>
  <!-- insert link popup -->
  <DefineInsertLinkPopup v-slot="{ hide }">
    <div class="flex flex-col gap-4 border border-abd rounded-10 bg-white p-4">
      <!-- url -->
      <div class="flex flex-col">
        <Label :for="`url__${id}`">
          URL
        </Label>
        <InputText
          :id="`url__${id}`"
          v-model="insertLink"
          v-focus
          autocomplete="off"
          @keydown.enter="hide(false); setLink()"
        />
      </div>
      <!-- text -->
      <div class="flex flex-col">
        <Label :for="`text__${id}`">
          Text
        </Label>
        <InputText
          :id="`text__${id}`"
          v-model="insertText"
          autocomplete="off"
          @keydown.enter="hide(false); setLink()"
        />
      </div>
      <div>
        <Checkbox
          v-model="openInNewTab"
          label="Open in new tab"
        />
      </div>
      <button
        class="btn btn-primary"
        @click="hide(false); setLink()"
      >
        {{ isEditing ? 'Update' : 'Insert' }}
      </button>
    </div>
  </DefineInsertLinkPopup>
</template>
