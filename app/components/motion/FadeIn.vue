<script setup lang="ts">
import { injectMotion } from 'motion-v'

const shouldReduceMotion = useReducedMotion()
let isInStaggerGroup = false
try {
  const parent = injectMotion()
  isInStaggerGroup = !!parent?.options.transition?.staggerChildren
} catch {}

const normalFadeInProps = {
  initial: 'hidden',
  whileInView: 'visible',
  inViewOptions: { once: true, margin: '0px 0px -200px' },
} as any
</script>

<template>
  <Motion
    :variants="{
      hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 24 },
      visible: { opacity: 1, y: 0 },
    }"
    :transition="{
      duration: 0.5,
    }"
    v-bind="isInStaggerGroup ? {} : normalFadeInProps"
  >
    <slot />
  </Motion>
</template>
