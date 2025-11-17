<script setup lang="ts">
import type { KonvaEventObject } from 'konva/lib/Node'
import type { Text, TextConfig } from 'konva/lib/shapes/Text'

const props = defineProps<{
  tool: string | null
  text: TextConfig
  index: number
}>()

const emit = defineEmits<{
  dragStart: []
  updateToolbarPosition: []
}>()

const editImageStore = useEditImageStore()
const { setTextRef } = editImageStore
const { cursorStyle, texts, selectedIds } = storeToRefs(editImageStore)

function handleTransform() {
  const node = editImageStore.textRefs[props.index]!.getNode()
  texts.value[props.index]!.width = node.width() * node.scaleX()
  // texts.value[props.index]!.height = node.height() * node.scaleY()

  node.setAttrs({
    width: node.width() * node.scaleX(),
    // height: node.height() * node.scaleY(),
    scaleX: 1,
    // scaleY: 1,
  })
}

function handleTextTransformEnd(e: KonvaEventObject<Event>, index: number) {
  const node = e.target
  const scaleX = node.scaleX()
  const scaleY = node.scaleY()

  node.scaleX(1)
  node.scaleY(1)

  Object.assign(texts.value[index]!, {
    x: node.x(),
    y: node.y(),
    rotation: node.rotation(),
    // scaleX,
    // scaleY,
  })
}

function handleTextDragEnd(e: KonvaEventObject<MouseEvent>) {
  texts.value[props.index]!.x = e.target.x()
  texts.value[props.index]!.y = e.target.y()

  setTimeout(() => {
    emit('updateToolbarPosition')
  })
}

const isEditing = ref(false)
function handleTextDblClick() {
  const textNodeKonva = editImageStore.textRefs[props.index]!.getNode() as Text
  const stage = textNodeKonva.getStage()!
  const textPosition = textNodeKonva.absolutePosition()
  const stageBox = stage.container().getBoundingClientRect()

  const areaPosition = {
    x: stageBox.left + textPosition.x,
    y: stageBox.top + textPosition.y,
  }

  const textarea = document.createElement('textarea')
  document.body.appendChild(textarea)

  textarea.value = textNodeKonva.text()
  textarea.style.position = 'absolute'
  textarea.style.top = `${areaPosition.y}px`
  textarea.style.left = `${areaPosition.x}px`
  textarea.style.width = `${textNodeKonva.width() - textNodeKonva.padding() * 2}px`
  textarea.style.height = `${textNodeKonva.height() - textNodeKonva.padding() * 2 + 5}px`
  textarea.style.fontSize = `${textNodeKonva.fontSize()}px`
  textarea.style.border = 'none'
  textarea.style.padding = '0px'
  textarea.style.margin = '0px'
  textarea.style.overflow = 'hidden'
  textarea.style.background = 'none'
  textarea.style.outline = 'none'
  textarea.style.resize = 'none'
  textarea.style.lineHeight = String(textNodeKonva.lineHeight())
  textarea.style.fontFamily = textNodeKonva.fontFamily()
  textarea.style.transformOrigin = 'left top'
  textarea.style.textAlign = textNodeKonva.align()
  textarea.style.color = textNodeKonva.fill() as string

  const rotation = textNodeKonva.rotation()
  let transform = ''
  if (rotation) {
    transform += `rotateZ(${rotation}deg)`
  }
  textarea.style.transform = transform

  textarea.style.height = 'auto'
  textarea.style.height = `${textarea.scrollHeight + 3}px`

  isEditing.value = true
  textarea.focus()

  function removeTextarea() {
    textarea.parentNode!.removeChild(textarea)
    window.removeEventListener('click', handleOutsideClick)
    isEditing.value = false
  }

  function setTextareaWidth(newWidth?: number) {
    if (!newWidth) {
      // @ts-expect-error type TextConfig
      newWidth = textNodeKonva.placeholder?.length * textNodeKonva.fontSize()
    }
    textarea.style.width = `${newWidth}px`
  }

  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      texts.value[props.index]!.text = textarea.value
      removeTextarea()
    }
    if (e.key === 'Escape') {
      removeTextarea()
    }
  })

  textarea.addEventListener('keydown', () => {
    const scale = textNodeKonva.getAbsoluteScale().x
    setTextareaWidth(textNodeKonva.width() * scale)
    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight + textNodeKonva.fontSize()}px`
  })

  function handleOutsideClick(e: Event) {
    if (e.target !== textarea) {
      texts.value[props.index]!.text = textarea.value
      removeTextarea()
    }
  }
  setTimeout(() => {
    window.addEventListener('click', handleOutsideClick)
    window.addEventListener('touchstart', handleOutsideClick)
  })
}

onMounted(() => {
  // Auto-select the newly created text
  selectedIds.value = [props.text.id!]
})
</script>

<template>
  <v-text
    :ref="(r: any) => setTextRef(r, index)"
    :config="{
      ...text,
      draggable: tool === 'select',
      visible: !isEditing,
    }"
    @dragend="handleTextDragEnd"
    @mouseover="cursorStyle = 'pointer'"
    @mouseout="cursorStyle = 'default'"
    @transform="handleTransform"
    @dblclick="handleTextDblClick"
    @dbltap="handleTextDblClick"
  />
</template>
