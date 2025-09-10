<script setup lang="ts">
import type { ImgHTMLAttributes } from 'vue'

const props = defineProps<{
  src?: string
  alt?: string
  text?: string
  icon?: string
  pt: {
    img: Omit<ImgHTMLAttributes, 'src' | 'alt'>
  }
}>()

const fallback = computed(() => props.text || (props.alt || '').split(' ').map(word => word.charAt(0)).join('').substring(0, 2))

// #region error handling
const error = ref(false)

watch(() => props.src, () => {
  if (error.value) {
    error.value = false
  }
})

function onError() {
  error.value = true
}
// #endregion error handling
</script>

<template>
  <span class="avatar">
    <img v-if="src && !error" v-bind="getPtValue(pt, 'img')" :src :alt class="rounded-[inherit] object-cover" @error="onError">
    <slot v-else>
      <Icon v-if="icon" :name="icon" />
      <span v-else class="truncate leading-none font-medium text-muted">{{ fallback || '&nbsp;' }}</span>
    </slot>
  </span>
</template>
