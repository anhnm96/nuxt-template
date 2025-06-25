<script setup lang="ts">
import type { NodeViewProps } from '@tiptap/vue-3'
import type { CSSProperties } from 'vue'
import { NodeViewWrapper } from '@tiptap/vue-3'

const props = defineProps<NodeViewProps>()

const MIN_WIDTH = 60
const BORDER_COLOR = '#0096fd'
const containerRef = useTemplateRef('containerRef')
const imgRef = useTemplateRef('imgRef')
const editing = ref(false)
const resizingStyle = ref<Pick<CSSProperties, 'width'> | undefined>()

function handleMouseDown(event: MouseEvent) {
  if (!imgRef.value) return

  event.preventDefault()
  const direction = (event.currentTarget as HTMLElement)?.dataset.direction || '--'
  const initialXPosition = event.clientX
  const currentWidth = imgRef.value.width
  let newWidth = currentWidth
  const transform = direction[1] === 'w' ? -1 : 1

  const removeListeners = () => {
    window.removeEventListener('mousemove', mouseMoveHandler)
    window.removeEventListener('mouseup', removeListeners)
    props.updateAttributes({ width: newWidth })
    resizingStyle.value = undefined
  }

  function mouseMoveHandler(event: MouseEvent) {
    newWidth = Math.max(currentWidth + (transform * (event.clientX - initialXPosition)), MIN_WIDTH)
    resizingStyle.value = { width: `${newWidth}px` }

    // If mouse is up, remove event listeners
    if (!event.buttons) {
      removeListeners()
    }
  };

  window.addEventListener('mousemove', mouseMoveHandler)
  window.addEventListener('mouseup', removeListeners)
}

const [DefineDragCornerButton, DragCornerButton] = createReusableTemplate<{ direction: 'nw' | 'ne' | 'sw' | 'se' }>()

onMounted(() => {
  containerRef.value!.$el.style.textAlign = imgRef.value?.dataset.parentAlign || ''
})

function setAlignment(position: string) {
  containerRef.value!.$el.style.textAlign = position

  // need to preserve parent-align in img otherwise it will be lost when the img is rerendered
  // e.g: resize a table cell containing an image
  switch (position) {
    case 'left':
      props.updateAttributes({ 'data-parent-align': position, 'style': `${imgRef.value!.style.cssText} margin: 0 auto 0 0;` })
      break
    case 'center':
      props.updateAttributes({ 'data-parent-align': position, 'style': `${imgRef.value!.style.cssText} margin: 0 auto;` })
      break
    case 'right':
      props.updateAttributes({ 'data-parent-align': position, 'style': `${imgRef.value!.style.cssText} margin: 0 0 0 auto;` })
      break
  }
}
</script>

<template>
  <NodeViewWrapper
    ref="containerRef"
    v-click-outside="() => editing = false"
    draggable
    @click="editing = true"
    @blur="editing = false"
  >
    <div
      :style="{
        position: 'relative',
        display: 'inline-block',
        // Weird! Basically tiptap/prose wraps this in a span and the line height causes an annoying buffer.
        lineHeight: '0px',
      }"
    >
      <img
        v-bind="node.attrs"
        ref="imgRef"
        class="cursor-default"
        :style="resizingStyle"
      >
      <template v-if="editor.isEditable && editing">
        <!-- Don't use a simple border as it pushes other content around. -->
        <div
          v-for="(style, i) in [
            { left: 0, top: 0, height: '100%', width: '1px' },
            { right: 0, top: 0, height: '100%', width: '1px' },
            { top: 0, left: 0, width: '100%', height: '1px' },
            { bottom: 0, left: 0, width: '100%', height: '1px' },
          ]"
          :key="i"
          :style="{ position: 'absolute', backgroundColor: BORDER_COLOR, ...style }"
        />
        <DragCornerButton direction="nw" />
        <DragCornerButton direction="ne" />
        <DragCornerButton direction="sw" />
        <DragCornerButton direction="se" />
        <div class="absolute bottom-0 left-1/2 z-10 flex -translate-x-1/2 translate-y-1/1 bg-white shadow">
          <button
            class="btn btn-text btn-icon"
            @click="setAlignment('left')"
          >
            <Icon class="text-xl" name="lucide:align-left" />
          </button>
          <button
            class="btn btn-text btn-icon"
            icon="text-20 i-lucide:align-center"
            @click="setAlignment('center')"
          >
            <Icon class="text-xl" name="lucide:align-center" />
          </button>
          <button
            class="btn btn-text btn-icon"
            icon="text-20 i-lucide:align-right"
            @click="setAlignment('right')"
          >
            <Icon class="text-xl" name="lucide:align-right" />
          </button>
        </div>
      </template>
    </div>
    <DefineDragCornerButton v-slot="{ direction }">
      <div
        role="button"
        tabIndex="0"
        :data-direction="direction"
        :style="{
          position: 'absolute',
          height: '10px',
          width: '10px',
          backgroundColor: BORDER_COLOR,
          ...({ n: { top: 0 }, s: { bottom: 0 } }[direction[0] as 'n' | 's']),
          ...({ w: { left: 0 }, e: { right: 0 } }[direction[1] as 'w' | 'e']),
          cursor: `${direction}-resize`,
        }"
        @mousedown="handleMouseDown"
      />
    </DefineDragCornerButton>
  </NodeViewWrapper>
</template>
