<script lang="ts" setup>
import { injectCarouselContext } from './context'

const { addItem, removeItem } = injectCarouselContext()
const el = ref<HTMLElement>()

onMounted(() => addItem(el.value!))
onBeforeUnmount(() => removeItem(el.value!))
</script>

<template>
  <div ref="el" class="carousel-item">
    <slot />
  </div>
</template>

<style scoped>
.carousel-item {
  scroll-snap-align: start;
  flex-shrink: 0;
}
</style>
