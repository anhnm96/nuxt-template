<script setup lang="ts">
import type { KonvaEventObject } from 'konva/lib/Node'
import type { Text, TextConfig } from 'konva/lib/shapes/Text'

const props = defineProps<{
  config: TextConfig
  stageHeight: number
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
  // Maximum height the textarea may grow before it would overflow the stage
  const maxHeight = props.stageHeight - textPosition.y
  // Base content width (without scrollbar). Stored so we can restore it when
  // the scrollbar disappears, and expand by the scrollbar width when it appears.
  const baseWidth = textNode.width() - textNode.padding() * 2

  const textarea = document.createElement('textarea')
  document.body.appendChild(textarea)

  // Set height + overflow, then compensate the width for any scrollbar that
  // appeared so the visible text area stays at its original baseWidth.
  const applyHeightWithScrollbarCompensation = (desiredHeight: number, scaledBase: number | null = null) => {
    const w = scaledBase ?? baseWidth
    const clamped = Math.min(desiredHeight, maxHeight)
    textarea.style.height = `${clamped}px`
    if (clamped >= maxHeight) {
      textarea.style.overflow = 'auto'
      // Measure how much the scrollbar consumed and add it back as outer width.
      const scrollbarWidth = textarea.offsetWidth - textarea.clientWidth
      textarea.style.width = `${w + scrollbarWidth}px`
    } else {
      textarea.style.overflow = 'hidden'
      textarea.style.width = `${w}px`
    }
  }

  textarea.value = textNode.text()
  textarea.style.position = 'absolute'
  textarea.style.top = `${areaPosition.y}px`
  textarea.style.left = `${areaPosition.x}px`
  textarea.style.width = `${baseWidth}px`
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
  textarea.style.maxHeight = `${maxHeight}px`

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
  applyHeightWithScrollbarCompensation(textarea.scrollHeight + 3)
  const initialHeight = Math.min(textarea.scrollHeight + 3, maxHeight)
  textarea.style.height = `${initialHeight}px`
  textarea.style.overflow = initialHeight >= maxHeight ? 'auto' : 'hidden'

  isEditing.value = true
  textarea.focus()

  function removeTextarea() {
    textarea.parentNode!.removeChild(textarea)
    window.removeEventListener('click', handleOutsideClick)
    window.removeEventListener('touchstart', handleOutsideClick)
    isEditing.value = false
    selectedIds.value = [props.config.id!]
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
    const scaledBase = textNode.width() * scale
    textarea.style.width = `${scaledBase}px`
    textarea.style.height = 'auto'
    applyHeightWithScrollbarCompensation(
      textarea.scrollHeight + textNode.fontSize(),
      scaledBase,
    )
    const desiredHeight = textarea.scrollHeight + textNode.fontSize()
    const clampedHeight = Math.min(desiredHeight, maxHeight)
    textarea.style.height = `${clampedHeight}px`
    textarea.style.overflow = clampedHeight >= maxHeight ? 'auto' : 'hidden'
  })

  function handleOutsideClick(e: Event) {
    if (e.target !== textarea) {
      if (!textarea.value) {
        emit('updateConfig', { text: textNode.text() })
      } else {
        emit('updateConfig', { text: textarea.value })
        emit('saveHistory')
      }
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
