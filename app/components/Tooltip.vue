<script setup lang="ts">
type Position = 'top' | 'bottom' | 'left' | 'right'

const props = withDefaults(defineProps<{
  target?: string
  position?: Position
  delay?: number
  hideDelay?: number
  persistent?: boolean
  offset?: [number, number]
  maxHeight?: string
  maxWidth?: string
}>(), {
  delay: 0,
  hideDelay: 0,
  position: 'top',
  offset: () => [14, 14],
})

const innerRef = useTemplateRef('innerRef')
function updatePosition() {
  setPosition({
    targetEl: innerRef.value!,
    offset: props.offset,
    anchorEl: innerRef.value!.parentElement,
    anchorOrigin: { vertical: 'bottom', horizontal: 'middle' },
    selfOrigin: { vertical: 'center', horizontal: 'middle' },
    maxHeight: props.maxHeight,
    maxWidth: props.maxWidth,
  })
}

onMounted(() => {
  updatePosition()
})
</script>

<template>
  <div ref="innerRef" role="tooltip" class="tooltip">
    <slot />
  </div>
</template>

<style>
.tooltip {
  z-index: 9000;
  position: fixed !important;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 6px 10px;
  max-width: 95vw;
  max-height: 65vh;
  will-change: auto;
}
</style>
