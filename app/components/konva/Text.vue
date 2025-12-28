<script setup lang="ts">
import type { KonvaEventObject } from 'konva/lib/Node'
import type { Text, TextConfig } from 'konva/lib/shapes/Text'

const props = defineProps<{
  config: TextConfig
}>()

const emit = defineEmits<{
  saveHistory: []
  updateConfig: [payload: Partial<TextConfig>]
  dragEnd: [id: string]
  transformStart: []
  transformEnd: [id: string]
}>()

const editImageStore = useEditImageStore()
const { cursorStyle, isShapeDraggable, selectedIds, shapeRefs } = storeToRefs(editImageStore)

function handleDragEnd(e: KonvaEventObject<MouseEvent>) {
  emit('updateConfig', { x: e.target.x(), y: e.target.y() })
  emit('dragEnd', e.target.id())
}

const { transformerRef } = inject('editImageContext')! as any
const transformStartScale = ref({ x: 1, y: 1 })
function handleTextTransformStart(e: KonvaEventObject<Event>) {
  const node = e.target
  transformStartScale.value = {
    x: node.scaleX(),
    y: node.scaleY(),
  }
  emit('transformStart')
}

function handleTransform(e: KonvaEventObject<Event>) {
  const activeAnchor = transformerRef.value.getNode().getActiveAnchor()
  if (activeAnchor !== 'middle-left' && activeAnchor !== 'middle-right') return
  const node = e.target as Text
  const virtualWidth = node.width() * node.scaleX()
  const finalWidth = Math.max(
    node.fontSize(),
    virtualWidth / transformStartScale.value.x,
  )
  emit('updateConfig', {
    x: node.x(),
    y: node.y(),
    width: finalWidth,
  })
  node.setAttrs({
    width: finalWidth,
    scaleX: transformStartScale.value.x,
  })
}

function handleTransformEnd(e: KonvaEventObject<Event>) {
  const activeAnchor = transformerRef.value.getNode().getActiveAnchor()
  if (activeAnchor === 'middle-left' || activeAnchor === 'middle-right') return
  const node = e.target as Text
  const MIN_FONT_SIZE = 8
  const scaleX = node.scaleX()
  const fontSize = Math.max(
    MIN_FONT_SIZE,
    node.fontSize() * node.scaleX(),
  )
  node.scale({ x: 1, y: 1 })

  emit('updateConfig', {
    x: node.x(),
    y: node.y(),
    width: node.width() * scaleX,
    fontSize,
    rotation: node.rotation(),
  })
  emit('transformEnd', e.target.id())
}

const isEditing = ref(false)
function handleTextDblClick() {
  const textNode = shapeRefs.value.get(props.config.id!)!.getNode() as Text
  const stage = textNode.getStage()!
  const textPosition = textNode.absolutePosition()
  const stageBox = stage.container().getBoundingClientRect()

  const areaPosition = {
    x: stageBox.left + textPosition.x,
    y: stageBox.top + textPosition.y,
  }

  const textarea = document.createElement('textarea')
  document.body.appendChild(textarea)

  textarea.value = textNode.text()
  textarea.style.position = 'absolute'
  textarea.style.top = `${areaPosition.y}px`
  textarea.style.left = `${areaPosition.x}px`
  textarea.style.width = `${textNode.width() - textNode.padding() * 2}px`
  textarea.style.height = `${textNode.height() - textNode.padding() * 2 + 5}px`
  textarea.style.fontSize = `${textNode.fontSize()}px`
  textarea.style.border = 'none'
  textarea.style.padding = '0px'
  textarea.style.margin = '0px'
  textarea.style.overflow = 'hidden'
  textarea.style.background = 'none'
  textarea.style.outline = 'none'
  textarea.style.resize = 'none'
  textarea.style.lineHeight = String(textNode.lineHeight())
  textarea.style.fontFamily = textNode.fontFamily()
  textarea.style.transformOrigin = 'left top'
  textarea.style.textAlign = textNode.align()
  textarea.style.color = textNode.fill() as string

  const rotation = textNode.rotation()
  const scaleX = textNode.scaleX()
  const scaleY = textNode.scaleY()
  let transform = ''
  if (rotation) {
    transform += `rotateZ(${rotation}deg)`
  }
  if (scaleX !== 1 || scaleY !== 1) {
    transform += ` scale(${scaleX}, ${scaleY})`
  }

  textarea.style.transform = transform.trim()

  textarea.style.height = 'auto'
  textarea.style.height = `${textarea.scrollHeight + 3}px`

  isEditing.value = true
  textarea.focus()

  function removeTextarea() {
    textarea.parentNode!.removeChild(textarea)
    window.removeEventListener('click', handleOutsideClick)
    window.removeEventListener('touchstart', handleOutsideClick)
    isEditing.value = false
    selectedIds.value = [props.config.id!]
  }

  function setTextareaWidth(newWidth?: number) {
    if (!newWidth) {
      // @ts-expect-error type TextConfig
      newWidth = textNode.placeholder?.length * textNode.fontSize()
    }
    textarea.style.width = `${newWidth}px`
  }

  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      emit('updateConfig', { text: textarea.value })
      emit('saveHistory')
      removeTextarea()
    }
    if (e.key === 'Escape') {
      removeTextarea()
    }
  })

  textarea.addEventListener('keydown', () => {
    const scale = textNode.getAbsoluteScale().x
    setTextareaWidth(textNode.width() * scale)
    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight + textNode.fontSize()}px`
  })

  function handleOutsideClick(e: Event) {
    if (e.target !== textarea) {
      emit('updateConfig', { text: textarea.value })
      emit('saveHistory')
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
  selectedIds.value = [props.config.id!]
})
</script>

<template>
  <v-text
    :ref="(r: any) => shapeRefs.set(config.id!, r)"
    :config="{
      ...config,
      draggable: isShapeDraggable,
      visible: !isEditing,
    }"
    @mouseover="cursorStyle = 'pointer'"
    @mouseout="cursorStyle = 'default'"
    @dragend="handleDragEnd"
    @transformstart="handleTextTransformStart"
    @transform="handleTransform"
    @transformend="handleTransformEnd"
    @dblclick="handleTextDblClick"
    @dbltap="handleTextDblClick"
  />
</template>
