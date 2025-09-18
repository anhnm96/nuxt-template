<script setup lang="ts">
import Block from './Block.vue'

const props = withDefaults(defineProps<{
  interactive?: boolean
  yOffset?: number
}>(), { yOffset: 0 })

const staticBlocks = [
  [1, 1],
  [2, 2],
  [4, 3],
  [6, 2],
  [7, 4],
  [5, 5],
]
const id = useId()
const currentBlock = ref<[x: number, y: number] | undefined>()
const hoveredBlocks = ref<
  Array<[x: number, y: number, key: number]>
>([])
const counter = ref(0)
const svg = useTemplateRef('svg')

if (props.interactive) {
  function onMouseMove(event: MouseEvent) {
    if (!svg.value) return

    const rect = svg.value.getBoundingClientRect()
    let x = event.clientX - rect.left
    let y = event.clientY - rect.top
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
      return
    }

    x = x - rect.width / 2 - 32
    y = y - props.yOffset
    x += Math.tan(32 / 160) * y
    x = Math.floor(x / 96)
    y = Math.floor(y / 160)

    if (currentBlock.value?.[0] === x && currentBlock.value?.[1] === y) {
      return
    }

    currentBlock.value = [x, y]

    const key = counter.value++
    const block = [x, y, key] as (typeof hoveredBlocks.value)[number]
    hoveredBlocks.value = [...hoveredBlocks.value, block].filter(
      block => !(block[0] === x && block[1] === y && block[2] !== key),
    )
  }

  onMounted(() => {
    window.addEventListener('mousemove', onMouseMove)
  })

  onUnmounted(() => {
    window.removeEventListener('mousemove', onMouseMove)
  })
}
</script>

<template>
  <svg ref="svg" aria-hidden="true">
    <rect width="100%" height="100%" :fill="`url(#${id})`" strokeWidth="0" />
    <svg x="50%" :y="yOffset" strokeWidth="0" class="overflow-visible">
      <Block v-for="block in staticBlocks" :key="`${block}`" :x="block[0]!" :y="block[1]!" />
      <Block
        v-for="block in hoveredBlocks"
        :key="block[2]"
        :x="block[0]"
        :y="block[1]"
        class="block"
        @animationend="() => {
          hoveredBlocks = hoveredBlocks.filter((b) => b[2] !== block[2])
        }"
      /></svg>
    <defs>
      <pattern
        :id
        width="96"
        height="480"
        x="50%"
        patternUnits="userSpaceOnUse"
        :patternTransform="`translate(0 ${yOffset})`"
        fill="none"
      >
        <path d="M128 0 98.572 147.138A16 16 0 0 1 82.883 160H13.117a16 16 0 0 0-15.69 12.862l-26.855 134.276A16 16 0 0 1-45.117 320H-116M64-160 34.572-12.862A16 16 0 0 1 18.883 0h-69.766a16 16 0 0 0-15.69 12.862l-26.855 134.276A16 16 0 0 1-109.117 160H-180M192 160l-29.428 147.138A15.999 15.999 0 0 1 146.883 320H77.117a16 16 0 0 0-15.69 12.862L34.573 467.138A16 16 0 0 1 18.883 480H-52M-136 480h58.883a16 16 0 0 0 15.69-12.862l26.855-134.276A16 16 0 0 1-18.883 320h69.766a16 16 0 0 0 15.69-12.862l26.855-134.276A16 16 0 0 1 109.117 160H192M-72 640h58.883a16 16 0 0 0 15.69-12.862l26.855-134.276A16 16 0 0 1 45.117 480h69.766a15.999 15.999 0 0 0 15.689-12.862l26.856-134.276A15.999 15.999 0 0 1 173.117 320H256M-200 320h58.883a15.999 15.999 0 0 0 15.689-12.862l26.856-134.276A16 16 0 0 1-82.883 160h69.766a16 16 0 0 0 15.69-12.862L29.427 12.862A16 16 0 0 1 45.117 0H128" />
      </pattern>
    </defs>
  </svg>
</template>

<style scoped>
.block {
  animation: hover-out 1s ease;
}

@keyframes hover-out {
  0% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}
</style>
