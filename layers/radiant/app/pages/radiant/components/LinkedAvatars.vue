<script setup lang="ts">
import { motion } from 'motion-v'
import customer from '~/assets/linked-avatars/customer.jpg'
import manager from '~/assets/linked-avatars/manager.jpg'

const transition = {
  duration: 0.75,
  repeat: Infinity,
  repeatDelay: 1.25,
}
</script>

<template>
  <div aria-hidden="true" class="isolate mx-auto grid h-full grid-cols-1">
    <!-- rings -->
    <svg
      viewBox="0 0 500 500" fill="none" class="
        col-start-1 row-start-1 size-full
        mask-[linear-gradient(to_bottom,black_90%,transparent),radial-gradient(circle,rgba(0,0,0,1)_0%,rgba(0,0,0,0)_100%)] mask-intersect
      "
    >
      <motion.circle
        v-for="n in 42" :key="n" :variants="{
          idle: {
            scale: 1,
            strokeOpacity: 0.15,
          },
          active: {
            scale: [1, 1.08, 1],
            strokeOpacity: [0.15, 0.3, 0.15],
            transition: { ...transition, delay: n * 0.05 },
          },
        }" cx="250" cy="250" :r="n * 14 + 4" class="stroke-white"
      />
    </svg>
    <!-- photos -->
    <div class="z-10 col-start-1 row-start-1">
      <div class="mx-auto flex size-full max-w-md items-center justify-around">
        <img
          alt="" :src="customer"
          class="size-20 rounded-full bg-white/15 ring-4 ring-white/10"
        >
        <img
          alt="" :src="manager"
          class="size-20 rounded-full bg-white/15 ring-4 ring-white/10"
        >
      </div>
    </div>
    <!-- checkmark -->
    <div class="z-10 col-start-1 row-start-1 flex items-center justify-center">
      <motion.div
        :variants="{
          idle: { scale: 1 },
          active: {
            scale: [1, 1.15, 1],
            transition: { ...transition, duration: 0.75 },
          },
        }"
        class="flex size-6 items-center justify-center rounded-full bg-linear-to-t from-green-500 to-green-300 shadow-sm"
      >
        <Icon class="size-4 text-white" name="ph:check-bold" />
      </motion.div>
    </div>
  </div>
</template>
