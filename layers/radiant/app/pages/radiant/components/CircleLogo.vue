<script setup lang="ts">
import { motion } from 'motion-v'

defineProps<{
  src: string
  left: number
  top: number
  hover: { x: number, y: number, rotate: number, delay: number }
}>()
</script>

<template>
  <motion.div
    class="absolute flex size-16 flex-center rounded-full bg-white shadow-sm ring-1 ring-black/5"
    :style="{ left: `${left}px`, top: `${top}px` }" :variants="{
      idle: { x: 0, y: 0, rotate: 0, rotateX: 0 },
      active: {
        x: [0, hover.x, 0],
        y: [0, hover.y, 0],
        rotate: [0, 5, 0],
        transition: {
          duration: 0.75,
          repeat: Infinity,
          repeatDelay: 1.25,
          ease: 'easeInOut',
          delay: hover.delay,
        },
      },
    }"
  >
    <Icon size="32px" :name="src" />
  </motion.div>
</template>
