<script setup lang="ts">
import { motion } from 'motion-v'
import CircleLogo from './CircleLogo.vue'
import Mark from './Mark.vue'

const [DefineCircle, Circle] = createReusableTemplate<{
  size: number
  delay: number
  opacity: string
}>()
</script>

<template>
  <DefineCircle v-slot="{ size, delay, opacity }">
    <motion.div
      :style="{ '--opacity': opacity }" :variants="{
        idle: { width: `${size}px`, height: `${size}px` },
        active: {
          width: [`${size}px`, `${size + 10}px`, `${size}px`],
          height: [`${size}px`, `${size + 10}px`, `${size}px`],
          transition: {
            duration: 0.75,
            repeat: Infinity,
            repeatDelay: 1.25,
            ease: 'easeInOut',
            delay,
          },
        },
      }" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full
        bg-[radial-gradient(circle,transparent_25%,color-mix(in_srgb,var(--color-blue-500)_var(--opacity),transparent)_100%)]
        ring-1 ring-blue-500/8 ring-inset"
    />
  </DefineCircle>
  <div aria-hidden="true" class="wrapper relative h-full overflow-hidden">
    <!-- circles -->
    <div class="absolute inset-0">
      <Circle :size="528" opacity="3%" :delay="0.45" />
      <Circle :size="400" opacity="5%" :delay="0.3" />
      <Circle :size="272" opacity="5%" :delay="0.15" />
      <Circle :size="144" opacity="10%" :delay="0" />
      <div class="absolute inset-0 bg-linear-to-t from-white to-35%" />
    </div>
    <div class="absolute left-1/2 h-full w-104 -translate-x-1/2">
      <!-- main logo -->
      <div
        class="absolute top-32 left-44 flex size-16 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5"
      >
        <Mark class="h-9 fill-black" />
      </div>
      <!-- logos -->
      <CircleLogo :left="360" :top="144" :hover="{ x: 6, y: 1, rotate: 5, delay: 0.38 }" src="prime:twitter" />
      <CircleLogo :left="285" :top="20" :hover="{ x: 4, y: -5, rotate: 6, delay: 0.3 }" src="logos:dribbble-icon" />
      <CircleLogo :left="255" :top="210" :hover="{ x: 3, y: 5, rotate: 7, delay: 0.2 }" src="logos:netlify-icon" />
      <CircleLogo :left="144" :top="40" :hover="{ x: -2, y: -5, rotate: -6, delay: 0.15 }" src="logos:discord-icon" />
      <CircleLogo
        :left="36" :top="56" :hover="{ x: -4, y: -5, rotate: -6, delay: 0.35 }" class="text-green-500"
        src="simple-icons:upwork"
      />
      <CircleLogo :left="96" :top="176" :hover="{ x: -3, y: 5, rotate: 3, delay: 0.15 }" src="logos:cloudinary-icon" />
    </div>
  </div>
</template>
