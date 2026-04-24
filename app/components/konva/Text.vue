<script setup lang="ts">
import type { KonvaEventObject } from 'konva/lib/Node'
import type { Label } from 'konva/lib/shapes/Label'
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
  hideToolbarPosition: []
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
  // e.target is the Label (the transformed node). Track its starting scale
  // so onTransform can bake scale → width without runaway growth.
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
  const labelNode = e.target as unknown as Label // Label
  const innerText = labelNode.getText()
  // Scale lives on the Label (the node the transformer is attached to).
  // Bake it into the inner text's width so the font size is preserved
  // during a horizontal resize and the Tag auto-resizes to match.
  const virtualWidth = innerText.width() * labelNode.scaleX()
  const finalWidth = Math.max(
    innerText.fontSize(),
    virtualWidth / transformStartScale.value.x,
  )
  emit('updateConfig', {
    x: labelNode.x(),
    y: labelNode.y(),
    textConfig: {
      width: finalWidth,
    },
  })
  innerText.setAttrs({
    width: finalWidth,
  })
  labelNode.scale({
    x: transformStartScale.value.x,
    y: transformStartScale.value.y,
  })
}

function handleTransformEnd(e: KonvaEventObject<Event>) {
  const activeAnchor = transformerRef.value.getNode().getActiveAnchor()
  if (activeAnchor === 'middle-left' || activeAnchor === 'middle-right') return
  const labelNode = e.target as unknown as Label
  const innerText = labelNode.getText()
  const MIN_FONT_SIZE = 8
  const scaleX = labelNode.scaleX()
  const fontSize = Math.max(
    MIN_FONT_SIZE,
    innerText.fontSize() * scaleX,
  )
  const newWidth = innerText.width() * scaleX

  // Bake Label scale into inner text so the Tag auto-syncs, then
  // reset Label scale to 1 (rotation stays on the Label).
  innerText.setAttrs({ width: newWidth, fontSize })
  labelNode.scale({ x: 1, y: 1 })

  emit('updateConfig', {
    x: labelNode.x(),
    y: labelNode.y(),
    rotation: labelNode.rotation(),
    textConfig: {
      width: newWidth,
      fontSize,
    },
  })
  emit('transformEnd', e.target.id())
}

const isEditing = ref(false)
function handleTextDblClick() {
  emit('hideToolbarPosition')
  const textNode = shapeRefs.value.get(props.config.id!)!.getNode()
  // `textNode` is a Konva.Label (wraps Tag + inner Text).
  //   - Label holds the stage position / rotation / scale
  //   - inner Text holds all font / padding / text / width properties
  // Fall back gracefully if a plain Text node is ever passed.
  const innerText
    = typeof textNode.getText === 'function' ? textNode.getText() : textNode as Text
  const stage = textNode.getStage()!
  const textPosition = textNode.absolutePosition()
  const stageBox = stage.container().getBoundingClientRect()

  const areaPosition = {
    x: stageBox.left + textPosition.x,
    y: stageBox.top + textPosition.y,
  }
  // Maximum height the textarea may grow before it would overflow the stage
  const maxHeight = props.stageHeight - textPosition.y
  // Konva.Text.width() / height() are OUTER dimensions (padding included).
  // We render the textarea in border-box mode and apply CSS padding equal to
  // Konva's padding, so the inner content area matches Konva exactly and the
  // textarea top-left coincides with the Label origin (keeps rotation /
  // scale pivots consistent with Konva).
  const padding = innerText.padding()
  const outerWidth = innerText.width()

  const textarea = document.createElement('textarea')
  document.body.appendChild(textarea)

  // Set height + overflow, then compensate the width for any scrollbar that
  // appeared so the visible text area stays at its original outerWidth.
  const applyHeightWithScrollbarCompensation = (desiredHeight: number, scaledOuter: number | null = null) => {
    const w = scaledOuter ?? outerWidth
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

  textarea.value = innerText.text()
  textarea.style.position = 'absolute'
  textarea.style.top = `${areaPosition.y}px`
  textarea.style.left = `${areaPosition.x}px`
  textarea.style.boxSizing = 'border-box'
  textarea.style.width = `${outerWidth}px`
  textarea.style.height = `${innerText.height() + 5}px`
  textarea.style.fontSize = `${innerText.fontSize()}px`
  textarea.style.border = 'none'
  textarea.style.padding = `${padding}px`
  textarea.style.margin = '0px'
  textarea.style.overflow = 'hidden'
  textarea.style.background = 'none'
  textarea.style.resize = 'none'
  textarea.style.lineHeight = innerText.lineHeight()
  textarea.style.fontFamily = innerText.fontFamily()
  textarea.style.transformOrigin = 'left top'
  textarea.style.textAlign = innerText.align()
  textarea.style.color = innerText.fill()
  textarea.style.maxHeight = `${maxHeight}px`
  textarea.style.backgroundColor = textNode.getTag().fill()
  textarea.style.outline = `1px solid ${textNode.getTag().stroke()}`
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
  applyHeightWithScrollbarCompensation(textNode.getTag().height())
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
      emit('updateConfig', { textConfig: { text: textarea.value } })
      emit('saveHistory')
      removeTextarea()
    }
    if (e.key === 'Escape') {
      removeTextarea()
    }
  })

  textarea.addEventListener('input', () => {
    const scale = innerText.getAbsoluteScale().x
    const scaledOuter = innerText.width() * scale
    textarea.style.width = `${scaledOuter}px`
    textarea.style.height = 'auto'
    applyHeightWithScrollbarCompensation(
      textarea.scrollHeight + innerText.fontSize(),
      scaledOuter,
    )
  })

  function handleOutsideClick(e: Event) {
    if (e.target !== textarea) {
      if (!textarea.value) {
        emit('updateConfig', { textConfig: { text: innerText.text() } })
      } else {
        emit('updateConfig', { textConfig: { text: textarea.value } })
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
  <v-label
    :ref="(r: any) => shapeRefs.set(config.id!, r)"
    :config="{
      name: 'text',
      id: config.id,
      x: config.x,
      y: config.y,
      rotation: config.rotation,
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
  >
    <v-tag :config="config.tagConfig" />
    <v-text :id="config.id" name="text" :config="config.textConfig" />
  </v-label>
</template>
